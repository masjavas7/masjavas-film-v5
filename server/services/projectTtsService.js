import fs from 'fs';
import path from 'path';
import { getRuntimePaths } from '../utils/runtimePaths.js';
import { projectRepository } from './projectRepository.js';
import { ttsService, AVAILABLE_VOICES } from './ttsService.js';
import { generateFittedTts } from './narrationFitService.js';
import { audioArtifactService } from './audioArtifactService.js';
import { logToBackendFile } from '../utils/logger.js';
import { AppError } from '../utils/safeError.js';

// In-memory status tracker for active batch TTS jobs
const batchJobs = new Map();

export const projectTtsService = {
  /**
   * Mengambil status pengerjaan batch TTS untuk suatu project.
   */
  getBatchJobStatus: (projectId) => {
    return batchJobs.get(projectId) || { status: 'idle', progress: 0, current: 0, total: 0, error: null, message: null };
  },

  /**
   * Menghentikan antrean pengerjaan batch TTS untuk suatu project.
   */
  cancelBatchJob: (projectId) => {
    const job = batchJobs.get(projectId);
    if (job && job.status === 'processing') {
      job.status = 'canceled';
      job.message = 'Antrean pembuatan audio dihentikan oleh user.';
      batchJobs.set(projectId, job);
      return job;
    }
    return { status: 'idle', progress: 0, current: 0, total: 0, error: null, message: null };
  },

  /**
   * Memulai pengerjaan batch TTS untuk seluruh adegan proyek secara paralel terbatas.
   */
  generateProjectNarrationAudio: async (projectId, baseUrl, body = {}) => {
    // 0. Pastikan Audio Artifacts sudah diinisialisasi terlebih dahulu (Artifact-First)
    try {
      audioArtifactService.prepareAudioArtifacts(projectId);
    } catch (e) {
      console.warn('[ProjectTTS] Failed to prepare audio artifacts before batch:', e.message);
    }

    const project = projectRepository.getProject(projectId);
    if (!project) {
      throw new AppError('Project tidak ditemukan.', 404);
    }

    // Jika sedang berjalan, biarkan saja
    const currentJob = batchJobs.get(projectId);
    if (currentJob && currentJob.status === 'processing') {
      return currentJob;
    }

    const mode = body.mode || 'all'; // all, missing_only, failed_only, stale_only
    let concurrency = 1;

    // 1. Lock voice
    let lockedVoice = project.lockedVoice;
    if (!lockedVoice) {
      lockedVoice = ttsService.castProjectVoice(project);
      project.lockedVoice = lockedVoice;
      projectRepository.saveProjectSnapshot(projectId, { lockedVoice });
      logToBackendFile(`[ProjectTTS] Locked project voice: ${lockedVoice.voiceName}`);
    }

    if (!project.ttsSettings) {
      const voiceMeta = AVAILABLE_VOICES.find(v => v.voiceName === lockedVoice.voiceName) || AVAILABLE_VOICES[0];
      project.ttsSettings = {
        provider: 'gemini',
        model: 'gemini-2.5-flash-preview-tts',
        voiceName: voiceMeta.voiceName,
        voiceGender: voiceMeta.gender,
        voiceStyle: voiceMeta.style,
        voiceDescription: voiceMeta.description,
        locked: true,
        selectedBy: 'system',
        previewAudioUrl: '',
        selectedAt: new Date().toISOString()
      };
      projectRepository.saveProjectSnapshot(projectId, { ttsSettings: project.ttsSettings });
    }

    const ttsSettings = project.ttsSettings;
    const voiceName = ttsSettings.voiceName;

    // Strict validation check
    const isAudioValid = (scene) => {
      const tts = scene.ttsNarration;
      if (!tts || !tts.audioPath || !tts.audioUrl) return false;
      if (scene.status === 'stale') return false; 
      if (tts.voiceName !== voiceName) return false;
      if (tts.cutoffDetected) return false;

      try {
        const fileExists = fs.existsSync(tts.audioPath);
        if (!fileExists) return false;

        const stats = fs.statSync(tts.audioPath);
        if (stats.size < 10240) return false; // size < 10 KB

        if (tts.actualAudioDurationSec <= 1.0 || tts.actualAudioDurationSec > 10.05) return false;
      } catch (e) {
        return false;
      }

      return true;
    };

    // Filter scenes to process based on mode
    const scenesToProcess = [];
    for (const scene of project.scenes) {
      if (scene.status === 'skipped' || scene.audioArtifact?.status === 'skipped') {
        continue;
      }
      let shouldProcess = false;
      if (mode === 'all') {
        shouldProcess = true;
      } else if (mode === 'missing_only') {
        const valid = isAudioValid(scene);
        if (!valid && scene.status !== 'stale') {
          shouldProcess = true;
        }
      } else if (mode === 'failed_only') {
        const valid = isAudioValid(scene);
        if (!valid && (scene.status === 'failed' || !scene.ttsNarration)) {
          shouldProcess = true;
        }
      } else if (mode === 'stale_only') {
        if (scene.status === 'stale') {
          shouldProcess = true;
        }
      } else if (mode === 'resume') {
        const valid = isAudioValid(scene);
        if (!valid) {
          shouldProcess = true;
        }
      }

      if (shouldProcess) {
        scenesToProcess.push(scene);
      }
    }

    const job = {
      status: 'processing',
      progress: 0,
      current: 0,
      total: scenesToProcess.length,
      error: null,
      message: 'Memulai antrean pemrosesan suara...'
    };
    batchJobs.set(projectId, job);

    if (scenesToProcess.length === 0) {
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Semua audio sudah siap diputar.';
      batchJobs.set(projectId, job);
      return job;
    }

    // Run asynchronously
    (async () => {
      try {
        logToBackendFile(`[ProjectTTS] Starting parallel batch TTS for project ${projectId} (concurrency=${concurrency}, mode=${mode})`);
        const runtimePaths = getRuntimePaths();
        const ttsUploadsDir = path.join(runtimePaths.uploadsDir, 'tts');
        if (!fs.existsSync(ttsUploadsDir)) {
          fs.mkdirSync(ttsUploadsDir, { recursive: true });
        }

        // Pre-flight: verify FFmpeg is available
        try {
          const { ffmpegService: ffmpegSvc } = await import('./ffmpegService.js');
          const ffmpegStatus = ffmpegSvc.checkAvailability();
          if (!ffmpegStatus.available) {
            job.status = 'failed';
            job.error = 'FFmpeg tidak tersedia. Instal FFmpeg untuk membuat audio narasi.';
            batchJobs.set(projectId, job);
            logToBackendFile(`[ProjectTTS] ABORT: FFmpeg not available`);
            return job;
          }
          logToBackendFile(`[ProjectTTS] FFmpeg OK: v${ffmpegStatus.version}`);
        } catch (ffErr) {
          logToBackendFile(`[ProjectTTS] FFmpeg check warning: ${ffErr.message}`);
        }

        const lockedVoiceModel = `gemini/${ttsSettings.model || 'gemini-2.5-flash-preview-tts'}/${voiceName}`;
        let completedCount = 0;
        let activeIndex = 0;
        let failedCount = 0;
        let rateLimitCooldownActive = false;

        const worker = async () => {
          while (activeIndex < scenesToProcess.length) {
            // Check if queue has been interrupted or completed
            const checkJob = batchJobs.get(projectId);
            if (!checkJob || checkJob.status === 'canceled' || checkJob.status === 'failed') {
              break;
            }

            const index = activeIndex++;
            if (index >= scenesToProcess.length) break;

            const scene = scenesToProcess[index];
            const destPath = path.join(ttsUploadsDir, `project_${projectId}_scene_${scene.id}.mp3`);
            const relativeUrl = `uploads/tts/project_${projectId}_scene_${scene.id}.mp3`;
            const audioUrl = `${baseUrl}/${relativeUrl}`;

            logToBackendFile(`[ProjectTTS] [Worker] Generating scene ${scene.id} (${index + 1}/${scenesToProcess.length})`);

            // Update UI/State to generating
            scene.status = 'generating_audio';
            if (!scene.checklist) scene.checklist = {};
            scene.checklist.ttsAudioReady = false;

            if (scene.audioArtifact) {
              scene.audioArtifact.status = 'generating';
              scene.audioArtifact.updatedAt = new Date().toISOString();
            }
            projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });

            let currentTtsMetadata = null;
            let success = false;

            // Retry up to 2 times
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                // Wrap in 90-second timeout to prevent hangs
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout pembuatan audio (90 detik).')), 90000)
                );

                const ttsPromise = generateFittedTts({
                  narration: scene.narrationText || scene.narration,
                  destPath,
                  voiceModel: lockedVoiceModel,
                  emotion: scene.emotionDirection?.primaryEmotion || scene.emotion || 'tense',
                  genre: project.settings?.genre || '',
                  sceneSummary: scene.summary || '',
                  sceneId: scene.id,
                  generateTtsFn: ttsService.generateTts
                });

                currentTtsMetadata = await Promise.race([ttsPromise, timeoutPromise]);

                // Strict validation check
                const fileExists = fs.existsSync(destPath);
                let fileSize = 0;
                if (fileExists) {
                  fileSize = fs.statSync(destPath).size;
                }

                const valid = fileExists && 
                              fileSize >= 10240 && 
                              currentTtsMetadata.actualAudioDurationSec > 1.0 && 
                              currentTtsMetadata.actualAudioDurationSec <= 10.05 && 
                              !currentTtsMetadata.cutoffDetected && 
                              currentTtsMetadata.voiceName === voiceName;

                if (valid) {
                  scene.ttsNarration = {
                    ...currentTtsMetadata,
                    audioUrl,
                    audioPath: destPath
                  };
                  scene.status = 'ready';
                  scene.checklist.ttsAudioReady = true;
                  scene.checklist.audioTimingReady = true;
                  
                  if (scene.audioArtifact) {
                    scene.audioArtifact.status = 'ready';
                    scene.audioArtifact.audioUrl = audioUrl;
                    scene.audioArtifact.audioPath = destPath;
                    scene.audioArtifact.actualDurationSec = currentTtsMetadata.actualAudioDurationSec;
                    scene.audioArtifact.lastError = null;
                    scene.audioArtifact.updatedAt = new Date().toISOString();
                  }

                  logToBackendFile(`[TTSAudioWrite] projectId=${projectId} sceneId=${scene.id} voiceName=${voiceName} fileExists=${fileExists} fileSize=${fileSize} duration=${currentTtsMetadata?.actualAudioDurationSec || 0} finalStatus=${scene.status} errorCode=none`);
                  success = true;
                  break;
                } else {
                  let errReason = 'Audio tidak valid.';
                  if (!fileExists) errReason = 'File audio tidak terbentuk.';
                  else if (fileSize < 10240) errReason = 'File audio tidak terbentuk.'; // size < 10KB
                  else if (currentTtsMetadata.actualAudioDurationSec <= 1.0) errReason = 'Durasi audio terlalu pendek (< 1 detik).';
                  else if (currentTtsMetadata.actualAudioDurationSec > 10.05) errReason = 'Durasi audio terlalu panjang (> 10 detik).';
                  else if (currentTtsMetadata.cutoffDetected) errReason = 'Audio terpotong (cutoff).';
                  else if (currentTtsMetadata.voiceName !== voiceName) errReason = `Suara tidak konsisten dengan locked voice.`;

                  scene.ttsNarration = {
                    ...currentTtsMetadata,
                    audioUrl,
                    audioPath: destPath,
                    fitStatus: 'failed_fit',
                    message: errReason
                  };
                  scene.status = 'failed';
                  scene.checklist.ttsAudioReady = false;
                  scene.checklist.audioTimingReady = false;

                  if (scene.audioArtifact) {
                    scene.audioArtifact.status = 'failed';
                    scene.audioArtifact.lastError = errReason;
                    scene.audioArtifact.updatedAt = new Date().toISOString();
                  }

                  logToBackendFile(`[TTSAudioWrite] projectId=${projectId} sceneId=${scene.id} voiceName=${voiceName} fileExists=${fileExists} fileSize=${fileSize} duration=${currentTtsMetadata?.actualAudioDurationSec || 0} finalStatus=${scene.status} errorCode=${errReason}`);
                }
              } catch (err) {
                logToBackendFile(`[ProjectTTS] Attempt ${attempt} failed for scene ${scene.id}: ${err.message}`);
                
                const errText = (err.message || '').toLowerCase();
                const is429 = errText.includes('429') || errText.includes('rate limit') || errText.includes('too fast');

                if (is429) {
                  // HTTP 429 Adaptive Cooldown handling
                  scene.status = 'rate_limited';
                  if (scene.audioArtifact) {
                    scene.audioArtifact.status = 'rate_limited';
                    scene.audioArtifact.lastError = 'Provider suara sedang membatasi request. Sistem akan mencoba lagi setelah jeda.';
                    scene.audioArtifact.updatedAt = new Date().toISOString();
                  }
                  
                  // Update batch message dynamically without blocking popup alert
                  job.message = 'Provider suara sedang membatasi request. Sistem akan mencoba lagi setelah jeda.';
                  batchJobs.set(projectId, { ...job });
                  projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });

                  // Parse Gemini's 'Please retry in XX.XXXs' from error message
                  const retryMatch = errText.match(/retry in ([\d.]+)/i);
                  const retryAfterMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000 : 45000;
                  logToBackendFile(`[ProjectTTS] Rate limited. Waiting ${retryAfterMs}ms before retry...`);
                  concurrency = 1;
                  rateLimitCooldownActive = true;
                  await new Promise(r => setTimeout(r, retryAfterMs));
                  rateLimitCooldownActive = false;

                  // Rollback attempt to retry
                  attempt--;
                  continue;
                }

                scene.status = 'failed';
                scene.ttsNarration = {
                  provider: 'gemini',
                  model: ttsSettings.model || 'gemini-2.5-flash-preview-tts',
                  voiceName,
                  fittedText: scene.narrationText || scene.narration,
                  actualAudioDurationSec: 0,
                  audioPath: destPath,
                  fitStatus: 'failed_fit',
                  cutoffDetected: false,
                  message: err.message || 'File audio tidak terbentuk.'
                };
                scene.checklist.ttsAudioReady = false;
                scene.checklist.audioTimingReady = false;

                if (scene.audioArtifact) {
                  scene.audioArtifact.status = 'failed';
                  scene.audioArtifact.lastError = err.message || 'File audio tidak terbentuk.';
                  scene.audioArtifact.updatedAt = new Date().toISOString();
                }
              }

              if (attempt < 2) {
                const backoff = 3000 * attempt;
                logToBackendFile(`[ProjectTTS] Waiting ${backoff}ms before retry...`);
                await new Promise(r => setTimeout(r, backoff));
              }
            }

            if (!success) {
              failedCount++;
            }

            completedCount++;
            job.current = completedCount;
            job.progress = Math.round((completedCount / scenesToProcess.length) * 100);
            
            // Dynamic adaptive message
            if (failedCount > 0) {
              job.message = `${completedCount - failedCount} audio berhasil, ${failedCount} gagal. Kamu bisa buat ulang yang gagal.`;
            } else {
              job.message = `Sedang memproses audio narasi (${completedCount}/${scenesToProcess.length})...`;
            }
            batchJobs.set(projectId, { ...job });

            projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });

            // Default Cooldown delay (12-15 seconds) - stay within Gemini free tier 10 req/min
            const randomDelay = Math.floor(Math.random() * 3000) + 12000;
            logToBackendFile(`[ProjectTTS] Scene ${scene.id} finished. Cooldown ${randomDelay}ms...`);
            await new Promise(r => setTimeout(r, randomDelay));
          }
        };

        // Spawn workers
        const workers = [];
        const numWorkers = Math.min(concurrency, scenesToProcess.length);
        for (let w = 0; w < numWorkers; w++) {
          workers.push(worker());
        }

        await Promise.all(workers);

        job.status = 'completed';
        job.progress = 100;
        if (failedCount > 0) {
          job.message = `${scenesToProcess.length - failedCount} audio berhasil, ${failedCount} gagal. Kamu bisa buat ulang yang gagal.`;
        } else {
          job.message = 'Semua audio berhasil dibuat dengan sukses!';
        }
        batchJobs.set(projectId, { ...job });
        
        // Sync one last time
        audioArtifactService.prepareAudioArtifacts(projectId);
        logToBackendFile(`[ProjectTTS] Parallel batch TTS completed for project ${projectId}. Failed: ${failedCount}`);
      } catch (err) {
        console.error(`[ProjectTTS] Parallel batch TTS failed:`, err);
        logToBackendFile(`[ProjectTTS] Parallel batch TTS error: ${err.message}`);
        job.status = 'failed';
        job.error = err.message || 'Gagal membuat narasi audio.';
        batchJobs.set(projectId, { ...job });
      }
    })();

    return job;
  },

  /**
   * Meregenerasi audio TTS untuk adegan tertentu saja.
   */
  regenerateSceneTts: async (projectId, sceneId, baseUrl) => {
    const project = projectRepository.getProject(projectId);
    if (!project) {
      throw new AppError('Project tidak ditemukan.', 404);
    }

    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      throw new AppError('Adegan tidak ditemukan.', 404);
    }

    const scene = project.scenes[sceneIndex];
    let lockedVoice = project.lockedVoice;
    if (!lockedVoice) {
      lockedVoice = ttsService.castProjectVoice(project);
      project.lockedVoice = lockedVoice;
    }

    if (!project.ttsSettings) {
      const voiceMeta = AVAILABLE_VOICES.find(v => v.voiceName === lockedVoice.voiceName) || AVAILABLE_VOICES[0];
      project.ttsSettings = {
        provider: 'gemini',
        model: 'gemini-2.5-flash-preview-tts',
        voiceName: voiceMeta.voiceName,
        voiceGender: voiceMeta.gender,
        voiceStyle: voiceMeta.style,
        voiceDescription: voiceMeta.description,
        locked: true,
        selectedBy: 'system',
        previewAudioUrl: '',
        selectedAt: new Date().toISOString()
      };
    }

    const ttsSettings = project.ttsSettings;
    const voiceName = ttsSettings.voiceName;
    const lockedVoiceModel = `gemini/${ttsSettings.model || 'gemini-2.5-flash-preview-tts'}/${voiceName}`;
    const runtimePaths = getRuntimePaths();
    const ttsUploadsDir = path.join(runtimePaths.uploadsDir, 'tts');
    if (!fs.existsSync(ttsUploadsDir)) {
      fs.mkdirSync(ttsUploadsDir, { recursive: true });
    }

    const destPath = path.join(ttsUploadsDir, `project_${projectId}_scene_${sceneId}.mp3`);
    const relativeUrl = `uploads/tts/project_${projectId}_scene_${sceneId}.mp3`;
    const audioUrl = `${baseUrl}/${relativeUrl}`;

    logToBackendFile(`[ProjectTTS] Regenerating single TTS for scene ${sceneId} in project ${projectId}`);

    scene.status = 'generating_audio';
    if (scene.audioArtifact) {
      scene.audioArtifact.status = 'generating';
      scene.audioArtifact.updatedAt = new Date().toISOString();
    }
    projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });

    try {
      // 90-second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout pembuatan audio (90 detik).')), 90000)
      );

      const ttsPromise = generateFittedTts({
        narration: scene.narrationText || scene.narration,
        destPath,
        voiceModel: lockedVoiceModel,
        emotion: scene.emotionDirection?.primaryEmotion || scene.emotion || 'tense',
        genre: project.settings?.genre || '',
        sceneSummary: scene.summary || '',
        sceneId: scene.id,
        generateTtsFn: ttsService.generateTts
      });

      const ttsMetadata = await Promise.race([ttsPromise, timeoutPromise]);

      // Strict validation
      const fileExists = fs.existsSync(destPath);
      let fileSize = 0;
      if (fileExists) {
        fileSize = fs.statSync(destPath).size;
      }

      const valid = fileExists && 
                    fileSize >= 10240 && 
                    ttsMetadata.actualAudioDurationSec > 1.0 && 
                    ttsMetadata.actualAudioDurationSec <= 10.05 && 
                    !ttsMetadata.cutoffDetected && 
                    ttsMetadata.voiceName === voiceName;

      if (valid) {
        scene.ttsNarration = {
          ...ttsMetadata,
          audioUrl,
          audioPath: destPath
        };
        scene.status = 'ready';
        if (!scene.checklist) scene.checklist = {};
        scene.checklist.ttsAudioReady = true;
        scene.checklist.audioTimingReady = true;

        if (scene.audioArtifact) {
          scene.audioArtifact.status = 'ready';
          scene.audioArtifact.audioUrl = audioUrl;
          scene.audioArtifact.audioPath = destPath;
          scene.audioArtifact.actualDurationSec = ttsMetadata.actualAudioDurationSec;
          scene.audioArtifact.lastError = null;
          scene.audioArtifact.updatedAt = new Date().toISOString();
        }
      } else {
        let errReason = 'Audio tidak valid.';
        if (!fileExists) errReason = 'File audio tidak terbentuk.';
        else if (fileSize < 10240) errReason = 'File audio tidak terbentuk.'; // size < 10KB
        else if (ttsMetadata.actualAudioDurationSec <= 1.0) errReason = 'Durasi audio terlalu pendek (< 1 detik).';
        else if (ttsMetadata.actualAudioDurationSec > 10.05) errReason = 'Durasi audio terlalu panjang (> 10 detik).';
        else if (ttsMetadata.cutoffDetected) errReason = 'Audio terpotong (cutoff).';
        else if (ttsMetadata.voiceName !== voiceName) errReason = `Suara tidak konsisten dengan locked voice.`;

        scene.ttsNarration = {
          ...ttsMetadata,
          audioUrl,
          audioPath: destPath,
          fitStatus: 'failed_fit',
          message: errReason
        };
        scene.status = 'failed';
        if (!scene.checklist) scene.checklist = {};
        scene.checklist.ttsAudioReady = false;
        scene.checklist.audioTimingReady = false;

        if (scene.audioArtifact) {
          scene.audioArtifact.status = 'failed';
          scene.audioArtifact.lastError = errReason;
          scene.audioArtifact.updatedAt = new Date().toISOString();
        }
      }
    } catch (err) {
      console.error(`[ProjectTTS] Single regeneration failed:`, err);
      scene.status = 'failed';
      scene.ttsNarration = {
        provider: 'gemini',
        model: ttsSettings.model || 'gemini-2.5-flash-preview-tts',
        voiceName,
        fittedText: scene.narrationText || scene.narration,
        actualAudioDurationSec: 0,
        audioPath: destPath,
        fitStatus: 'failed_fit',
        cutoffDetected: false,
        message: err.message || 'File audio tidak terbentuk.'
      };
      if (!scene.checklist) scene.checklist = {};
      scene.checklist.ttsAudioReady = false;
      scene.checklist.audioTimingReady = false;

      if (scene.audioArtifact) {
        scene.audioArtifact.status = 'failed';
        scene.audioArtifact.lastError = err.message || 'File audio tidak terbentuk.';
        scene.audioArtifact.updatedAt = new Date().toISOString();
      }
    }

    const scenes = [...project.scenes];
    scenes[sceneIndex] = scene;
    projectRepository.saveProjectSnapshot(projectId, { lockedVoice, ttsSettings, scenes });

    return {
      success: true,
      scene
    };
  },

  /**
   * Menghasilkan audio preview pendek untuk suara tertentu.
   * Dilengkapi caching lokal agar hemat API hit dan anti-429.
   */
  generateVoicePreview: async (projectId, voiceName, sampleText, baseUrl) => {
    const runtimePaths = getRuntimePaths();
    const ttsPreviewsDir = path.join(runtimePaths.uploadsDir, 'tts', 'previews');
    if (!fs.existsSync(ttsPreviewsDir)) {
      fs.mkdirSync(ttsPreviewsDir, { recursive: true });
    }

    const stablePreviewFilename = `preview_cached_${voiceName}.mp3`;
    const destPath = path.join(ttsPreviewsDir, stablePreviewFilename);
    const relativeUrl = `uploads/tts/previews/${stablePreviewFilename}`;
    const audioUrl = `${baseUrl}/${relativeUrl}`;

    // 1. Cek cache lokal untuk mencegah 429
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      console.log(`[ProjectTTS] Serving cached voice preview for ${voiceName}`);
      return {
        ok: true,
        voiceName,
        audioUrl,
        durationSec: 3.0,
        voicePreview: {
          voiceName,
          audioUrl,
          cached: true,
          lastGeneratedAt: new Date().toISOString(),
          status: 'ready'
        }
      };
    }

    const textToSpeak = sampleText || "Ini adalah contoh suara narator untuk film sinematik Anda.";
    const voiceModel = `gemini/gemini-2.5-flash-preview-tts/${voiceName}`;

    try {
      logToBackendFile(`[ProjectTTS] Generating voice preview for ${voiceName}`);
      await ttsService.generateTts(textToSpeak, destPath, voiceModel);

      // Validate size
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 1000) {
        throw new Error("Gagal membuat sampel preview suara.");
      }

      const { validateAudioDuration } = await import('./narrationFitService.js');
      const durationRes = await validateAudioDuration(destPath, 10);

      return {
        ok: true,
        voiceName,
        audioUrl,
        durationSec: durationRes.actualDurationSec || 3.0,
        voicePreview: {
          voiceName,
          audioUrl,
          cached: false,
          lastGeneratedAt: new Date().toISOString(),
          status: 'ready'
        }
      };
    } catch (err) {
      console.warn(`[ProjectTTS] Voice preview generation failed for ${voiceName}:`, err.message);
      
      // Do not block selection! Return error gracefully without throwing AppError (anti-popup alert)
      return {
        ok: false,
        voiceName,
        audioUrl: null,
        durationSec: 0,
        message: "Contoh suara belum bisa dibuat sekarang. Kamu tetap bisa memilih suara ini.",
        voicePreview: {
          voiceName,
          audioUrl: null,
          cached: false,
          lastGeneratedAt: new Date().toISOString(),
          status: 'failed',
          error: err.message
        }
      };
    }
  },

  /**
   * Menyimpan model/voice yang dipilih secara manual oleh user.
   */
  selectProjectVoice: async (projectId, voiceName) => {
    const project = projectRepository.getProject(projectId);
    if (!project) {
      throw new AppError('Project tidak ditemukan.', 404);
    }

    const voiceMeta = AVAILABLE_VOICES.find(v => v.voiceName === voiceName);
    if (!voiceMeta) {
      throw new AppError('Voice tidak terdaftar.', 400);
    }

    const ttsSettings = {
      provider: 'gemini',
      model: 'gemini-2.5-flash-preview-tts',
      voiceName: voiceMeta.voiceName,
      voiceGender: voiceMeta.gender,
      voiceStyle: voiceMeta.style,
      voiceDescription: voiceMeta.description,
      locked: true,
      selectedBy: 'user',
      previewAudioUrl: '',
      selectedAt: new Date().toISOString()
    };

    const lockedVoice = {
      modelName: 'gemini-2.5-flash-preview-tts',
      voiceName: voiceMeta.voiceName,
      castReason: `Suara dikonfigurasi secara manual oleh user.`
    };

    // Update scenes to stale if voice differs
    const scenes = [...project.scenes];
    for (const scene of scenes) {
      if (scene.ttsNarration && scene.ttsNarration.voiceName !== voiceMeta.voiceName) {
        scene.status = 'stale';
        if (scene.checklist) {
          scene.checklist.ttsAudioReady = false;
          scene.checklist.audioTimingReady = false;
        }
        if (scene.audioArtifact) {
          scene.audioArtifact.status = 'stale';
          scene.audioArtifact.voiceName = voiceMeta.voiceName;
        }
      }
    }

    projectRepository.saveProjectSnapshot(projectId, { ttsSettings, lockedVoice, scenes });
    return { success: true, ttsSettings, scenes };
  },

  /**
   * Update teks narasi dan tandai status audio sebagai stale.
   */
  updateSceneTextAndMarkStale: async (projectId, sceneId, narrationText) => {
    const project = projectRepository.getProject(projectId);
    if (!project) {
      throw new AppError('Project tidak ditemukan.', 404);
    }

    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      throw new AppError('Adegan tidak ditemukan.', 404);
    }

    const scene = project.scenes[sceneIndex];
    const textChanged = scene.narrationText !== narrationText;

    if (textChanged) {
      const isReverted = scene.ttsNarration && scene.ttsNarration.originalText === narrationText;

      scene.narrationText = narrationText;
      scene.narration = narrationText;

      if (isReverted) {
        // User reverted to original text! Restore success states
        scene.status = 'ready';
        if (!scene.checklist) scene.checklist = {};
        scene.checklist.ttsAudioReady = true;
        scene.checklist.audioTimingReady = true;
        
        if (scene.ttsNarration) {
          scene.ttsNarration.fitStatus = 'fit';
        }

        if (scene.audioArtifact) {
          scene.audioArtifact.status = 'ready';
          scene.audioArtifact.lastError = null;
        }
      } else {
        // Teks berubah, mark stale
        scene.status = 'stale';
        
        // Recalculate fitting indicators
        const { fitNarrationToDuration } = await import('./narrationFitService.js');
        const fitResult = await fitNarrationToDuration(narrationText, {
          emotion: scene.emotionDirection?.primaryEmotion || scene.emotion || 'tense',
          sceneSummary: scene.summary || ''
        });

        if (!scene.checklist) {
          scene.checklist = {};
        }
        scene.checklist.ttsAudioReady = false;
        scene.checklist.audioTimingReady = false;

        scene.audioValidation = fitResult.audioValidation || {
          passed: fitResult.fitStatus !== 'too_long_warning',
          warnings: fitResult.fitStatus === 'too_long_warning' ? ['Teks narasi terlalu panjang.'] : [],
          errors: []
        };

        if (scene.ttsNarration) {
          scene.ttsNarration.fitStatus = 'stale';
        }

        if (scene.audioArtifact) {
          scene.audioArtifact.status = 'stale';
          scene.audioArtifact.narrationText = narrationText;
        }
      }
    }

    projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });
    return { success: true, scene };
  }
};

export default projectTtsService;
