import fs from 'fs';
import path from 'path';
import { grokpiChatCompletion, grokpiImageGeneration, grokpiVideoGeneration, grokpiCheckVideoJob, resolveAndConvertReferences } from './grokpiClient.js';
import { AppError } from '../utils/safeError.js';
import { getRuntimePaths } from '../utils/runtimePaths.js';
import { buildScenePromptPackage } from './scenePromptPackageBuilder.js';
import { buildVideoPrompt } from './videoPromptBuilder.js';
import { validateVideoPrompt } from './videoPromptValidator.js';
import { buildProviderPayload } from './providerPayloadBuilder.js';
import { extractEmotionDirection } from './emotionExtractor.js';
import { buildAudioDirection } from './audioDirectionBuilder.js';
import { compressNarration } from './narrationCompressor.js';
import { validateAudioTiming } from './audioTimingValidator.js';
import { projectRepository } from './projectRepository.js';
import { settingsService } from './settingsService.js';

import { logToBackendFile, logToDesktopMainFile } from '../utils/logger.js';

function logStoryboardQueue({
  projectId,
  sceneId,
  queueMode,
  frameKey,
  status,
  attempt = 1,
  delaySec = 0,
  backoffSec = 0,
  providerStatus = 'N/A',
  providerImageUrlExists = false,
  persisted = false
}) {
  const cleanProjectId = projectId || 'unknown';
  const cleanSceneId = sceneId || 'unknown';
  const cleanQueueMode = queueMode || 'real';
  const cleanFrameKey = frameKey || 'unknown';
  const cleanStatus = status || 'waiting';
  const logStr = `[StoryboardQueue] projectId=${cleanProjectId} sceneId=${cleanSceneId} queueMode=${cleanQueueMode} frameKey=${cleanFrameKey} status=${cleanStatus} attempt=${attempt} delaySec=${delaySec} backoffSec=${backoffSec} providerStatus=${providerStatus} providerImageUrl=${providerImageUrlExists} persisted=${persisted}`;
  console.log(logStr);
  logToBackendFile(logStr);
}

// In-memory store for active rendering jobs and backend queue for storyboards
const activeJobs = new Map();
const sceneNarrations = new Map();
const sceneVideos = new Map();
let storyboardQueue = Promise.resolve();

// Helper to extract base64 from image generation responses
function extractBase64(response) {
  if (response && response.data && response.data[0]) {
    if (response.data[0].b64_json) return response.data[0].b64_json;
    if (response.data[0].url) return response.data[0].url;
  }
  const content = response?.choices?.[0]?.message?.content || '';
  const match = content.match(/data:image\/[a-zA-Z]+;base64,([a-zA-Z0-9+/=\r\n]+)/);
  if (match) {
    return match[1].replace(/[\r\n]/g, '');
  }
  return null;
}

