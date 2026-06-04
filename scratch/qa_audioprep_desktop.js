import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../server/app.js';
import { settingsService } from '../server/services/settingsService.js';
import { projectRepository } from '../server/services/projectRepository.js';
import { ttsService } from '../server/services/ttsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = 'c:\\Users\\Masjavas\\Documents\\APLIKASI MASJAVAS FILM V5';
const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Path to a valid local MP3 file to use as a mock template
const templateMp3 = 'C:\\Users\\Masjavas\\AppData\\Roaming\\MASJAVAS AI\\uploads\\tts\\project_qa-desktop-1780306799947_scene_scene-1.mp3';

if (!fs.existsSync(templateMp3)) {
  console.error(`❌ Template MP3 file not found at ${templateMp3}`);
  process.exit(1);
}

// Override generateTts to copy the valid template MP3 file
ttsService.generateTts = async (text, destPath, voiceModel) => {
  console.log(`  [MockTTSService] Mocking generateTts for: "${text.substring(0, 40)}..." -> voice: ${voiceModel}`);
  
  // Ensure the directory exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.copyFileSync(templateMp3, destPath);
  return destPath;
};

async function main() {
  console.log('===========================================================');
  console.log('    STEP 5 AUDIOPREP DESKTOP DESKTOP RUNTIME QA PIPELINE');
  console.log('===========================================================\n');

  // 1. Setup isolated desktop userDataDir
  const qaUserDataDir = path.join(WORKSPACE_DIR, 'server', 'temp', 'desktop_qa_userdata');
  console.log(`Setting up QA UserData directory: ${qaUserDataDir}`);
  if (fs.existsSync(qaUserDataDir)) {
    fs.rmSync(qaUserDataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(qaUserDataDir, { recursive: true });

  // 2. Load API keys from user's actual AppData config or .env to ensure we test with real configurations
  const actualAppDataDir = path.join(process.env.APPDATA || '', 'MASJAVAS AI');
  const actualConfigPath = path.join(actualAppDataDir, 'config.json');
  let actualSettings = {};
  if (fs.existsSync(actualConfigPath)) {
    try {
      actualSettings = JSON.parse(fs.readFileSync(actualConfigPath, 'utf8'));
      console.log('Loaded actual user settings from AppData/Roaming/MASJAVAS AI/config.json');
    } catch (e) {
      console.warn('Could not read user config.json:', e.message);
    }
  }

  // Write config file in our isolated QA dir
  const qaConfigPath = path.join(qaUserDataDir, 'config.json');
  const qaConfig = {
    apiKey: actualSettings.apiKey || process.env.GROKPI_API_KEY || '',
    apiBaseUrl: actualSettings.apiBaseUrl || 'https://www.grokpi.masjavas.my.id/v1',
    geminiApiKey: actualSettings.geminiApiKey || process.env.GEMINI_API_KEY || '',
    geminiBaseUrl: actualSettings.geminiBaseUrl || 'https://generativelanguage.googleapis.com',
    storyboardDelaySec: actualSettings.storyboardDelaySec || 15
  };
  fs.writeFileSync(qaConfigPath, JSON.stringify(qaConfig, null, 2), 'utf8');
  console.log(`Configured isolated config.json at: ${qaConfigPath}`);

  // 3. Initialize test project from project-123.json
  const qaProjectsDir = path.join(qaUserDataDir, 'data', 'projects');
  fs.mkdirSync(qaProjectsDir, { recursive: true });
  const sourceProject = path.join(WORKSPACE_DIR, 'server', 'data', 'projects', 'project-123.json');
  const targetProject = path.join(qaProjectsDir, 'project-qa-test.json');
  
  if (!fs.existsSync(sourceProject)) {
    console.error(`❌ Source project project-123.json does not exist at ${sourceProject}`);
    process.exit(1);
  }

  // Load project-123 data and change its ID to project-qa-test
  const projectData = JSON.parse(fs.readFileSync(sourceProject, 'utf8'));
  projectData.id = 'project-qa-test';
  projectData.title = 'QA Test Roro Jonggrang';
  projectData.projectName = 'QA Test Roro Jonggrang';
  
  // Clear any existing ttsNarration/checklist timing values to make the test realistic
  projectData.scenes.forEach(s => {
    s.ttsNarration = null;
    s.status = 'Siap dicek';
    if (!s.checklist) s.checklist = {};
    s.checklist.ttsAudioReady = false;
    s.checklist.audioTimingReady = false;
  });

  fs.writeFileSync(targetProject, JSON.stringify(projectData, null, 2), 'utf8');
  console.log(`Copied and prepared test project at: ${targetProject}`);

  // 4. Start the Express App programmatically in Desktop mode
  console.log(`Starting Express Gateway on port ${PORT}...`);
  process.env.MASJAVAS_DESKTOP = 'true';
  const app = createApp({
    userDataDir: qaUserDataDir,
    port: PORT
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });
  console.log(`Express Gateway is running on ${BASE_URL}\n`);

  const results = {
    testDate: new Date().toISOString(),
    appPath: 'release/win-unpacked/MASJAVAS AI.exe',
    projectId: 'project-qa-test',
    voiceSelected: '',
    voicePreviewResult: 'FAIL',
    sceneCount: projectData.scenes.length,
    audioReadyCount: 0,
    failedCount: 0,
    staleCount: 0,
    emptyAudioDetectedCount: 0,
    step6GateResult: 'LOCKED',
    persistenceResult: 'FAIL',
    finalResult: 'NEEDS_FIX'
  };

  try {
    // Scenario A: Voice Selection
    console.log('--- Scenario A: Voice Selection & Preview ---');
    
    // Check all voice card metadata
    const voicesRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/voices`);
    const voicesData = await voicesRes.json();
    console.log(`Received ${voicesData.voices?.length} supported voices.`);
    const charonVoice = voicesData.voices.find(v => v.voiceName === 'Charon');
    const aoedeVoice = voicesData.voices.find(v => v.voiceName === 'Aoede');
    
    if (charonVoice && aoedeVoice) {
      console.log('✅ Voices (Charon, Aoede) found in database metadata');
    } else {
      throw new Error('Required voices metadata not returned by server!');
    }

    // Try preview voice (sample 3-5s preview audio)
    console.log('Testing voice preview for Charon...');
    const previewRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/voice-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceName: 'Charon', sampleText: 'Ini adalah contoh suara narator.' })
    });
    const previewData = await previewRes.json();
    if (previewData.ok && previewData.audioUrl) {
      console.log(`✅ Voice preview created: ${previewData.audioUrl} (Duration: ${previewData.durationSec}s)`);
      results.voicePreviewResult = 'PASS';
    } else {
      console.warn('⚠️ Voice preview failed:', previewData);
      results.voicePreviewResult = 'FAIL';
    }

    // Choose voice & lock
    console.log('Selecting and locking voice for project: Charon');
    const selectRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/select-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceName: 'Charon' })
    });
    const selectData = await selectRes.json();
    if (selectData.success && selectData.ttsSettings.voiceName === 'Charon') {
      console.log('✅ Voice locked in project settings: Charon');
      results.voiceSelected = 'Charon';
    } else {
      throw new Error('Failed to select voice!');
    }
    console.log('');

    // Scenario B: Generate Audio & Concurrency
    console.log('--- Scenario B: Generate Audio ---');
    console.log('Triggering batch generation with concurrency: 2...');
    
    const genRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'all', concurrency: 2 })
    });
    const genData = await genRes.json();
    console.log('Batch response:', genData.message);
    
    // Poll job status until complete
    let jobCompleted = false;
    let attempts = 0;
    while (!jobCompleted && attempts < 120) {
      attempts++;
      const statusRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/status`);
      const statusData = await statusRes.json();
      const job = statusData.job;
      
      console.log(`Poll #${attempts}: Status = ${job.status}, Progress = ${job.progress}%, Current = ${job.current}/${job.total}`);
      
      if (job.status === 'completed' || job.status === 'failed') {
        jobCompleted = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Fetch project to check final scene states
    const checkProjRes = await fetch(`${BASE_URL}/api/projects/project-qa-test`);
    const checkProj = await checkProjRes.json();
    
    console.log('\nFinal Scene Statuses:');
    checkProj.scenes.forEach(s => {
      console.log(`  Scene ${s.sceneNumber}: Status=${s.status}, AudioReady=${s.checklist?.ttsAudioReady}, Duration=${s.ttsNarration?.actualAudioDurationSec || 0}s`);
    });
    
    const totalScenes = checkProj.scenes.length;
    const readyScenes = checkProj.scenes.filter(s => s.status === 'ready' && s.checklist?.ttsAudioReady).length;
    const failedScenes = checkProj.scenes.filter(s => s.status === 'failed').length;
    
    results.audioReadyCount = readyScenes;
    results.failedCount = failedScenes;

    // Check Scenario C: Empty Audio Protection
    console.log('\n--- Scenario C: Empty Audio Protection ---');
    let emptyAudioDetected = 0;
    checkProj.scenes.forEach(s => {
      const audioPath = s.ttsNarration?.audioPath;
      if (audioPath) {
        if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size < 10240) {
          emptyAudioDetected++;
          console.warn(`⚠️ Empty/missing audio detected for Scene ${s.sceneNumber}!`);
        }
      } else {
        emptyAudioDetected++;
      }
    });
    results.emptyAudioDetectedCount = emptyAudioDetected;
    console.log(`Empty/missing audio count: ${emptyAudioDetected}`);
    console.log('');

    // Scenario D: Stale Recovery
    console.log('--- Scenario D: Stale Recovery & Step 6 Gate ---');
    const targetScene = checkProj.scenes[0];
    console.log(`Modifying text for Scene ${targetScene.sceneNumber}...`);
    
    // Update narration text -> should mark stale
    const updateTextRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/scenes/${targetScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: 'Ini teks modifikasi untuk pengujian stale state di adegan pertama.' })
    });
    const updateTextData = await updateTextRes.json();
    console.log(`  Scene 1 status after modification: ${updateTextData.scene.status}`);
    
    // Fetch updated project
    const projAfterEditRes = await fetch(`${BASE_URL}/api/projects/project-qa-test`);
    const projAfterEdit = await projAfterEditRes.json();
    
    // Verify Step 6 Gate: check if proceed is possible
    const canProceedAfterEdit = projAfterEdit.scenes.every(s => {
      const tts = s.ttsNarration;
      return s.status === 'ready' && tts && !tts.cutoffDetected && tts.voiceName === 'Charon';
    });
    console.log(`  Step 6 Gate can proceed? ${canProceedAfterEdit} (Expected: false because Scene 1 is stale)`);
    results.step6GateResult = canProceedAfterEdit ? 'UNLOCKED' : 'LOCKED';
    results.staleCount = projAfterEdit.scenes.filter(s => s.status === 'stale').length;

    // Rollback Text test
    console.log('Testing rollback of narration text for Scene 1...');
    const originalText = targetScene.ttsNarration.originalText;
    const rollbackRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/scenes/${targetScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: originalText })
    });
    const rollbackData = await rollbackRes.json();
    console.log(`  Scene 1 status after rollback to original text: ${rollbackData.scene.status} (Expected: ready)`);
    
    // Modify text again and test manual regeneration
    console.log('Modifying text again to test manual regeneration...');
    await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/scenes/${targetScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: 'Teks modifikasi kedua untuk ditest regenerasi tunggal.' })
    });
    
    console.log('Regenerating Scene 1 TTS...');
    const regenRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/scenes/${targetScene.id}/regenerate`, {
      method: 'POST'
    });
    const regenData = await regenRes.json();
    console.log(`  Scene 1 status after manual regenerate: ${regenData.scene.status} (Expected: ready)`);
    console.log('');

    // Scenario E: Voice Override
    console.log('--- Scenario E: Voice Override ---');
    console.log('Changing voice to Aoede (requires all scenes to become stale)...');
    
    const changeVoiceRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/select-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceName: 'Aoede' })
    });
    const changeVoiceData = await changeVoiceRes.json();
    
    const staleCountAfterVoiceChange = changeVoiceData.scenes.filter(s => s.status === 'stale').length;
    console.log(`  Scenes marked stale after voice change: ${staleCountAfterVoiceChange} / ${totalScenes} (Expected: 6)`);
    
    console.log('Regenerating all scenes with the new voice: Aoede...');
    await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'all', concurrency: 2 })
    });
    
    jobCompleted = false;
    attempts = 0;
    while (!jobCompleted && attempts < 120) {
      attempts++;
      const statusRes = await fetch(`${BASE_URL}/api/projects/project-qa-test/tts/status`);
      const statusData = await statusRes.json();
      const job = statusData.job;
      
      console.log(`Poll #${attempts} (Aoede): Status = ${job.status}, Progress = ${job.progress}%`);
      
      if (job.status === 'completed' || job.status === 'failed') {
        jobCompleted = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const finalProjRes = await fetch(`${BASE_URL}/api/projects/project-qa-test`);
    const finalProj = await finalProjRes.json();
    
    const allAoedeReady = finalProj.scenes.every(s => s.status === 'ready' && s.ttsNarration?.voiceName === 'Aoede');
    console.log(`  All scenes ready with Aoede? ${allAoedeReady}`);
    console.log('');

    // Scenario F: Persistence
    console.log('--- Scenario F: Persistence ---');
    console.log('Reading from disk using projectRepository to simulate cold boot...');
    
    const reloadProj = projectRepository.getProject('project-qa-test');
    
    const persistedOk = reloadProj.ttsSettings?.voiceName === 'Aoede' && 
                        reloadProj.scenes.every(s => s.status === 'ready' && s.ttsNarration?.voiceName === 'Aoede' && fs.existsSync(s.ttsNarration.audioPath));
    console.log(`  Data persisted successfully after reload? ${persistedOk}`);
    results.persistenceResult = persistedOk ? 'PASS' : 'FAIL';
    
    // Close Express server
    server.close();
    
    if (results.voicePreviewResult === 'PASS' && 
        results.audioReadyCount === results.sceneCount && 
        results.emptyAudioDetectedCount === 0 && 
        results.persistenceResult === 'PASS' &&
        allAoedeReady) {
      results.finalResult = 'PASS';
    }

    console.log('\n========================= QA SUMMARY =========================');
    console.log(`Voice Selected: ${results.voiceSelected}`);
    console.log(`Voice Preview Result: ${results.voicePreviewResult}`);
    console.log(`Audio Ready: ${results.audioReadyCount}/${results.sceneCount}`);
    console.log(`Failed Count: ${results.failedCount}`);
    console.log(`Stale Count (after text update): ${results.staleCount}`);
    console.log(`Empty Audios: ${results.emptyAudioDetectedCount}`);
    console.log(`Step 6 Gate (during stale): ${results.step6GateResult}`);
    console.log(`Persistence Result: ${results.persistenceResult}`);
    console.log(`FINAL RESULT: ${results.finalResult}`);
    console.log('==============================================================');

  } catch (err) {
    console.error('❌ QA Execution crashed with error:', err);
    server.close();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal crash:', err);
});
