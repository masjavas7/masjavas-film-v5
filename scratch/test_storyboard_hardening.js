import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScenarioA() {
  console.log('\n==================================================');
  console.log('SCENARIO A: All-real queue attempt (12s delay)');
  console.log('==================================================');

  // 1. Reset project snapshot to clean state
  const projectData = {
    id: "project-qa-hardening",
    projectName: "QA Hardening Project",
    title: "QA Hardening Project",
    status: "in_progress",
    aspectRatio: "16:9",
    orientation: "landscape",
    resolutionPreset: "1920x1080",
    narration: "Ini adalah cerita tentang Roro Jonggrang yang sangat hebat di Prambanan.",
    scenes: [
      {
        id: "scene-qa-1",
        sceneNumber: 1,
        title: "Scene 1",
        summary: "Roro Jonggrang berdiri di lereng Merapi.",
        narration: "Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.",
        videoInstruction: "Cinematic visual of Roro Jonggrang on Merapi slopes.",
        videoSettings: {
          duration: 10,
          quality: "Tinggi",
          aspectRatio: "16:9 Widescreen"
        },
        checklist: {},
        references: [],
        storyboardPanels: [],
        heroFrame: null
      }
    ]
  };

  const projectDir = path.join(process.cwd(), 'server', 'data', 'projects');
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  fs.writeFileSync(path.join(projectDir, 'project-qa-hardening.json'), JSON.stringify(projectData, null, 2));
  console.log('✅ Wrote clean project-qa-hardening.json snapshot.');

  // 2. Set settings: storyboardDelaySec = 12s, apiBaseUrl pointing to local mock
  const settingsUpdate = {
    apiKey: 'mock-grokpi-api-key',
    apiBaseUrl: 'http://localhost:3000/api/mock-grokpi/v1',
    storyboardDelaySec: 12
  };
  
  let res = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settingsUpdate)
  });
  let settingsRes = await res.json();
  console.log('✅ Settings updated. Delay =', settingsRes.config?.storyboardDelaySec || 12, 'seconds.');

  // 3. Configure mock grokpi for success
  res = await fetch(`${BASE_URL}/api/mock-grokpi/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ behavior: 'always_success' })
  });
  console.log('✅ Mock GrokPI configured for: always_success.');

  // 4. Generate storyboard real
  console.log('🚀 Generating storyboard real (this will use a sequential delay of 12s per frame)...');
  const startTime = Date.now();
  
  res = await fetch(`${BASE_URL}/api/scenes/scene-qa-1/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'project-qa-hardening',
      aspectRatio: '16:9',
      orientation: 'landscape',
      resolutionPreset: '1920x1080',
      narration: 'Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.',
      mode: 'scratch'
    })
  });

  const generateResult = await res.json();
  const duration = (Date.now() - startTime) / 1000;
  console.log(`⏱️ Generation took ${duration.toFixed(1)} seconds.`);
  
  if (generateResult.status === 'completed') {
    console.log('✅ Storyboard generation completed successfully!');
  } else {
    console.error('❌ Storyboard generation failed:', generateResult);
    throw new Error('Scenario A failed');
  }

  // Verify panels are all real and have URLs
  const project = JSON.parse(fs.readFileSync(path.join(projectDir, 'project-qa-hardening.json'), 'utf8'));
  const scene = project.scenes[0];
  console.log('Status Storyboard:', scene.storyboardStatus);
  console.log('Evidence:', JSON.stringify(scene.providerEvidence));
  
  if (scene.heroFrame.isReal && scene.heroFrame.generationMode === 'real') {
    console.log('✅ Hero frame is REAL');
  } else {
    throw new Error('Hero frame is not REAL');
  }

  for (const panel of scene.storyboardPanels) {
    if (panel.isReal && panel.generationMode === 'real') {
      console.log(`✅ Panel ${panel.panelNumber} is REAL (Image URL: ${panel.imageUrl})`);
    } else {
      throw new Error(`Panel ${panel.panelNumber} is not REAL`);
    }
  }

  console.log('✅ Scenario A verification passed!');
}

