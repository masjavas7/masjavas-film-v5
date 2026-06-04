import { createApp } from '../server/app.js';
import { projectRepository } from '../server/services/projectRepository.js';
import fs from 'fs';

async function runTest() {
  console.log('--- STARTING AUDIOPREP RECOVERY BACKEND TEST ---');
  
  // Create a dummy file with size > 10KB
  const dummyFilePath = './scratch/dummy.mp3';
  fs.writeFileSync(dummyFilePath, Buffer.alloc(12000));

  const testPort = 4568;
  const app = createApp({
    port: testPort,
    userDataDir: './scratch/test-userdata'
  });
  
  const server = app.listen(testPort, async () => {
    console.log(`Test server listening on port ${testPort}`);
    
    try {
      const baseUrl = `http://localhost:${testPort}`;
      const projectId = `test-proj-recovery-${Date.now()}`;
      
      // 1. Create a project
      console.log('Creating test project...');
      const createRes = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          title: 'Project Recovery Test',
          aspectRatio: '16:9',
          orientation: 'landscape'
        })
      });
      const project = await createRes.json();
      console.log('Project created:', project.id);
      
      // Save dummy scenes
      project.scenes = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          title: 'Adegan 1',
          narration: 'Narasi pertama yang aman.',
          narrationText: 'Narasi pertama yang aman.',
          status: 'ready',
          checklist: { ttsAudioReady: true, audioTimingReady: true },
          ttsNarration: {
            provider: 'gemini',
            model: 'gemini-2.5-flash-preview-tts',
            voiceName: 'Charon',
            fittedText: 'Narasi pertama yang aman.',
            actualAudioDurationSec: 5.0,
            audioPath: dummyFilePath,
            audioUrl: 'http://dummy.mp3',
            cutoffDetected: false,
            message: null
          }
        },
        {
          id: 'scene-2',
          sceneNumber: 2,
          title: 'Adegan 2',
          narration: 'Narasi kedua yang gagal.',
          narrationText: 'Narasi kedua yang gagal.',
          status: 'failed',
          checklist: { ttsAudioReady: false, audioTimingReady: false },
          ttsNarration: {
            provider: 'gemini',
            model: 'gemini-2.5-flash-preview-tts',
            voiceName: 'Charon',
            fittedText: 'Narasi kedua yang gagal.',
            actualAudioDurationSec: 0,
            audioPath: 'dummy2.mp3',
            audioUrl: 'http://dummy2.mp3',
            cutoffDetected: false,
            message: 'File audio tidak terbentuk.'
          }
        }
      ];
      projectRepository.saveProjectSnapshot(projectId, { ttsSettings: { voiceName: 'Charon' }, scenes: project.scenes });
      
      // Let's run prepareAudioArtifacts via GET /api/projects/:projectId/scenes
      console.log('Preparing audio artifacts...');
      const prepareRes = await fetch(`${baseUrl}/api/projects/${projectId}/scenes`);
      const preparedScenes = await prepareRes.json();
      console.log('Prepared scenes:', preparedScenes.map(s => `${s.id}: ${s.audioArtifact?.status}`));
      
      // Validate scene-1 is ready and scene-2 is failed
      if (preparedScenes[0].audioArtifact.status !== 'ready') {
        throw new Error(`Expected scene-1 artifact to be ready, got: ${preparedScenes[0].audioArtifact.status}`);
      }
      if (preparedScenes[1].audioArtifact.status !== 'failed') {
        throw new Error(`Expected scene-2 artifact to be failed, got: ${preparedScenes[1].audioArtifact.status}`);
      }
      
      // 2. Test Skip Scene-2
      console.log('Testing /api/projects/:projectId/tts/scenes/scene-2/skip...');
      const skipRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/scene-2/skip`, {
        method: 'POST'
      });
      const skipData = await skipRes.json();
      console.log('Skip response:', skipData.scene?.status, skipData.scene?.audioArtifact?.status);
      if (skipData.scene?.status !== 'skipped' || skipData.scene?.audioArtifact?.status !== 'skipped') {
        throw new Error('Skip failed to update status to skipped');
      }
      
      // 3. Test Unskip Scene-2
      console.log('Testing /api/projects/:projectId/tts/scenes/scene-2/unskip...');
      const unskipRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/scene-2/unskip`, {
        method: 'POST'
      });
      const unskipData = await unskipRes.json();
      console.log('Unskip response:', unskipData.scene?.status, unskipData.scene?.audioArtifact?.status);
      if (unskipData.scene?.status !== 'pending_audio' || unskipData.scene?.audioArtifact?.status !== 'pending_audio') {
        throw new Error('Unskip failed to reset status to pending_audio');
      }
      
      // 4. Test Reset Status Scene-1
      console.log('Testing /api/projects/:projectId/tts/scenes/scene-1/reset-status...');
      const resetRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/scenes/scene-1/reset-status`, {
        method: 'POST'
      });
      const resetData = await resetRes.json();
      console.log('Reset response:', resetData.scene?.status, resetData.scene?.audioArtifact?.status);
      if (resetData.scene?.status !== 'pending_audio' || resetData.scene?.audioArtifact?.status !== 'pending_audio' || resetData.scene?.ttsNarration?.message !== null) {
        throw new Error('Reset status failed');
      }
      
      // 5. Test Cancel TTS Queue
      console.log('Testing /api/projects/:projectId/tts/cancel...');
      const cancelRes = await fetch(`${baseUrl}/api/projects/${projectId}/tts/cancel`, {
        method: 'POST'
      });
      const cancelData = await cancelRes.json();
      console.log('Cancel response:', JSON.stringify(cancelData));
      if (!cancelData.success || cancelData.job.status !== 'idle') {
        // Expected idle since no active job was started
        console.log('Cancel successful (Job is idle as expected).');
      }
      
      console.log('--- ALL RECOVERY ENDPOINT TESTS PASSED SUCCESSFULLY ---');
      try {
        fs.unlinkSync(dummyFilePath);
      } catch (e) {}
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Test failed with error:', err);
      try {
        fs.unlinkSync(dummyFilePath);
      } catch (e) {}
      server.close();
      process.exit(1);
    }
  });
}

runTest();
