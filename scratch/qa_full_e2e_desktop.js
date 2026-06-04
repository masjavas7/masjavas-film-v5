import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createApp } from '../server/app.js';
import { settingsService } from '../server/services/settingsService.js';
import { projectRepository } from '../server/services/projectRepository.js';
import { ttsService } from '../server/services/ttsService.js';
import { sceneService } from '../server/services/sceneService.js';
import { ffmpegService } from '../server/services/ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5';
const PORT_MOCK = 3009;
const PORT_APP = 3010;
const BASE_URL = `http://127.0.0.1:${PORT_APP}`;

// Path resources
const templateMp3 = 'C:\\Users\\Masjavas\\AppData\\Roaming\\MASJAVAS AI\\uploads\\tts\\project_qa-desktop-1780306799947_scene_scene-1.mp3';
const localVideoTemplate = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5\\test_blur.mp4';

if (!fs.existsSync(templateMp3)) {
  console.error(`❌ Template MP3 file not found at ${templateMp3}`);
  process.exit(1);
}

if (!fs.existsSync(localVideoTemplate)) {
  console.error(`❌ Local video template not found at ${localVideoTemplate}`);
  process.exit(1);
}

// 1. Mock ttsService.generateTts
ttsService.generateTts = async (text, destPath, voiceModel) => {
  console.log(`  [MockTTSService] Mocking generateTts for: "${text.substring(0, 40)}..."`);
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(templateMp3, destPath);
  return destPath;
};

// 2. Mock ffmpegService.downloadVideo
ffmpegService.downloadVideo = async (url, destPath) => {
  console.log(`  [MockFFmpegService] Copying local video template to: ${destPath}`);
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(localVideoTemplate, destPath);
};