async function runScenarioB() {
  console.log('\n==================================================');
  console.log('SCENARIO B: Rate-limit resume scenario');
  console.log('==================================================');

  const projectDir = path.join(process.cwd(), 'server', 'data', 'projects');
  
  // 1. Reset project snapshot
  const projectData = {
    id: "project-qa-hardening",
    projectName: "QA Hardening Project",
    title: "QA Hardening Project",
    status: "in_progress",
    aspectRatio: "16:9",
    orientation: "landscape",
    resolutionPreset: "1920x1080",
    narration: "Ini adalah cerita tentang Roro Jonggrang yang sangat hebat di Prambanan.",
    scenes: [
      {
        id: "scene-qa-1",
        sceneNumber: 1,
        title: "Scene 1",
        summary: "Roro Jonggrang berdiri di lereng Merapi.",
        narration: "Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.",
        videoInstruction: "Cinematic visual of Roro Jonggrang on Merapi slopes.",
        videoSettings: {
          duration: 10,
          quality: "Tinggi",
          aspectRatio: "16:9 Widescreen"
        },
        checklist: {},
        references: [],
        storyboardPanels: [],
        heroFrame: null
      }
    ]
  };
  fs.writeFileSync(path.join(projectDir, 'project-qa-hardening.json'), JSON.stringify(projectData, null, 2));

  // Update settings to use 5 seconds for quicker E2E tests
  await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyboardDelaySec: 5 })
  });

  // 2. Configure mock grokpi to fail with 429 on index 2 (which is beat 2 panel)
  // Index order of framesToProcess:
  // idx 0 -> hero frame
  // idx 1 -> panel 1 (beat 1)
  // idx 2 -> panel 2 (beat 2) [Will trigger 429 rate limit]
  let res = await fetch(`${BASE_URL}/api/mock-grokpi/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ behavior: 'rate_limit_index', failOnIndex: 2 })
  });
  console.log('✅ Mock GrokPI configured for: rate_limit_once at index 2.');

  // 3. Trigger storyboard generation (should fail with 500)
  console.log('🚀 Triggering storyboard generation expecting rate limit at frame 3...');
  try {
    res = await fetch(`${BASE_URL}/api/scenes/scene-qa-1/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'project-qa-hardening',
        aspectRatio: '16:9',
        orientation: 'landscape',
        resolutionPreset: '1920x1080',
        narration: 'Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.',
        mode: 'scratch'
      })
    });
    const errorData = await res.json();
    console.log('Expected error response:', errorData);
  } catch (err) {
    console.log('Caught request exception (as expected):', err.message);
  }

  // 4. Verify intermediate status in project database
  let project = JSON.parse(fs.readFileSync(path.join(projectDir, 'project-qa-hardening.json'), 'utf8'));
  let scene = project.scenes[0];
  console.log('Interim Storyboard Status:', scene.storyboardStatus);
  console.log('Interim Progress:', JSON.stringify(scene.storyboardProgress));

  // Hero frame should be real
  console.log('Hero frame generationMode:', scene.heroFrame.generationMode);
  if (scene.heroFrame.generationMode !== 'real') {
    throw new Error('Hero frame should be real');
  }

  // Panel 1 should be real
  console.log('Panel 1 generationMode:', scene.storyboardPanels[0].generationMode);
  if (scene.storyboardPanels[0].generationMode !== 'real') {
    throw new Error('Panel 1 should be real');
  }

  // Panel 2 should be rate_limited
  console.log('Panel 2 generationMode:', scene.storyboardPanels[1].generationMode);
  if (scene.storyboardPanels[1].generationMode !== 'rate_limited') {
    throw new Error('Panel 2 should be rate_limited');
  }

  // Panel 3, 4, 5 should be waiting
  for (let i = 2; i < 5; i++) {
    console.log(`Panel ${i+1} generationMode:`, scene.storyboardPanels[i].generationMode);
    if (scene.storyboardPanels[i].generationMode !== 'waiting') {
      throw new Error(`Panel ${i+1} should be waiting`);
    }
  }

  const savedImageUrl0 = scene.storyboardPanels[0].imageUrl;
  console.log('Saved Image URL for Panel 1:', savedImageUrl0);

  // 5. Configure mock grokpi to succeed now
  res = await fetch(`${BASE_URL}/api/mock-grokpi/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ behavior: 'always_success' })
  });
  console.log('✅ Mock GrokPI reconfigured for: always_success.');

  // 6. Resume generation
  console.log('🚀 Resuming storyboard generation...');
  res = await fetch(`${BASE_URL}/api/scenes/scene-qa-1/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'project-qa-hardening',
      aspectRatio: '16:9',
      orientation: 'landscape',
      resolutionPreset: '1920x1080',
      narration: 'Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.',
      mode: 'resume'
    })
  });
  const resumeResult = await res.json();
  console.log('Resume Result status:', resumeResult.status);

  // 7. Verify final states
  project = JSON.parse(fs.readFileSync(path.join(projectDir, 'project-qa-hardening.json'), 'utf8'));
  scene = project.scenes[0];

  console.log('Final Storyboard Status:', scene.storyboardStatus);
  console.log('Final Evidence:', JSON.stringify(scene.providerEvidence));

  if (scene.storyboardStatus !== 'Siap dicek') {
    throw new Error('Storyboard should be Siap dicek');
  }

  // Verify panel 1 was not regenerated (URL matches old URL)
  console.log('Verify Panel 1 Image URL stays identical:', scene.storyboardPanels[0].imageUrl === savedImageUrl0);
  if (scene.storyboardPanels[0].imageUrl !== savedImageUrl0) {
    throw new Error('Panel 1 was regenerated but should have been preserved!');
  }

  // Verify all panels are now real
  for (const panel of scene.storyboardPanels) {
    console.log(`Panel ${panel.panelNumber} generationMode:`, panel.generationMode, 'isReal:', panel.isReal);
    if (panel.generationMode !== 'real' || !panel.isReal) {
      throw new Error(`Panel ${panel.panelNumber} failed to convert to real`);
    }
  }

  console.log('✅ Scenario B verification passed!');
}

