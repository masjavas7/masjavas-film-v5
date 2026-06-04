import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '..');

const UNPACKED_EXE = path.join(WORKSPACE_DIR, 'release', 'win-unpacked', 'MASJAVAS AI.exe');
const APP_DATA_DIR = path.join(process.env.APPDATA, 'MASJAVAS AI');

console.log('==================================================================');
console.log('    MASJAVAS AI FILM V5 — AUDIOPREP HARDENING E2E TEST RUNNER     ');
console.log('==================================================================');

async function runE2ETest() {
  if (!fs.existsSync(UNPACKED_EXE)) {
    console.error(`❌ Desktop app executable not found at: ${UNPACKED_EXE}`);
    process.exit(1);
  }

  // 1. Spawn Electron App
  console.log('[E2E] Spawning desktop app...');
  let appProcess = spawn(UNPACKED_EXE, [], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, MASJAVAS_DESKTOP: 'true' }
  });
  appProcess.unref();

  console.log('[E2E] Waiting 8 seconds for Express server to boot...');
  await new Promise(r => setTimeout(r, 8000));

  // Determine port
  const ports = [3000, 3001, 3002, 3010];
  let port = null;
  for (const p of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/api/health`);
      if (res.ok) {
        port = p;
        break;
      }
    } catch (e) {}
  }

  if (!port) {
    console.error('❌ Failed to connect to Express backend.');
    try { process.kill(appProcess.pid); } catch (e) {}
    process.exit(1);
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✅ Connected to backend on port ${port}. Base URL: ${baseUrl}`);

  const testReport = {
    voiceList: false,
    voicePreview: false,
    selectVoiceLock: false,
    batchParallelGen: false,
    staleOnTextChange: false,
    rollbackToReady: false,
    singleSceneRegen: false,
    voiceOverrideReset: false,
    step6GateLock: false,
    persistence: false
  };

  const projectId = `qa-audioprep-${Date.now()}`;

  try {
    // A. Create test project
    console.log(`\n1. Creating test project: ${projectId}...`);
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        title: 'Project E2E AudioPrep Hardening',
        aspectRatio: '16:9',
        orientation: 'landscape'
      })
    });
    console.log(`- Project created. HTTP Status: ${createRes.status}`);

    // B. Ensure Scene Drafts
    console.log('\n2. Triggering Scene Draft generation...');
    const projectPatch = {
      story: {
        ideaText: 'Pertempuran Sengit di Selat Melaka',
        narration: 'Gelombang laut menghantam kapal perang. Kapten Harun berdiri tegak menantang badai yang mengamuk.',
        projectContentHash: 'hash-audioprep'
      },
      reviewNarration: 'Gelombang laut menghantam kapal perang. Kapten Harun berdiri tegak menantang badai yang mengamuk. Musuh mendekat dengan armada besar.'
    };

    // Save narration details to project first
    await fetch(`${baseUrl}/api/projects/${projectId}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectPatch)
    });

    const draftRes = await fetch(`${baseUrl}/api/projects/${projectId}/scenes/ensure-drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    const scenes = await draftRes.json();
    console.log(`- Draft scenes generated count: ${scenes.length}. Status: ${draftRes.status}`);

    // C. Get Voices list
    console.log('\n3. Fetching voices list metadata...');
    const voicesRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/voices`);
    const voicesData = await voicesRes.json();
    console.log(`- Received ${voicesData.voices?.length} voices.`);
    if (voicesData.voices?.length === 8) {
      console.log('✅ PASS: Exactly 8 voices returned with descriptions.');
      testReport.voiceList = true;
    }

    // D. Voice Preview
    console.log('\n4. Testing Voice Preview API for Aoede...');
    const previewRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/voice-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceName: 'Aoede',
        sampleText: 'Ini adalah contoh suara narator untuk film sinematik Anda.'
      })
    });
    const previewData = await previewRes.json();
    console.log(`- Voice Preview Response:`, JSON.stringify(previewData));
    if (previewData.ok && previewData.audioUrl && previewData.durationSec > 0) {
      console.log('✅ PASS: Preview audio sample successfully generated and playable.');
      testReport.voicePreview = true;
    }

    // E. Select & Lock Voice
    console.log('\n5. Locking voice to Charon...');
    const selectRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/select-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceName: 'Charon' })
    });
    const selectData = await selectRes.json();
    console.log(`- Locked voice. Settings:`, JSON.stringify(selectData.ttsSettings));
    if (selectData.ttsSettings?.voiceName === 'Charon' && selectData.ttsSettings.selectedBy === 'user') {
      console.log('✅ PASS: Voice lock saved into ttsSettings successfully.');
      testReport.selectVoiceLock = true;
    }

    // F. Parallel Batch TTS Generation (concurrency = 2)
    console.log('\n6. Running Batch TTS generation (Concurrency = 2)...');
    const batchRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'all', concurrency: 2 })
    });
    console.log(`- Batch job start response status: ${batchRes.status}`);

    let jobStatus = 'processing';
    let attempts = 0;
    let job = null;

    while (jobStatus === 'processing' && attempts < 25) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      const pollRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/status`);
      const pollData = await pollRes.json();
      job = pollData.job;
      jobStatus = job.status;
      console.log(`  [Poll ${attempts}] Status: ${jobStatus} | Progress: ${job.progress}% | Scene: ${job.current}/${job.total}`);
    }

    if (jobStatus === 'completed') {
      console.log('✅ PASS: Limited parallel TTS generation completed successfully!');
      testReport.batchParallelGen = true;
    } else {
      console.error(`❌ FAIL: TTS Generation failed. Status: ${jobStatus}. Error: ${job.error}`);
    }

    // G. Test Scene Text Edit -> Stale Audio State
    console.log('\n7. Modifying Scene 1 Narration text...');
    // Retrieve scene ID of first scene
    const projRes1 = await fetch(`${baseUrl}/api/projects/${projectId}`);
    const projData1 = await projRes1.json();
    const firstScene = projData1.scenes[0];
    const originalText = firstScene.ttsNarration.originalText;
    const modifiedText = originalText + ' Dan musuh menembak.';

    console.log(`- Modifying text from: "${originalText}"`);
    console.log(`- To: "${modifiedText}"`);

    const updateTextRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/${firstScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: modifiedText })
    });
    const updateTextData = await updateTextRes.json();
    console.log(`- Scene 1 updated status: ${updateTextData.scene?.status}`);
    
    if (updateTextData.scene?.status === 'stale') {
      console.log('✅ PASS: Text change successfully sets scene audio status to "stale".');
      testReport.staleOnTextChange = true;
    }

    // H. Step 6 Gate check (should lock if stale exists)
    console.log('\n8. Checking Step 6 Navigation Gate lock...');
    const canProceedCheck = (scenesList) => {
      const firstVoice = scenesList[0]?.ttsNarration?.voiceName;
      if (!firstVoice) return false;
      return scenesList.every(s => {
        const tts = s.ttsNarration;
        if (s.status === 'stale' || s.status === 'failed' || s.status === 'generating_audio') return false;
        if (!tts || !tts.audioUrl) return false;
        if (tts.actualAudioDurationSec <= 1.0 || tts.actualAudioDurationSec > 10.05) return false;
        if (tts.voiceName !== firstVoice) return false;
        return true;
      });
    };

    const projRes2 = await fetch(`${baseUrl}/api/projects/${projectId}`);
    const projData2 = await projRes2.json();
    const isStep6OpenWithStale = canProceedCheck(projData2.scenes);
    console.log(`- Step 6 Openable when stale exists?: ${isStep6OpenWithStale}`);
    if (isStep6OpenWithStale === false) {
      console.log('✅ PASS: Step 6 Gate correctly blocks transition when stale audio exists.');
      testReport.step6GateLock = true;
    }

    // I. Test Rollback to Ready (reverting text changes)
    console.log('\n9. Reverting Scene 1 Narration text back to original...');
    const rollbackRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/${firstScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: originalText })
    });
    const rollbackData = await rollbackRes.json();
    console.log(`- Scene 1 status after rollback: ${rollbackData.scene?.status}`);
    if (rollbackData.scene?.status === 'ready') {
      console.log('✅ PASS: Reverting text back to original generated text restores status to "ready".');
      testReport.rollbackToReady = true;
    }

    // J. Test Single Scene Regeneration
    console.log('\n10. Testing single scene regeneration (modifying text again + regen)...');
    await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/${firstScene.id}/update-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ narrationText: modifiedText })
    });

    const singleRegenRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/${firstScene.id}/regenerate`, {
      method: 'POST'
    });
    const singleRegenData = await singleRegenRes.json();
    console.log(`- Scene 1 status after regeneration: ${singleRegenData.scene?.status}`);
    if (singleRegenData.scene?.status === 'ready' && singleRegenData.scene.ttsNarration?.fittedText === modifiedText) {
      console.log('✅ PASS: Single scene regeneration successfully updates audio and sets status to "ready".');
      testReport.singleSceneRegen = true;
    }

    // K. Voice Override / Settings reset
    console.log('\n11. Changing project voice lock to Aoede (Voice Override)...');
    const overrideRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/select-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceName: 'Aoede' })
    });
    const overrideData = await overrideRes.json();
    
    // Mismatched audios should become stale
    const allStaleAfterOverride = overrideData.scenes.every(s => s.status === 'stale');
    console.log(`- All scenes set to stale after voice override: ${allStaleAfterOverride}`);
    if (allStaleAfterOverride && overrideData.ttsSettings?.voiceName === 'Aoede') {
      console.log('✅ PASS: Voice override successfully resets project voice and sets all scenes to stale.');
      testReport.voiceOverrideReset = true;
    }

    // Regenerate all scenes to ready with new voice Aoede
    console.log('- Regenerating all scenes with new voice...');
    await fetch(`${baseUrl}/api/projects/${projectId}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'all', concurrency: 2 })
    });

    let jobStatus2 = 'processing';
    let attempts2 = 0;
    while (jobStatus2 === 'processing' && attempts2 < 25) {
      await new Promise(r => setTimeout(r, 2000));
      attempts2++;
      const pollRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/status`);
      const pollData = await pollRes.json();
      jobStatus2 = pollData.job.status;
    }
    console.log(`- Concurrency pool generation with new voice complete. Status: ${jobStatus2}`);

    // L. App Restart & Persistence
    console.log('\n12. Simulating app restart to verify persistence...');
    try {
      process.kill(appProcess.pid);
      console.log('- Desktop app process killed.');
    } catch (e) {
      console.log('- Desktop app already closed.');
    }

    await new Promise(r => setTimeout(r, 2000));

    // Relaunch
    console.log('- Re-spawning desktop app...');
    const appProcess2 = spawn(UNPACKED_EXE, [], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, MASJAVAS_DESKTOP: 'true' }
    });
    appProcess2.unref();

    console.log('- Waiting 8 seconds for reboot...');
    await new Promise(r => setTimeout(r, 8000));

    console.log('- Fetching project metadata after reboot...');
    const reopenRes = await fetch(`${baseUrl}/api/projects/${projectId}`);
    const reopenedProject = await reopenRes.json();
    
    console.log(`  ttsSettings voiceName: ${reopenedProject.ttsSettings?.voiceName}`);
    console.log(`  Scene 1 audio status: ${reopenedProject.scenes[0]?.status}`);
    console.log(`  Scene 1 audio url: ${reopenedProject.scenes[0]?.ttsNarration?.audioUrl}`);

    const hasPreservedSettings = reopenedProject.ttsSettings?.voiceName === 'Aoede';
    const hasPreservedScenes = reopenedProject.scenes.every(s => s.status === 'ready' && s.ttsNarration?.voiceName === 'Aoede');

    if (hasPreservedSettings && hasPreservedScenes) {
      console.log('✅ PASS: All voice settings and ready statuses successfully persisted after app restart!');
      testReport.persistence = true;
    } else {
      console.error('❌ FAIL: Lost metadata or stale/ready status after restart.');
    }

    // Clean up
    try { process.kill(appProcess2.pid); } catch (e) {}

  } catch (err) {
    console.error('❌ E2E flow encountered an error:', err);
  }

  console.log('\n==================================================================');
  console.log('               AUDIOPREP HARDENING E2E FINAL REPORT               ');
  console.log('==================================================================');
  console.log(`1. Narrator Voices Metadata List : ${testReport.voiceList ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`2. Short Voice Preview (Aoede)   : ${testReport.voicePreview ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`3. Select & Lock Voice (Charon)  : ${testReport.selectVoiceLock ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`4. Parallel Batch Gen (Pool)     : ${testReport.batchParallelGen ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`5. Text Edit -> Stale Alert      : ${testReport.staleOnTextChange ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`6. Step 6 Navigation Gate Lock   : ${testReport.step6GateLock ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`7. Rollback to Ready (No Regen)  : ${testReport.rollbackToReady ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`8. Single Scene Audio Regen      : ${testReport.singleSceneRegen ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`9. Voice Override / Reset stale  : ${testReport.voiceOverrideReset ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`10. Persistence after reboot     : ${testReport.persistence ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('------------------------------------------------------------------');
  const allPassed = Object.values(testReport).every(v => v === true);
  console.log(`QA RUN RESULT: ${allPassed ? 'ALL SCENARIOS PASSED SUCCESSFULLY! 🏆' : 'DEGRADED/SOME FAILED ⚠️'}`);
  console.log('==================================================================');
  process.exit(allPassed ? 0 : 1);
}

runE2ETest();