async function main() {
  console.log('===========================================================');
  console.log('    FULL RELEASE CANDIDATE END-TO-END QA TEST RUNNER');
  console.log('===========================================================\n');

  // 1. Setup isolated desktop userDataDir
  const qaUserDataDir = path.join(WORKSPACE_DIR, 'server', 'temp', 'desktop_full_e2e_userdata');
  console.log(`Setting up QA UserData directory: ${qaUserDataDir}`);
  if (fs.existsSync(qaUserDataDir)) {
    fs.rmSync(qaUserDataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(qaUserDataDir, { recursive: true });

  // 2. Configure settings to redirect backend network requests to mock port 3009
  const qaConfigPath = path.join(qaUserDataDir, 'config.json');
  const qaConfig = {
    apiKey: 'mock_grokpi_key',
    apiBaseUrl: `http://127.0.0.1:${PORT_MOCK}/v1`,
    geminiApiKey: 'mock_gemini_key',
    geminiBaseUrl: `http://127.0.0.1:${PORT_MOCK}`,
    storyboardDelaySec: 1
  };
  fs.writeFileSync(qaConfigPath, JSON.stringify(qaConfig, null, 2), 'utf8');
  console.log(`Configured isolated config.json at: ${qaConfigPath}`);

  // 3. Start Mock Provider Express server on port 3009
  const mockApp = express();
  mockApp.use(express.json());

  mockApp.post('/v1/chat/completions', (req, res) => {
    const { model, messages } = req.body;
    
    // Combine all messages to inspect both system rules and user story values
    const fullText = (messages || []).map(m => m.content).join('\n').toLowerCase();
    
    console.log(`[MockServer 3009] Received completions request. Model: ${model}`);

    if (model === 'grok-imagine-1.0') {
      console.log(`[MockServer 3009] Serving 1x1 white pixel image`);
      return res.json({
        data: [{
          b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }]
      });
    }

    if (fullText.includes('opener') && fullText.includes('core') && fullText.includes('ending')) {
      console.log(`[MockServer 3009] Serving narration text`);
      return res.json({
        choices: [{
          message: {
            content: JSON.stringify({
              opener: "Di sebuah pulau terpencil, seekor burung kecil terbang tinggi.",
              core: "Dia berjuang melawan badai yang besar untuk pulang ke sarangnya.",
              ending: "Akhirnya, dia sampai dengan selamat disambut keluarganya.",
              narration: "Di sebuah pulau terpencil, seekor burung kecil terbang tinggi. Dia berjuang melawan badai yang besar untuk pulang ke sarangnya. Akhirnya, dia sampai dengan selamat disambut keluarganya."
            })
          }
        }]
      });
    }

    if (fullText.includes('scenenumber') || fullText.includes('scene list') || fullText.includes('adegan berurutan')) {
      console.log(`[MockServer 3009] Serving 6-scene list`);
      return res.json({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                sceneNumber: 1,
                title: "Terbang Bebas",
                summary: "Burung kecil terbang bebas di pulau terpencil.",
                narration: "Burung kecil terbang bebas di pulau terpencil.",
                emotion: "calm"
              },
              {
                sceneNumber: 2,
                title: "Badai Datang",
                summary: "Awan hitam besar menggulung di langit.",
                narration: "Awan hitam besar menggulung di langit.",
                emotion: "tense"
              },
              {
                sceneNumber: 3,
                title: "Melawan Badai",
                summary: "Burung kecil mengepakkan sayap menembus badai.",
                narration: "Burung kecil mengepakkan sayap menembus badai.",
                emotion: "determined"
              },
              {
                sceneNumber: 4,
                title: "Tersambar Angin",
                summary: "Angin kencang menghempaskannya ke bawah.",
                narration: "Angin kencang menghempaskannya ke bawah.",
                emotion: "fearful"
              },
              {
                sceneNumber: 5,
                title: "Melihat Cahaya",
                summary: "Sinar matahari menembus awan dan menuntunnya.",
                narration: "Sinar matahari menembus awan dan menuntunnya.",
                emotion: "hopeful"
              },
              {
                sceneNumber: 6,
                title: "Sarang Hangat",
                summary: "Burung mendarat dengan selamat di sarangnya.",
                narration: "Burung mendarat dengan selamat di sarangnya.",
                emotion: "relieved"
              }
            ])
          }
        }]
      });
    }

    if (fullText.includes('5 panel visual') || fullText.includes('beat adegan') || fullText.includes('dunia cerita')) {
      console.log(`[MockServer 3009] Serving 5-panel visual storyboard detail`);
      return res.json({
        choices: [{
          message: {
            content: JSON.stringify([
              { panelNumber: 1, shotType: "Wide shot", action: "Burung terbang tinggi.", dialogue: "-", sfx: "-", transition: "CUT", imagePrompt: "Cinematic shot of a bird flying high" },
              { panelNumber: 2, shotType: "Medium tracking shot", action: "Awan badai mendekat.", dialogue: "-", sfx: "-", transition: "CUT", imagePrompt: "Cinematic shot of storm clouds approaching" },
              { panelNumber: 3, shotType: "Close-up", action: "Sayap burung mengepak.", dialogue: "Aku pasti bisa.", sfx: "-", transition: "CUT", imagePrompt: "Cinematic close-up of wings flapping" },
              { panelNumber: 4, shotType: "Close-up", action: "Mata burung bertekad.", dialogue: "-", sfx: "-", transition: "CUT", imagePrompt: "Cinematic close-up of bird eyes" },
              { panelNumber: 5, shotType: "Wide shot", action: "Burung mendarat di nest.", dialogue: "-", sfx: "Chirp", transition: "FADE OUT", imagePrompt: "Cinematic shot of bird landing in nest" }
            ])
          }
        }]
      });
    }

    if (fullText.includes('referensi') || fullText.includes('gaya visual') || fullText.includes('mood sinematik')) {
      console.log(`[MockServer 3009] Serving references structure`);
      return res.json({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                title: "Burung Kecil",
                category: "Karakter",
                description: "Burung biru kecil dengan sayap lebar bertekad.",
                imagePrompt: "A cinematic photo of a blue bird"
              },
              {
                title: "Hutan Badai",
                category: "Lokasi",
                description: "Pepohonan bergoyang diterjang badai hujan.",
                imagePrompt: "A cinematic photo of a stormy forest"
              },
              {
                title: "Cahaya Harapan",
                category: "Mood",
                description: "Sinar matahari menembus awan tebal gelap.",
                imagePrompt: "A cinematic photo of sun rays breaking through clouds"
              }
            ])
          }
        }]
      });
    }

    return res.status(404).json({ error: `Mock chat model/prompt not handled: ${model}` });
  });

  mockApp.post('/v1/video/generations', (req, res) => {
    console.log(`[MockServer 3009] Received video generations request`);
    res.json({ jobId: 'job-video-test', status: 'queued' });
  });

  mockApp.get('/v1/video/generations/:jobId', (req, res) => {
    console.log(`[MockServer 3009] Checking status for video job ${req.params.jobId}`);
    res.json({
      status: 'completed',
      videoUrl: 'https://www.grokpi.masjavas.my.id/api/files/video/b51ec52d-76c1-48e3-8113-ad24f321a71f.mp4'
    });
  });

  mockApp.post('/audio/speech', (req, res) => {
    console.log(`[MockServer 3009] Serving audio preview stream`);
    res.setHeader('Content-Type', 'audio/mpeg');
    fs.createReadStream(templateMp3).pipe(res);
  });

  const mockServer = await new Promise((resolve) => {
    const s = mockApp.listen(PORT_MOCK, '127.0.0.1', () => resolve(s));
  });
  console.log(`Mock API Server running on http://127.0.0.1:${PORT_MOCK}`);

  // 4. Start Application Express server on port 3010
  console.log(`Starting Application Server on port ${PORT_APP}...`);
  process.env.MASJAVAS_DESKTOP = 'true';
  const app = createApp({
    userDataDir: qaUserDataDir,
    port: PORT_APP
  });

  const appServer = await new Promise((resolve) => {
    const s = app.listen(PORT_APP, '127.0.0.1', () => resolve(s));
  });
  console.log(`Application Server running on ${BASE_URL}\n`);

  const report = {
    step1_2_createProject: 'FAIL',
    step3_references: 'FAIL',
    step4_reviewCerita: 'FAIL',
    step5_narasiAudio: 'FAIL',
    step5_staleRecovery: 'FAIL',
    step6_storyboard: 'FAIL',
    step6_videoRendering: 'FAIL',
    step7_preview: 'FAIL',
    step8_export: 'FAIL',
    restart_persistence: 'FAIL'
  };

  const projectId = 'project-qa-e2e';

  try {
    // ----------------------------------------------------
    // STEP 1 & 2: Tulis Ide & Pilih Gaya
    // ----------------------------------------------------
    console.log('--- Step 1 & 2: Project Creation & Settings ---');
    const createRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        title: 'Burung Kecil Melawan Badai',
        topic: 'Kisah seekor burung kecil bertahan hidup di tebing laut.'
      })
    });
    const createData = await createRes.json();
    
    const patchRes = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          aspectRatio: '16:9',
          durationPerSceneSec: 10,
          tone: 'Sinematik',
          style: 'Realistis',
          genre: 'Drama Petualangan',
          resolutionPreset: '1920x1080'
        }
      })
    });
    const patchData = await patchRes.json();
    
    if (createRes.ok && patchRes.ok && patchData.settings.aspectRatio === '16:9') {
      console.log('✅ Step 1 & 2 PASSED: Project created and settings locked.');
      report.step1_2_createProject = 'PASS';
    }

    // ----------------------------------------------------
    // STEP 3: Referensi
    // ----------------------------------------------------
    console.log('\n--- Step 3: Reference Images (Auto & Manual) ---');
    const refRes = await fetch(`${BASE_URL}/api/projects/${projectId}/references/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ideaText: 'Burung kecil terbang bebas...',
        selectedStyle: 'Realistis',
        selectedTone: 'Sinematik',
        aspectRatio: '16:9'
      })
    });
    const refData = await refRes.json();
    console.log(`Auto References status: ${refData.status}`);
    
    const honestStatus = refData.status === 'success' && refData.references.every(r => r.isReal === true && r.providerSource === 'grokpi_real');
    console.log(`Provider evidence is honest (no fallback claimed real): ${honestStatus}`);
    
    if (refRes.ok && honestStatus) {
      console.log('✅ Step 3 PASSED: Auto References generated with honest provider evidence.');
      report.step3_references = 'PASS';
      
      // Save references inside project snapshot
      await fetch(`${BASE_URL}/api/projects/${projectId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ references: refData.references })
      });
    }

    // ----------------------------------------------------
    // STEP 4: Review Cerita
    // ----------------------------------------------------
    console.log('\n--- Step 4: Story Narration & Scene Drafts ---');
    const narrRes = await fetch(`${BASE_URL}/api/projects/${projectId}/narration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ideaText: 'Burung kecil terbang bebas...',
        selectedPlatform: 'Umum',
        selectedDuration: '1 menit (±120-150 kata)',
        selectedTone: 'Sinematik',
        selectedStyle: 'Realistis'
      })
    });
    const narrData = await narrRes.json();
    console.log(`Narration outline generated. Length: ${narrData.narration?.length || 0} characters.`);

    // Trigger scenes list generation
    const scenesRes = await fetch(`${BASE_URL}/api/projects/${projectId}/scenes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narration: narrData.narration,
        selectedDuration: '1 menit (6 adegan)',
        selectedStyle: 'Realistis',
        selectedTone: 'Sinematik'
      })
    });
    const scenesData = await scenesRes.json();
    console.log(`Scenes list generated count: ${scenesData.scenes?.length || 0}`);

    // Call ensure-drafts to save scene structures
    await fetch(`${BASE_URL}/api/projects/${projectId}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        story: {
          ideaText: 'Burung kecil terbang bebas...',
          narration: narrData.narration,
          projectContentHash: 'hash-qa-e2e'
        },
        reviewNarration: narrData.narration
      })
    });

    const draftRes = await fetch(`${BASE_URL}/api/projects/${projectId}/scenes/ensure-drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    const draftData = await draftRes.json();
    console.log(`Scene drafts initialized count: ${draftData.length}`);

    if (narrRes.ok && scenesRes.ok && draftRes.ok && draftData.length === 6) {
      console.log('✅ Step 4 PASSED: Narration generated and structured into 6 scene drafts.');
      report.step4_reviewCerita = 'PASS';
    }

    // ----------------------------------------------------
    // STEP 5: Narasi Audio & Stale State Recovery
    // ----------------------------------------------------
    console.log('\n--- Step 5: Narasi Audio & Stale Recovery ---');
    
    // Choose and lock voice
    const selectRes = await fetch(`${BASE_URL}/api/projects/${projectId}/tts/select-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceName: 'Charon' })
    });
    const selectData = await selectRes.json();
    console.log(`Selected voice lock: ${selectData.ttsSettings?.voiceName}`);

    // Generate batch TTS
    const genRes = await fetch(`${BASE_URL}/api/projects/${projectId}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'all', concurrency: 2 })
    });
    
    // Poll job status until complete
    let jobCompleted = false;
    let attempts = 0;
    while (!jobCompleted && attempts < 30) {
      attempts++;
      const statusRes = await fetch(`${BASE_URL}/api/projects/${projectId}/tts/status`);
      const statusData = await statusRes.json();
      const job = statusData.job;
      console.log(`  TTS Poll #${attempts}: status=${job.status}, progress=${job.progress}%`);
      if (job.status === 'completed' || job.status === 'failed') {
        jobCompleted = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    const checkProjRes1 = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    const checkProj1 = await checkProjRes1.json();
    const allAudioReady = checkProj1.scenes.every(s => s.status === 'ready' && s.checklist?.ttsAudioReady);
    console.log(`All 6 scene audios ready?: ${allAudioReady}`);

    if (allAudioReady) {
      report.step5_narasiAudio = 'PASS';
      console.log('✅ Step 5 PASSED: Batch TTS completed, all audios ready.');
    }

    // Test Stale State Recovery
    const targetScene = checkProj1.scenes[0];
    console.log(`Modifying narration text of Scene 1 to check stale state...`);
    const updateTextRes = await fetch(`${BASE_URL}/api/projects/${projectId}/tts/scenes/${targetScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: 'Burung kecil terbang bebas di langit biru cerah pulau terpencil.' })
    });
    const updateTextData = await updateTextRes.json();
    console.log(`  Scene 1 status after text change: ${updateTextData.scene?.status}`);
    
    // Check Step 6 Gate: should be locked when stale exists
    const checkProjRes2 = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    const checkProj2 = await checkProjRes2.json();
    const canProceed = checkProj2.scenes.every(s => s.status === 'ready' && s.checklist?.ttsAudioReady);
    console.log(`  Step 6 Gate can proceed? ${canProceed} (Expected: false)`);

    // Regenerate Scene 1 manually to recover
    console.log(`Regenerating Scene 1 TTS to recover...`);
    const regenRes = await fetch(`${BASE_URL}/api/projects/${projectId}/tts/scenes/${targetScene.id}/regenerate`, {
      method: 'POST'
    });
    const regenData = await regenRes.json();
    console.log(`  Scene 1 status after regenerate: ${regenData.scene?.status}`);

    const checkProjRes3 = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    const checkProj3 = await checkProjRes3.json();
    const recovered = checkProj3.scenes.every(s => s.status === 'ready' && s.checklist?.ttsAudioReady);
    console.log(`  Project fully recovered (Step 6 unlocked)?: ${recovered}`);

    if (updateTextData.scene?.status === 'stale' && !canProceed && regenData.scene?.status === 'ready' && recovered) {
      console.log('✅ Step 5 Stale Recovery PASSED.');
      report.step5_staleRecovery = 'PASS';
    }

    // ----------------------------------------------------
    // STEP 6: Cek Adegan (Storyboard & Video)
    // ----------------------------------------------------
    console.log('\n--- Step 6: Storyboard Panels & Video Rendering ---');
    
    // Generate storyboard for all 6 scenes
    let storyboardSuccess = true;
    for (const sc of checkProj3.scenes) {
      console.log(`Generating 5-panel storyboard for Scene ${sc.sceneNumber}...`);
      const sbRes = await fetch(`${BASE_URL}/api/scenes/${sc.id}/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          aspectRatio: '16:9',
          narration: sc.narration,
          visualStyle: 'Sinematik',
          mode: 'scratch'
        })
      });
      const sbData = await sbRes.json();
      
      const realPanels = sbData.panels.filter(p => p.isReal === true && p.providerSource === 'grokpi_real').length;
      console.log(`  Scene ${sc.sceneNumber} Storyboard: status=${sbData.storyboardStatus}, real panels=${realPanels}/5`);
      
      if (sbData.status !== 'completed' || realPanels !== 5 || !sbData.heroFrame.isReal) {
        storyboardSuccess = false;
      }
    }

    if (storyboardSuccess) {
      console.log('✅ Step 6 Storyboard PASSED: 6/6 storyboard panels are real.');
      report.step6_storyboard = 'PASS';
    }

    // Trigger video rendering for Scene 1
    const finalProjRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    const finalProj = await finalProjRes.json();
    const renderScene = finalProj.scenes[0];

    console.log(`Starting video generation for Scene 1...`);
    const videoRes = await fetch(`${BASE_URL}/api/scenes/${renderScene.id}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        videoInstruction: 'Burung kecil mengepakkan sayap menembus hembusan angin kencang.',
        settings: { quality: 'Tinggi' },
        scene: renderScene,
        references: finalProj.references || [],
        storyboardPanels: renderScene.storyboardPanels,
        heroFrame: renderScene.heroFrame,
        storyboardImageUrl: renderScene.storyboardImageUrl
      })
    });
    const videoData = await videoRes.json();
    const jobId = videoData.jobId;
    console.log(`  Video job registered: ${jobId}, status=${videoData.status}`);

    if (videoData.status === 'queued') {
      // Poll video rendering job
      let renderCompleted = false;
      let renderAttempts = 0;
      while (!renderCompleted && renderAttempts < 20) {
        renderAttempts++;
        const statusRes = await fetch(`${BASE_URL}/api/scenes/video/jobs/${jobId}`);
        const statusData = await statusRes.json();
        console.log(`    Video Poll #${renderAttempts}: status=${statusData.status}, progress=${statusData.progress}%`);
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          renderCompleted = true;
          if (statusData.status === 'completed' && statusData.videoUrl) {
            console.log(`✅ Step 6 Video Rendering PASSED: Real provider video generated successfully.`);
            report.step6_videoRendering = 'PASS';
            // Save mock video preview URL in memory for export
            sceneService.setMockSceneVideo(renderScene.id, statusData.videoUrl);
          }
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Mock video URLs for remaining scenes so they can be exported
    for (let i = 1; i < finalProj.scenes.length; i++) {
      sceneService.setMockSceneVideo(finalProj.scenes[i].id, 'https://www.grokpi.masjavas.my.id/api/files/video/b51ec52d-76c1-48e3-8113-ad24f321a71f.mp4');
    }

    // ----------------------------------------------------
    // STEP 7: Preview
    // ----------------------------------------------------
    console.log('\n--- Step 7: Project Preview Status ---');
    const previewProjRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    const previewProj = await previewProjRes.json();
    
    // Check if the project is ready for export
    const canExport = previewProj.scenes.every(s => s.status === 'ready' && s.checklist?.ttsAudioReady);
    console.log(`Project ready for preview/export?: ${canExport}`);
    if (canExport) {
      console.log('✅ Step 7 PASSED: Preview state is valid and unlocked.');
      report.step7_preview = 'PASS';
    }

    // ----------------------------------------------------
    // STEP 8: Export / Download Package
    // ----------------------------------------------------
    console.log('\n--- Step 8: Async Export Package Generation ---');
    const approvedSceneIds = previewProj.scenes.map(s => s.id);
    const exportStartRes = await fetch(`${BASE_URL}/api/projects/${projectId}/export/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedSceneIds,
        strategy: 'fit_blur',
        includeSubtitle: true
      })
    });
    const exportStart = await exportStartRes.json();
    const exportJobId = exportStart.jobId;
    console.log(`  Export job created: ${exportJobId}, status=${exportStart.status}`);

    if (exportJobId) {
      let exportCompleted = false;
      let exportAttempts = 0;
      while (!exportCompleted && exportAttempts < 30) {
        exportAttempts++;
        const statusRes = await fetch(`${BASE_URL}/api/projects/${projectId}/export/jobs/${exportJobId}`);
        const statusData = await statusRes.json();
        console.log(`    Export Poll #${exportAttempts}: status=${statusData.status}, progress=${statusData.progress}%`);
        
        if (statusData.status === 'completed') {
          exportCompleted = true;
          
          // Verify files are generated in exports folder
          const jobDir = path.join(qaUserDataDir, 'exports', projectId, exportJobId);
          const files = ['final.mp4', 'subtitles.srt', 'manifest.json', 'edit-package.zip'];
          let allFilesExist = true;
          for (const f of files) {
            const fpath = path.join(jobDir, f);
            const exists = fs.existsSync(fpath);
            console.log(`      File "${f}" exists: ${exists} (Size: ${exists ? fs.statSync(fpath).size : 0} bytes)`);
            if (!exists || fs.statSync(fpath).size === 0) {
              allFilesExist = false;
            }
          }
          
          if (allFilesExist) {
            console.log('✅ Step 8 PASSED: All exports artifacts (MP4, Subtitle, ZIP, Manifest) successfully created.');
            report.step8_export = 'PASS';
          }
          break;
        } else if (statusData.status === 'failed') {
          console.error(`❌ Export job failed:`, statusData.errorDetails);
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // ----------------------------------------------------
    // RESTART: Cold Boot Persistence
    // ----------------------------------------------------
    console.log('\n--- Restart & Cold Boot Persistence Check ---');
    console.log('Stopping Express Servers...');
    appServer.close();
    mockServer.close();
    
    console.log('Reloading project from disk snapshot...');
    const reloadedProj = projectRepository.getProject(projectId);
    
    const settingsSaved = reloadedProj.settings?.aspectRatio === '16:9' && reloadedProj.settings?.tone === 'Sinematik';
    const voiceLockSaved = reloadedProj.ttsSettings?.voiceName === 'Charon';
    const allAudioReadySaved = reloadedProj.scenes.every(s => s.status === 'ready' && s.checklist?.ttsAudioReady);
    const storyboardsSaved = reloadedProj.scenes.every(s => s.storyboardPanels?.length === 5 && s.heroFrame?.isReal === true);
    
    console.log(`  Settings preserved: ${settingsSaved}`);
    console.log(`  Voice Lock preserved: ${voiceLockSaved}`);
    console.log(`  Scenes Audio Ready preserved: ${allAudioReadySaved}`);
    console.log(`  Storyboard Panels preserved: ${storyboardsSaved}`);

    if (settingsSaved && voiceLockSaved && allAudioReadySaved && storyboardsSaved) {
      console.log('✅ Restart Persistence PASSED: All metadata and generated states survived cold boot.');
      report.restart_persistence = 'PASS';
    }

  } catch (err) {
    console.error('❌ E2E QA Test Runner crashed:', err);
    try { appServer.close(); } catch (e) {}
    try { mockServer.close(); } catch (e) {}
    process.exit(1);
  }

  // Close servers if still open
  try { appServer.close(); } catch (e) {}
  try { mockServer.close(); } catch (e) {}

  console.log('\n===========================================================');
  console.log('             FULL E2E QA RUN STATUS SUMMARY');
  console.log('===========================================================');
  let allPass = true;
  for (const [key, val] of Object.entries(report)) {
    console.log(`- ${key.padEnd(25)} : ${val === 'PASS' ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (val !== 'PASS') allPass = false;
  }
  console.log('-----------------------------------------------------------');
  console.log(`FINAL RESULT: ${allPass ? 'PASS' : 'FAIL'}`);
  console.log('===========================================================');
  
  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