async function runScenarioC() {
  console.log('\n==================================================');
  console.log('SCENARIO C: Fallback sementara scenario');
  console.log('==================================================');

  const projectDir = path.join(process.cwd(), 'server', 'data', 'projects');
  
  // 1. Reset project snapshot
  const projectData = {
    id: "project-qa-hardening",
    projectName: "QA Hardening Project",
    title: "QA Hardening Project",
    status: "in_progress",
    aspectRatio: "16:9",
    orientation: "landscape",
    resolutionPreset: "1920x1080",
    narration: "Ini adalah cerita tentang Roro Jonggrang yang sangat hebat di Prambanan.",
    scenes: [
      {
        id: "scene-qa-1",
        sceneNumber: 1,
        title: "Scene 1",
        summary: "Roro Jonggrang berdiri di lereng Merapi.",
        narration: "Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.",
        videoInstruction: "Cinematic visual of Roro Jonggrang on Merapi slopes.",
        videoSettings: {
          duration: 10,
          quality: "Tinggi",
          aspectRatio: "16:9 Widescreen"
        },
        checklist: {},
        references: [],
        storyboardPanels: [],
        heroFrame: null
      }
    ]
  };
  fs.writeFileSync(path.join(projectDir, 'project-qa-hardening.json'), JSON.stringify(projectData, null, 2));

  // 2. Trigger fallback storyboard
  console.log('🚀 Triggering fallback storyboard generation...');
  let res = await fetch(`${BASE_URL}/api/scenes/scene-qa-1/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'project-qa-hardening',
      aspectRatio: '16:9',
      orientation: 'landscape',
      resolutionPreset: '1920x1080',
      narration: 'Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.',
      mode: 'fallback_only'
    })
  });
  const fallbackResult = await res.json();
  console.log('Fallback Result status:', fallbackResult.status);

  // 3. Verify fallback database states
  const project = JSON.parse(fs.readFileSync(path.join(projectDir, 'project-qa-hardening.json'), 'utf8'));
  const scene = project.scenes[0];

  console.log('Storyboard Status:', scene.storyboardStatus);
  console.log('Provider Evidence:', JSON.stringify(scene.providerEvidence));

  if (scene.storyboardStatus !== 'Siap (Partial Fallback)') {
    throw new Error('Storyboard status should be Siap (Partial Fallback)');
  }

  if (scene.providerEvidence.realPanels !== 0 || scene.providerEvidence.fallbackPanels !== 5) {
    throw new Error('Provider evidence counts are incorrect for fallback');
  }

  for (const panel of scene.storyboardPanels) {
    console.log(`Panel ${panel.panelNumber} generationMode:`, panel.generationMode, 'isReal:', panel.isReal, 'imageUrl:', panel.imageUrl);
    if (panel.generationMode !== 'fallback' || panel.isReal) {
      throw new Error(`Panel ${panel.panelNumber} should be fallback and isReal false`);
    }
  }

  console.log('✅ Scenario C verification passed!');
}

async function runScenarioD() {
  console.log('\n==================================================');
  console.log('SCENARIO D: Regenerate failed/fallback panels');
  console.log('==================================================');

  // We reuse the fallback state from Scenario C
  // Configure MockGrokPI to succeed
  let res = await fetch(`${BASE_URL}/api/mock-grokpi/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ behavior: 'always_success' })
  });
  console.log('✅ Mock GrokPI configured for: always_success.');

  // Trigger storyboard with resume
  console.log('🚀 Triggering resume to regenerate fallback panels...');
  res = await fetch(`${BASE_URL}/api/scenes/scene-qa-1/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'project-qa-hardening',
      aspectRatio: '16:9',
      orientation: 'landscape',
      resolutionPreset: '1920x1080',
      narration: 'Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.',
      mode: 'resume'
    })
  });
  const resumeResult = await res.json();
  console.log('Resume Result status:', resumeResult.status);

  // Verify database states
  const projectDir = path.join(process.cwd(), 'server', 'data', 'projects');
  const project = JSON.parse(fs.readFileSync(path.join(projectDir, 'project-qa-hardening.json'), 'utf8'));
  const scene = project.scenes[0];

  console.log('Final Storyboard Status:', scene.storyboardStatus);
  console.log('Final Evidence:', JSON.stringify(scene.providerEvidence));

  if (scene.storyboardStatus !== 'Siap dicek') {
    throw new Error('Storyboard should be Siap dicek');
  }

  if (scene.providerEvidence.realPanels !== 5 || scene.providerEvidence.fallbackPanels !== 0) {
    throw new Error('Provider evidence counts are incorrect: all should be real');
  }

  for (const panel of scene.storyboardPanels) {
    console.log(`Panel ${panel.panelNumber} generationMode:`, panel.generationMode, 'isReal:', panel.isReal, 'imageUrl:', panel.imageUrl);
    if (panel.generationMode !== 'real' || !panel.isReal || panel.imageUrl.includes('unsplash')) {
      throw new Error(`Panel ${panel.panelNumber} should be upgraded to real`);
    }
  }

  console.log('✅ Scenario D verification passed!');
}

async function main() {
  console.log('=== STARTING STORYBOARD QUEUE QA SUITE ===');
  try {
    await runScenarioA();
    await runScenarioB();
    await runScenarioC();
    await runScenarioD();
    console.log('\n🎉 ALL QA SCENARIOS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ QA SCENARIO FAILED:', error.message);
    process.exit(1);
  }
}

main();