// Helper to save base64 image data to local server uploads
function saveBase64Image(base64Str) {
  const filename = `sb-panel-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
  const uploadDir = getRuntimePaths().uploadsDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64Str, 'base64'));
  return filename;
}

// Helper to resolve dimensions based on aspect ratio
function getDimensionsForRatio(aspectRatio) {
  if (!aspectRatio) return { width: 1280, height: 720 };
  const lower = aspectRatio.toLowerCase();
  if (lower.includes('9:16') || lower === '9:16') return { width: 720, height: 1280 };
  if (lower.includes('1:1') || lower === '1:1') return { width: 1024, height: 1024 };
  if (lower.includes('21:9') || lower === '21:9') return { width: 1280, height: 548 };
  return { width: 1280, height: 720 }; // Default 16:9
}

function escapeNewlinesInJSON(jsonStr) {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escape) {
      result += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r')) {
      result += char === '\n' ? '\\n' : '\\r';
      continue;
    }
    result += char;
  }
  return result;
}

export const sceneService = {
  /**
   * Generates a 4-panel visual storyboard for a scene
   */
  generateStoryboard: async (sceneId, inputs, baseUrl) => {
    const params = typeof inputs === 'string' ? { narration: inputs } : inputs;
    const {
      projectId = 'project-unknown',
      aspectRatio = '16:9',
      orientation = 'landscape',
      resolutionPreset = '1920x1080',
      narration = '',
      visualStyle = 'Sinematik',
      durationSec = 10,
      mode = 'scratch'
    } = params;

    if (!narration) {
      throw new AppError('Narasi tidak boleh kosong untuk membuat storyboard.', 400);
    }

    if (mode === 'fallback_only') {
      const project = projectRepository.getProject(projectId);
      const scene = project.scenes.find(s => s.id === sceneId);
      if (!scene) throw new AppError('Adegan tidak ditemukan.', 404);
      
      const cleanAspectRatio = aspectRatio || '16:9';
      const dims = getDimensionsForRatio(cleanAspectRatio);
      
      // Update any non-REAL panels and hero frame to fallback status
      if (!scene.storyboardPanels || scene.storyboardPanels.length === 0) {
        // Generate blank/default panels first
        scene.storyboardPanels = [];
        const labels = ["Hook Visual", "Narasi Mulai", "Aksi / Dialog", "Detail Emosi", "Transisi"];
        const timings = ["0.0–2.0s", "2.0–5.5s", "5.5–7.0s", "7.0–8.8s", "8.8–10.0s"];
        const defaultShots = ["Wide shot", "Medium tracking shot", "Close-up / action shot", "Close-up", "Rear tracking shot"];
        const defaultTransitions = ["CUT", "CUT", "CUT", "MATCH CUT", "CUT TO NEXT SCENE"];
        for (let i = 0; i < 5; i++) {
          scene.storyboardPanels.push({
            id: `panel-${sceneId}-${i + 1}-${Date.now()}`,
            panelNumber: i + 1,
            order: i + 1,
            label: labels[i],
            timeCode: timings[i],
            timeRange: timings[i],
            shotType: defaultShots[i],
            shot: defaultShots[i],
            action: `Aksi untuk beat ${labels[i]}...`,
            dialogue: null,
            sfx: '—',
            transition: defaultTransitions[i],
            imagePrompt: `Cinematic visual for ${labels[i]}`
          });
        }
      }
      
      for (const panel of scene.storyboardPanels) {
        if (panel.generationMode !== 'real') {
          panel.imageUrl = `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&auto=format&fit=crop&q=60`;
          panel.isReal = false;
          panel.generationMode = 'fallback';
          panel.providerSource = 'fallback_placeholder';
          panel.action = panel.action.includes('Visual rendering fallback') ? panel.action : `${panel.action} (Visual rendering fallback)`;

          logStoryboardQueue({
            projectId,
            sceneId,
            queueMode: 'fallback',
            frameKey: `beat_${panel.panelNumber}`,
            status: 'fallback',
            attempt: 1,
            delaySec: 0,
            backoffSec: 0,
            providerStatus: 'fallback_assigned',
            providerImageUrlExists: true,
            persisted: true
          });
        }
      }
      
      if (!scene.heroFrame || scene.heroFrame.generationMode !== 'real') {
        const heroPanel = scene.storyboardPanels[2] || scene.storyboardPanels[0];
        scene.heroFrame = {
          imageUrl: heroPanel.imageUrl,
          description: `${heroPanel.action} (Visual rendering fallback)`,
          aspectRatio: cleanAspectRatio,
          orientation,
          width: dims.width,
          height: dims.height,
          isReal: false,
          generationMode: 'fallback',
          providerSource: 'fallback_placeholder'
        };

        logStoryboardQueue({
          projectId,
          sceneId,
          queueMode: 'fallback',
          frameKey: 'hero',
          status: 'fallback',
          attempt: 1,
          delaySec: 0,
          backoffSec: 0,
          providerStatus: 'fallback_assigned',
          providerImageUrlExists: true,
          persisted: true
        });
      }
      
      const realPanels = scene.storyboardPanels.filter(p => p.isReal === true).length;
      const fallbackPanels = scene.storyboardPanels.filter(p => !p.isReal).length;
      const total = scene.storyboardPanels.length;
      
      scene.storyboardStatus = realPanels === total && scene.heroFrame.isReal ? 'Siap dicek' : 'Siap (Partial Fallback)';
      const heroPanel = scene.storyboardPanels[2] || scene.storyboardPanels[0];
      scene.storyboardImageUrl = scene.heroFrame.imageUrl || heroPanel.imageUrl;
      scene.providerEvidence = { realPanels, fallbackPanels, totalPanels: total };
      scene.storyboardProgress = null;
      
      projectRepository.saveProjectSnapshot(projectId, project);
      
      return {
        status: 'completed',
        storyboardStatus: scene.storyboardStatus,
        aspectRatio: cleanAspectRatio,
        orientation,
        width: dims.width,
        height: dims.height,
        storyboardImageUrl: scene.storyboardImageUrl,
        providerEvidence: scene.providerEvidence,
        heroFrame: scene.heroFrame,
        panels: scene.storyboardPanels
      };
    }

    // Antrekan proses pembuatan storyboard secara serial di backend untuk mencegah Image rate limit exceeded
    return new Promise((resolve, reject) => {
      storyboardQueue = storyboardQueue.then(async () => {
        try {
          // Normalize aspect ratio
          let cleanAspectRatio = '16:9';
          if (aspectRatio.includes('9:16') || aspectRatio === '9:16') cleanAspectRatio = '9:16';
          else if (aspectRatio.includes('1:1') || aspectRatio === '1:1') cleanAspectRatio = '1:1';
          else if (aspectRatio.includes('21:9') || aspectRatio === '21:9') cleanAspectRatio = '21:9';

          const dims = getDimensionsForRatio(cleanAspectRatio);

          // Save narration in memory
          sceneNarrations.set(sceneId, narration);

          // 1. Load project and scene
          let project = projectRepository.getProject(projectId);
          let scene = project.scenes.find(s => s.id === sceneId);
          if (!scene) throw new AppError('Adegan tidak ditemukan.', 404);

          // 2. Set up panels list
          let normalizedPanels = [];
          const isScratch = mode === 'scratch' || !scene.storyboardPanels || scene.storyboardPanels.length === 0;

          if (isScratch) {
            logToBackendFile(`[Storyboard Queue] LLM generation for sceneId=${sceneId} narration="${narration.substring(0, 60)}..."`);
            
            const systemPrompt = `Anda adalah seorang sutradara dan desainer produksi film profesional. Pecah narasi adegan yang diberikan menjadi 5 panel visual (5 beat adegan) yang berurutan.
PENTING: Anda harus menerjemahkan aksi cerita ke dalam prompt gambar bahasa Inggris ("imagePrompt") yang murni menggambarkan dunia cerita (diegetic world). 

ATURAN MULTIMODAL PENGAMANAN VISUAL (UX LOCK):
1. DILARANG KERAS menyertakan kata-kata yang berkaitan dengan produksi film literal seperti: "clapperboard", "clapboard", "slate", "film slate", "director board", "director's slate", "storyboard frame", "drawing board", "production clap", "camera crew", "studio set", "behind the scenes", "shooting set", "production marker", "shooting board", "marker board", "text overlay", "ui frame", "meme", "poster look", "watermark", "clapboard in hand".
2. "imagePrompt" harus strictly berupa deskripsi pemandangan/karakter nyata di dalam dunia film tersebut.
3. Subjek Grounding: Setiap prompt harus menjelaskan subjek secara eksplisit: siapa tokohnya (misal: "Bandung Bondowoso", "Roro Jonggrang", "Rio", "Karsa"), apa aksi spesifiknya, di mana lokasi persisnya, suasana pencahayaan/waktu (misal: "night", "dark stormy rain"), dan objek utama yang dominan.
4. Gunakan gaya visual "${visualStyle || 'Sinematik'}".

Kembalikan respon strictly berupa valid JSON array berisi panel dengan format persis seperti ini:
[
  {
    "panelNumber": 1,
    "shotType": "Wide shot / Medium tracking shot / Close-up / etc.",
    "action": "Aksi visual di panel ini...",
    "dialogue": "Dialog jika ada (tulis '-' jika tidak ada)",
    "sfx": "Suara efek...",
    "transition": "CUT / MATCH CUT / dll.",
    "imagePrompt": "Prompt bahasa inggris yang sangat detail menggambarkan subjek, aksi, lokasi, lighting, gaya film, TANPA clapboard/slate (misal: A cinematic close up photo of Bandung Bondowoso focusing his magical glowing energy at night...)"
  }
]
Buat 5 panel yang mendramatisasi cerita. Jangan sertakan penjelasan apa pun di luar JSON array.`;

            const response = await grokpiChatCompletion([
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Narasi Adegan: ${narration}` }
            ], {
              model: 'grok-4.1-expert',
              temperature: 0.7
            });

            const content = response.choices?.[0]?.message?.content;
            if (!content) {
              throw new AppError('AI provider tidak mengembalikan detail storyboard.', 502);
            }

            let rawPanels;
            try {
              let cleanText = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              let lastIndex = cleanText.lastIndexOf('[');
              let arrayFound = false;

              while (lastIndex !== -1) {
                const candidate = cleanText.substring(lastIndex);
                const endIdx = candidate.lastIndexOf(']');
                if (endIdx !== -1) {
                  const jsonStr = escapeNewlinesInJSON(candidate.substring(0, endIdx + 1));
                  try {
                    const parsedVal = JSON.parse(jsonStr);
                    if (Array.isArray(parsedVal)) {
                      rawPanels = parsedVal;
                      arrayFound = true;
                      break;
                    }
                  } catch (e) {}
                }
                cleanText = cleanText.substring(0, lastIndex);
                lastIndex = cleanText.lastIndexOf('[');
              }

              if (!arrayFound) {
                throw new Error('No valid JSON array found');
              }
            } catch (err) {
              console.error('Failed to parse storyboard JSON:', content);
              throw new AppError('Gagal memproses detail storyboard dari AI.', 500);
            }

            if (!Array.isArray(rawPanels)) {
              rawPanels = [rawPanels];
            }

            const labels = ["Hook Visual", "Narasi Mulai", "Aksi / Dialog", "Detail Emosi", "Transisi"];
            const timings = ["0.0–2.0s", "2.0–5.5s", "5.5–7.0s", "7.0–8.8s", "8.8–10.0s"];
            const defaultShots = ["Wide shot", "Medium tracking shot", "Close-up / action shot", "Close-up", "Rear tracking shot"];
            const defaultTransitions = ["CUT", "CUT", "CUT", "MATCH CUT", "CUT TO NEXT SCENE"];

            for (let i = 0; i < 5; i++) {
              const rawPanel = rawPanels.find(p => (p.order === i + 1 || p.panelNumber === i + 1)) || rawPanels[i] || {};
              let cleanedDialogue = null;
              if (i === 2) {
                cleanedDialogue = rawPanel.dialogue && rawPanel.dialogue !== '-' ? rawPanel.dialogue : null;
              }

              normalizedPanels.push({
                id: `panel-${sceneId}-${i + 1}-${Date.now()}`,
                panelNumber: i + 1,
                order: i + 1,
                label: labels[i],
                timeCode: timings[i],
                timeRange: timings[i],
                shotType: rawPanel.shotType || defaultShots[i],
                shot: rawPanel.shotType || defaultShots[i],
                action: rawPanel.action || `Aksi untuk beat ${labels[i]}...`,
                dialogue: cleanedDialogue,
                sfx: rawPanel.sfx && rawPanel.sfx !== '-' ? rawPanel.sfx : '—',
                transition: rawPanel.transition || defaultTransitions[i],
                imagePrompt: rawPanel.imagePrompt || rawPanel.action || `Cinematic visual for ${labels[i]}`,
                imageUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&auto=format&fit=crop&q=60`,
                isReal: false,
                generationMode: 'waiting',
                providerSource: 'fallback_placeholder'
              });
            }

            scene.storyboardPanels = normalizedPanels;
            scene.heroFrame = {
              imageUrl: normalizedPanels[2].imageUrl,
              description: normalizedPanels[2].action,
              aspectRatio: cleanAspectRatio,
              orientation,
              width: dims.width,
              height: dims.height,
              isReal: false,
              generationMode: 'waiting',
              providerSource: 'fallback_placeholder'
            };
            scene.storyboardStatus = 'Sedang dibuat';
            projectRepository.saveProjectSnapshot(projectId, project);
          } else {
            // Resume / regenerate failed panels
            normalizedPanels = scene.storyboardPanels || [];
            
            for (const panel of normalizedPanels) {
              if (panel.generationMode !== 'real') {
                panel.generationMode = 'waiting';
                panel.isReal = false;
              }
            }
            if (scene.heroFrame && scene.heroFrame.generationMode !== 'real') {
              scene.heroFrame.generationMode = 'waiting';
              scene.heroFrame.isReal = false;
            }
            scene.storyboardStatus = 'Sedang dibuat';
            projectRepository.saveProjectSnapshot(projectId, project);
          }

          // 3. Assemble tasks
          const framesToProcess = [];
          
          if (scene.heroFrame && scene.heroFrame.generationMode !== 'real') {
            framesToProcess.push({
              type: 'hero',
              id: 'hero',
              prompt: scene.summary || scene.title || narration || "cinematic scene representation",
              target: scene.heroFrame
            });
          }

          for (let i = 0; i < normalizedPanels.length; i++) {
            const panel = normalizedPanels[i];
            if (panel.generationMode !== 'real') {
              framesToProcess.push({
                type: 'panel',
                id: panel.id,
                index: i,
                prompt: panel.imagePrompt || panel.action || `Cinematic visual for ${panel.label}`,
                target: panel
              });
            }
          }

          // Determine queueMode
          let queueMode = 'real';
          if (mode === 'resume') {
            const hasFailed = normalizedPanels.some(p => p.generationMode === 'failed' || p.generationMode === 'rate_limited');
            queueMode = hasFailed ? 'retry_failed' : 'resume';
          }

          // Log initial waiting state for all tasks in the queue
          for (const task of framesToProcess) {
            const frameKey = task.type === 'hero' ? 'hero' : `beat_${task.index + 1}`;
            logStoryboardQueue({
              projectId,
              sceneId,
              queueMode,
              frameKey,
              status: 'waiting',
              attempt: 1,
              delaySec: 0,
              backoffSec: 0,
              providerStatus: 'queued',
              providerImageUrlExists: false,
              persisted: true
            });
          }

          // 4. Retrieve delay settings
          const settings = settingsService.getSettings();
          const delayMs = (settings.storyboardDelaySec || 10) * 1000;

          // 5. Sequential queue loop
          for (let idx = 0; idx < framesToProcess.length; idx++) {
            const task = framesToProcess[idx];
            const frameKey = task.type === 'hero' ? 'hero' : `beat_${task.index + 1}`;
            const currentDelaySec = idx > 0 ? (settings.storyboardDelaySec || 10) : 0;

            // Update progressive state
            project = projectRepository.getProject(projectId);
            scene = project.scenes.find(s => s.id === sceneId);
            if (scene) {
              scene.storyboardProgress = {
                current: idx,
                total: framesToProcess.length,
                message: `Membuat gambar storyboard ${idx + 1} dari ${framesToProcess.length}`,
                detail: idx > 0 ? `Menunggu jeda kuota ${settings.storyboardDelaySec || 10} detik agar stabil...` : `Memulai pembuatan gambar...`
              };
              projectRepository.saveProjectSnapshot(projectId, project);
            }

            // Waiting delay
            if (idx > 0) {
              await new Promise(r => setTimeout(r, delayMs));
            }

            // Log generating
            logStoryboardQueue({
              projectId,
              sceneId,
              queueMode,
              frameKey,
              status: 'generating',
              attempt: 1,
              delaySec: currentDelaySec,
              backoffSec: 0,
              providerStatus: 'generating_image',
              providerImageUrlExists: false,
              persisted: false
            });

            let aspectPromptPart = "widescreen cinematic 16:9";
            if (cleanAspectRatio === "9:16") aspectPromptPart = "vertical cinematic 9:16";
            else if (cleanAspectRatio === "1:1") aspectPromptPart = "square 1:1";
            else if (cleanAspectRatio === "21:9") aspectPromptPart = "widescreen ultra-wide 21:9";

            let cleanPrompt = task.prompt;
            const forbiddenWords = [
              /clapperboard/gi, /clapboard/gi, /slate/gi, /film slate/gi, /director board/gi, 
              /director's slate/gi, /storyboard frame/gi, /drawing board/gi, /production clap/gi, 
              /camera crew/gi, /studio set/gi, /behind the scenes/gi, /shooting set/gi, 
              /production marker/gi, /shooting board/gi, /marker board/gi, /text overlay/gi, 
              /ui frame/gi, /clapboard in hand/gi, /shooting board literal/gi, /production marker/gi
            ];
            for (const wordRegex of forbiddenWords) {
              cleanPrompt = cleanPrompt.replace(wordRegex, '');
            }

            const negativePromptSuffix = ", photorealistic, diegetic scene, story world, no clapperboard, no slate, no film production equipment, no behind the scenes, no director board, no camera crew, no watermarks, no camera icons, no grids, no margins, no text overlays";
            const finalImagePrompt = `${cleanPrompt.trim()}, ${aspectPromptPart}${negativePromptSuffix}`;

            let imgSize = '1280x720';
            if (cleanAspectRatio === '9:16') imgSize = '720x1280';
            else if (cleanAspectRatio === '1:1') imgSize = '1024x1024';
            else if (cleanAspectRatio === '21:9') imgSize = '1280x548';

            let base64 = null;
            let filename = null;
            let success = false;
            let rateLimited = false;
            let finalAttempt = 1;

            // Retries with exponential backoff on 429
            const maxRetries = 3;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              finalAttempt = attempt;
              try {
                project = projectRepository.getProject(projectId);
                scene = project.scenes.find(s => s.id === sceneId);
                if (scene) {
                  scene.storyboardProgress = {
                    current: idx,
                    total: framesToProcess.length,
                    message: `Membuat gambar storyboard ${idx + 1} dari ${framesToProcess.length}`,
                    detail: `Menghubungi AI provider (Percobaan ${attempt}/${maxRetries})...`
                  };
                  projectRepository.saveProjectSnapshot(projectId, project);
                }

                // Log generation attempt
                logStoryboardQueue({
                  projectId,
                  sceneId,
                  queueMode,
                  frameKey,
                  status: 'generating',
                  attempt,
                  delaySec: currentDelaySec,
                  backoffSec: 0,
                  providerStatus: `sending_request_attempt_${attempt}`,
                  providerImageUrlExists: false,
                  persisted: false
                });

                console.log(`[Storyboard Queue] Generating visual for ${task.type} ${task.id} (attempt ${attempt}/${maxRetries})`);
                const imgResponse = await grokpiImageGeneration(finalImagePrompt, { size: imgSize });
                const extracted = extractBase64(imgResponse);
                if (extracted) {
                  base64 = extracted;
                  filename = saveBase64Image(base64);
                  success = true;
                  break;
                }
              } catch (imgErr) {
                console.error(`[Storyboard Queue Retry] Attempt ${attempt} failed:`, imgErr.message);
                logToBackendFile(`[Storyboard Queue Retry] sceneId=${sceneId} type=${task.type} attempt=${attempt} error="${imgErr.message}"`);

                const errText = (imgErr.message || '').toLowerCase();
                const is429 = errText.includes('rate limit') || errText.includes('no token') || imgErr.statusCode === 429;
                const backoffSec = attempt === 1 ? 30 : 60;

                if (is429) {
                  rateLimited = true;
                  
                  logStoryboardQueue({
                    projectId,
                    sceneId,
                    queueMode,
                    frameKey,
                    status: 'rate_limited',
                    attempt,
                    delaySec: currentDelaySec,
                    backoffSec: attempt < maxRetries ? backoffSec : 0,
                    providerStatus: 'rate_limit_hit',
                    providerImageUrlExists: false,
                    persisted: true
                  });

                  if (attempt < maxRetries) {
                    console.log(`[Storyboard Queue Backoff] Rate limit hit. Waiting ${backoffSec}s before attempt ${attempt + 1}...`);
                    
                    project = projectRepository.getProject(projectId);
                    scene = project.scenes.find(s => s.id === sceneId);
                    if (scene) {
                      scene.storyboardProgress = {
                        current: idx,
                        total: framesToProcess.length,
                        message: `Membuat gambar storyboard ${idx + 1} dari ${framesToProcess.length}`,
                        detail: `Terkena limit kuota. Mencoba ulang otomatis dalam ${backoffSec} detik...`
                      };
                      if (task.type === 'hero') {
                        scene.heroFrame.generationMode = 'rate_limited';
                      } else {
                        scene.storyboardPanels[task.index].generationMode = 'rate_limited';
                      }
                      projectRepository.saveProjectSnapshot(projectId, project);
                    }
                    await new Promise(r => setTimeout(r, backoffSec * 1000));
                  }
                } else {
                  logStoryboardQueue({
                    projectId,
                    sceneId,
                    queueMode,
                    frameKey,
                    status: 'failed',
                    attempt,
                    delaySec: currentDelaySec,
                    backoffSec: 0,
                    providerStatus: `provider_error: ${imgErr.message}`,
                    providerImageUrlExists: false,
                    persisted: false
                  });
                  break;
                }
              }
            }

            // Save results of this task item
            project = projectRepository.getProject(projectId);
            scene = project.scenes.find(s => s.id === sceneId);
            if (scene) {
              if (success && filename) {
                const imgUrl = `${baseUrl}/uploads/${filename}`;
                if (task.type === 'hero') {
                  scene.heroFrame = {
                    ...scene.heroFrame,
                    imageUrl: imgUrl,
                    isReal: true,
                    generationMode: 'real',
                    providerSource: 'grokpi_real'
                  };
                } else {
                  scene.storyboardPanels[task.index] = {
                    ...scene.storyboardPanels[task.index],
                    imageUrl: imgUrl,
                    isReal: true,
                    generationMode: 'real',
                    providerSource: 'grokpi_real'
                  };
                }

                logStoryboardQueue({
                  projectId,
                  sceneId,
                  queueMode,
                  frameKey,
                  status: 'real',
                  attempt: finalAttempt,
                  delaySec: currentDelaySec,
                  backoffSec: 0,
                  providerStatus: 'success',
                  providerImageUrlExists: true,
                  persisted: true
                });
              } else {
                const statusMode = rateLimited ? 'rate_limited' : 'failed';
                if (task.type === 'hero') {
                  scene.heroFrame.generationMode = statusMode;
                } else {
                  scene.storyboardPanels[task.index].generationMode = statusMode;
                }

                // Mark remaining pending panels as waiting
                for (let rest = idx + 1; rest < framesToProcess.length; rest++) {
                  const restTask = framesToProcess[rest];
                  if (restTask.type === 'hero') {
                    scene.heroFrame.generationMode = 'waiting';
                  } else {
                    scene.storyboardPanels[restTask.index].generationMode = 'waiting';
                  }
                }

                scene.storyboardStatus = 'Gagal, coba lagi';
                scene.storyboardProgress = {
                  current: idx,
                  total: framesToProcess.length,
                  message: `Gagal membuat storyboard`,
                  detail: rateLimited ? `Panel terkena limit kuota. Klik 'Lanjutkan generate' untuk mencoba lagi.` : `AI provider gagal membuat gambar.`
                };
                projectRepository.saveProjectSnapshot(projectId, project);

                // LOG CURRENT FRAME FAILURE
                logStoryboardQueue({
                  projectId,
                  sceneId,
                  queueMode,
                  frameKey,
                  status: statusMode,
                  attempt: finalAttempt,
                  delaySec: currentDelaySec,
                  backoffSec: 0,
                  providerStatus: rateLimited ? 'rate_limit_exhausted' : 'provider_failed',
                  providerImageUrlExists: false,
                  persisted: true
                });

                // LOG REMAINING SKIPPED PANELS AS WAITING / QUEUE INTERRUPTED
                for (let rest = idx + 1; rest < framesToProcess.length; rest++) {
                  const restTask = framesToProcess[rest];
                  const restFrameKey = restTask.type === 'hero' ? 'hero' : `beat_${restTask.index + 1}`;
                  logStoryboardQueue({
                    projectId,
                    sceneId,
                    queueMode,
                    frameKey: restFrameKey,
                    status: 'waiting',
                    attempt: 1,
                    delaySec: 0,
                    backoffSec: 0,
                    providerStatus: 'queue_interrupted',
                    providerImageUrlExists: false,
                    persisted: true
                  });
                }
                
                throw new AppError(rateLimited ? 'GrokPI rate limit hit. Coba lagi beberapa saat lagi.' : 'GrokPI image generation failed.', 500);
              }
              projectRepository.saveProjectSnapshot(projectId, project);
            }
          }

          // 6. Queue finished successfully! Calculate final statuses
          project = projectRepository.getProject(projectId);
          scene = project.scenes.find(s => s.id === sceneId);
          if (scene) {
            const realCount = scene.storyboardPanels.filter(p => p.generationMode === 'real').length;
            const totalCount = scene.storyboardPanels.length;

            if (realCount === totalCount && scene.heroFrame?.generationMode === 'real') {
              scene.storyboardStatus = 'Siap dicek';
            } else {
              scene.storyboardStatus = 'Siap (Partial Fallback)';
            }

            const heroPanel = scene.storyboardPanels[2] || scene.storyboardPanels[0];
            scene.storyboardImageUrl = scene.heroFrame?.imageUrl || heroPanel.imageUrl;
            
            scene.providerEvidence = {
              realPanels: realCount,
              fallbackPanels: totalCount - realCount,
              totalPanels: totalCount
            };
            
            scene.storyboardProgress = null;
            projectRepository.saveProjectSnapshot(projectId, project);
          }

          resolve({
            status: 'completed',
            storyboardStatus: scene.storyboardStatus,
            aspectRatio: cleanAspectRatio,
            orientation,
            width: dims.width,
            height: dims.height,
            storyboardImageUrl: scene.storyboardImageUrl,
            providerEvidence: scene.providerEvidence,
            heroFrame: scene.heroFrame,
            panels: scene.storyboardPanels
          });
        } catch (error) {
          console.error('Error in sceneService.generateStoryboard:', error);
          reject(error instanceof AppError ? error : new AppError('Storyboard gagal dibuat. Buat ulang storyboard.', 500));
        }
      }).catch(err => reject(err));
    });
  },

  /**
   * Creates a video generation job using the full ScenePromptPackage pipeline.
   * Flow: Resolve refs → Build package → Build prompt → Validate → Build payload → Send to GrokPI
   */
  createVideoJob: async (sceneId, inputs) => {
    const {
      projectId,
      videoInstruction,
      settings = {},
      scene = {},
      references = [],
      storyboardPanels = [],
      heroFrame,
      storyboardImageUrl,
      previousSceneVideoUrl
    } = inputs;

    if (!scene.narration && !videoInstruction) {
      throw new AppError('Narasi atau instruksi video tidak boleh kosong.', 400);
    }

    // --- Step 0.1: Compress Narration if needed ---
    const compressedNarration = await compressNarration(scene.narration || '');
    console.log(`[SceneVideo] original narration length: ${scene.narration?.length || 0} chars, compressed narration: "${compressedNarration}"`);

    // --- Step 0.2: Extract Emotion Direction ---
    const emotionDirection = await extractEmotionDirection({
      narration: compressedNarration,
      summary: scene.summary || '',
      goal: scene.goal || '',
      storyboardPanels,
      videoInstruction: videoInstruction || '',
      dialogue: scene.dialogue || ''
    });
    console.log(`[SceneVideo] extracted emotion: primary=${emotionDirection.primaryEmotion}, intensity=${emotionDirection.emotionalIntensity}`);

    // --- Step 0.3: Build Audio Pacing & Timing Direction ---
    const audioDirection = buildAudioDirection({
      emotionDirection,
      panels: storyboardPanels
    });
    console.log(`[SceneVideo] built audio direction pacing: ${audioDirection.narrationPacing}, tone: ${audioDirection.emotionTone}`);

    // --- Step 1: Build ScenePromptPackage ---
    console.log(`[SceneVideo] projectId=${projectId} sceneId=${sceneId}`);
    console.log(`[SceneVideo] references count=${references.length}`);
    console.log(`[SceneVideo] storyboard panels count=${storyboardPanels.length}`);
    console.log(`[SceneVideo] has hero frame=${!!heroFrame?.imageUrl}`);
    console.log(`[SceneVideo] has previous video reference=${!!previousSceneVideoUrl}`);

    // Read master project settings directly from the database
    let masterAspectRatio = '16:9';
    let masterDurationSec = 10;
    if (projectId) {
      try {
        const projObj = projectRepository.getProject(projectId);
        if (projObj && projObj.settings) {
          if (projObj.settings.aspectRatio) masterAspectRatio = projObj.settings.aspectRatio;
          if (projObj.settings.durationPerSceneSec) masterDurationSec = projObj.settings.durationPerSceneSec;
        }
      } catch (err) {
        console.warn(`[SceneVideo] Failed to load master project settings for ${projectId}, using defaults.`, err.message);
      }
    }

    let rawAspectRatio = masterAspectRatio;
    let normalizedAspectRatio = '16:9';
    if (rawAspectRatio.includes('9:16') || rawAspectRatio === '9:16') {
      normalizedAspectRatio = '9:16';
    } else if (rawAspectRatio.includes('1:1') || rawAspectRatio === '1:1') {
      normalizedAspectRatio = '1:1';
    } else if (rawAspectRatio.includes('21:9') || rawAspectRatio === '21:9') {
      normalizedAspectRatio = '21:9';
    }

    const promptPackage = buildScenePromptPackage({
      projectId: projectId || 'project-unknown',
      sceneId,
      scene: {
        ...scene,
        narration: scene.narration || '',
        aspectRatio: normalizedAspectRatio
      },
      references,
      storyboardPanels,
      heroFrame,
      storyboardImageUrl,
      videoInstruction: videoInstruction || '',
      settings: {
        durationSec: masterDurationSec,
        quality: settings.quality || 'Tinggi',
        aspectRatio: normalizedAspectRatio
      },
      previousSceneVideoUrl
    });

    // Attach Step 5 professional directions
    promptPackage.compressedNarration = compressedNarration;
    promptPackage.emotionDirection = emotionDirection;
    promptPackage.audioDirection = audioDirection;

    // --- Step 2: Build final video prompt ---
    const finalPrompt = buildVideoPrompt(promptPackage);

    // --- Step 3: Validate Prompt and Audio ---
    const validation = validateVideoPrompt(promptPackage, finalPrompt);
    console.log(`[SceneVideo] video validation passed=${validation.passed} warnings=${validation.warnings.length} errors=${validation.errors.length}`);

    if (!validation.passed) {
      console.error(`[SceneVideo] Validation FAILED:`, validation.errors);
      return {
        jobId: null,
        status: 'failed',
        scenePromptPackageId: promptPackage.contentHash,
        validation
      };
    }

    const audioValidation = validateAudioTiming(promptPackage, finalPrompt);
    console.log(`[SceneVideo] audio validation passed=${audioValidation.passed} warnings=${audioValidation.warnings.length} errors=${audioValidation.errors.length}`);
    promptPackage.audioValidation = audioValidation;

    if (!audioValidation.passed) {
      console.error(`[SceneVideo] Audio Validation FAILED:`, audioValidation.errors);
      
      // Categorize errors for user-friendly messages
      const categorizedErrors = audioValidation.errors.map(err => {
        if (err.includes('sterility violation')) {
          return 'Prompt video masih berisi instruksi narator. Hapus instruksi narasi dari kolom Instruksi Video.';
        }
        if (err.includes('Narasi tidak boleh kosong')) {
          return 'Narasi belum diisi. Tulis narasi adegan terlebih dahulu.';
        }
        return err;
      });
      // Deduplicate
      const uniqueErrors = [...new Set(categorizedErrors)];
      
      return {
        jobId: null,
        status: 'failed',
        scenePromptPackageId: promptPackage.contentHash,
        validation: {
          passed: false,
          errors: uniqueErrors,
          warnings: audioValidation.warnings
        }
      };
    }

    // --- Step 4: Build provider payload ---
    const providerPayload = buildProviderPayload(promptPackage, finalPrompt);

    // Resolve and convert local reference images to base64 data URLs asynchronously (incorporates preflight validation!)
    const {
      processedReferenceImages,
      preflightPassCount = 0,
      preflightFailCount = 0,
      resizedCount = 0,
      convertedBase64Count,
      skippedLocalCount,
      imageUrlCountSent,
      imageUrlSource
    } = await resolveAndConvertReferences(providerPayload.referenceImages);

    // Replace the referenceImages in providerPayload with the base64/processed ones
    providerPayload.referenceImages = processedReferenceImages;
    providerPayload.nativeImageToVideo = imageUrlCountSent > 0;

    // Build safe payload summary for debugging (no secrets, no full URLs)
    const roleCounts = {};
    for (const ref of providerPayload.referenceImages) {
      roleCounts[ref.role] = (roleCounts[ref.role] || 0) + 1;
    }
    const providerPayloadSummary = {
      model: 'grok-imagine-1.0-video',
      video_config: {
        aspect_ratio: providerPayload.aspectRatio,
        video_length: providerPayload.durationSec,
        resolution_name: providerPayload.resolution_name,
        preset: 'normal'
      },
      projectAspectRatio: normalizedAspectRatio,
      heroFrameAspectRatio: heroFrame?.aspectRatio || '16:9',
      storyboardAspectRatio: promptPackage.storyboard?.aspectRatio || '16:9',
      videoPayloadAspectRatio: providerPayload.aspectRatio || '16:9',
      durationSec: providerPayload.durationSec || 10,
      syncStatus: validation.passed ? 'synced' : 'mismatch',
      contentBlockCount: 1 + providerPayload.referenceImages.length,
      imageUrlCount: providerPayload.referenceImages.length,
      imageUrlCountSent,
      skippedLocalCount,
      convertedBase64Count,
      preflightPassCount,
      preflightFailCount,
      resizedCount,
      imageUrlSource,
      firstImageRole: providerPayload.referenceImages[0]?.role || null,
      roleList: Object.keys(roleCounts),
      roleCounts,
      promptLength: finalPrompt.length,
      nativeImageToVideo: providerPayload.nativeImageToVideo || false
    };

    console.log(`[SceneVideo] providerPayloadSummary:`, JSON.stringify(providerPayloadSummary));

    // --- Step 5: Create job and send to GrokPI ---
    const jobId = `job-${sceneId}-${Date.now()}`;
    const videoConfig = {
      aspect_ratio: providerPayload.aspectRatio || '16:9',
      video_length: providerPayload.durationSec || 10,
      resolution_name: providerPayload.resolution_name || '480p',
      referenceImages: providerPayload.referenceImages
    };

    activeJobs.set(jobId, {
      sceneId,
      projectId,
      status: 'queued',
      progress: 10,
      videoUrl: null,
      errorMessage: null,
      scenePromptPackageId: promptPackage.contentHash,
      providerPayloadSummary,
      audioDirection,
      emotionDirection,
      compressedNarration,
      audioValidation
    });

    // Fire generation in background
    sceneService.runBackgroundVideoGeneration(jobId, finalPrompt, videoConfig);

    return {
      jobId,
      status: 'queued',
      scenePromptPackageId: promptPackage.contentHash,
      validation: {
        passed: true,
        errors: [],
        warnings: [...validation.warnings, ...audioValidation.warnings]
      },
      providerPayloadSummary,
      audioDirection,
      emotionDirection,
      compressedNarration,
      audioValidation
    };
  },

  /**
   * Background process: sends full prompt to GrokPI and polls for completion.
   * The prompt is already built from the ScenePromptPackage pipeline.
   */
  runBackgroundVideoGeneration: async (jobId, finalPrompt, videoConfig) => {
    try {
      console.log(`[SceneService] Submitting video job ${jobId} to GrokPI...`);
      const response = await grokpiVideoGeneration(finalPrompt, videoConfig);
      const upstreamJobId = response.jobId;

      if (!upstreamJobId) throw new Error('GrokPI did not provide an upstream job identifier.');

      console.log(`[SceneService] Video job submitted successfully. Upstream ID: ${upstreamJobId}`);
      const currentJob = activeJobs.get(jobId) || {};
      activeJobs.set(jobId, { ...currentJob, status: 'processing', progress: 20, upstreamJobId });

      const pollInterval = setInterval(async () => {
        try {
          const currentJob = activeJobs.get(jobId);
          if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
            clearInterval(pollInterval);
            return;
          }

          console.log(`[SceneService] Polling status for job ${jobId} (Upstream: ${upstreamJobId})...`);
          const check = await grokpiCheckVideoJob(upstreamJobId);
          console.log(`[SceneService] Job ${jobId} status is: ${check.status}`);
          
          if (check.status === 'completed') {
            clearInterval(pollInterval);
            const videoUrl = check.videoUrl;
            
            const PLACEHOLDER_BLOCKLIST = ['w3schools.com', 'mov_bbb.mp4', 'big_buck_bunny', 'sample-videos.com', 'placeholder', 'template'];
            const isPlaceholder = videoUrl && PLACEHOLDER_BLOCKLIST.some(b => videoUrl.toLowerCase().includes(b));
            
            if (isPlaceholder || !videoUrl) {
              console.error(`[SceneService] Job ${jobId} failed: Video URL is placeholder or empty`);
              activeJobs.set(jobId, { ...currentJob, status: 'failed', progress: 0, videoUrl: null, errorMessage: 'Video gagal dibuat.' });
            } else {
              console.log(`[SceneService] Job ${jobId} completed successfully! URL: ${videoUrl}`);
              activeJobs.set(jobId, { ...currentJob, status: 'completed', progress: 100, videoUrl, providerVideoUrl: videoUrl });
              if (currentJob.sceneId) sceneVideos.set(currentJob.sceneId, videoUrl);
            }
          } else if (check.status === 'failed') {
            clearInterval(pollInterval);
            console.error(`[SceneService] Job ${jobId} failed upstream: ${check.errorMessage}`);
            activeJobs.set(jobId, { ...currentJob, status: 'failed', progress: 0, errorMessage: check.errorMessage || 'Video gagal dibuat.' });
          } else {
            const currentProgress = Math.min((currentJob.progress || 20) + 15, 95);
            activeJobs.set(jobId, { ...currentJob, status: 'processing', progress: currentProgress });
          }
        } catch (err) {
          console.error(`[VideoJobManager] Error polling job ${jobId}:`, err.message);
        }
      }, 4000);
    } catch (error) {
      console.error(`[SceneService] Error running background video generation for job ${jobId}:`, error);
      const currentJob = activeJobs.get(jobId) || {};
      activeJobs.set(jobId, { ...currentJob, status: 'failed', progress: 0, errorMessage: error.message });
    }
  },

  /**
   * Retrieves the current rendering status of a job
   */
  getJobStatus: async (jobId) => {
    const job = activeJobs.get(jobId);
    if (!job) {
      return { status: 'failed', progress: 0, videoUrl: null, errorMessage: 'Job ID tidak ditemukan.' };
    }
    return {
      status: job.status,
      progress: job.progress,
      videoUrl: job.videoUrl,
      providerVideoUrl: job.providerVideoUrl || null,
      errorMessage: job.errorMessage,
      scenePromptPackageId: job.scenePromptPackageId || null,
      providerPayloadSummary: job.providerPayloadSummary || null
    };
  },

  /**
   * Helper to retrieve stored scene narration
   */
  getSceneNarration: (sceneId) => {
    return sceneNarrations.get(sceneId);
  },

  /**
   * Helper to retrieve stored scene video URL
   */
  getSceneVideo: (sceneId) => {
    return sceneVideos.get(sceneId);
  },

  /**
   * Setter for seeding or mocking video URLs (useful for integration QA tests)
   */
  setMockSceneVideo: (sceneId, videoUrl) => {
    sceneVideos.set(sceneId, videoUrl);
  }
};
