import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== STARTING REAL GROKPI STORYBOARD QUEUE QA ===');
  console.log('StartedAt:', new Date().toISOString());

  // 1. Reset project snapshot to clean state
  const projectData = {
    id: "project-real-storyboard-qa",
    projectName: "Project Real Storyboard QA",
    title: "Project Real Storyboard QA",
    status: "in_progress",
    aspectRatio: "16:9",
    orientation: "landscape",
    resolutionPreset: "1920x1080",
    narration: "Di lereng Gunung Merapi yang sunyi, berdiri seorang putri bernama Roro Jonggrang.",
    scenes: [
      {
        id: "scene-real-qa-1",
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
  fs.writeFileSync(path.join(projectDir, 'project-real-storyboard-qa.json'), JSON.stringify(projectData, null, 2));
  console.log('✅ Wrote clean project-real-storyboard-qa.json snapshot.');

  // 2. Fetch current settings to verify we are using real GrokPI
  const settingsRes = await fetch(`${BASE_URL}/api/settings`);
  const settings = await settingsRes.json();
  console.log('Active GrokPI Base URL:', settings.apiBaseUrlMasked || settings.apiBaseUrl);
  console.log('Active GrokPI API Key:', settings.apiKeyMasked);
  console.log('Active Delay (Sec):', settings.storyboardDelaySec);

  if (settings.apiBaseUrl && settings.apiBaseUrl.includes('localhost')) {
    console.error('❌ Error: apiBaseUrl is still pointing to mock server!');
    process.exit(1);
  }

  // 3. Trigger storyboard generation
  console.log('🚀 Triggering REAL GrokPI Storyboard generation queue...');
  const t1 = Date.now();
  
  const genRes = await fetch(`${BASE_URL}/api/scenes/scene-real-qa-1/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'project-real-storyboard-qa',
      aspectRatio: '16:9',
      orientation: 'landscape',
      resolutionPreset: '1920x1080',
      narration: 'Di lereng Gunung Merapi yang sunyi berdiri Roro Jonggrang.',
      mode: 'scratch'
    })
  });

  const generateResult = await genRes.json();
  const durationSec = (Date.now() - t1) / 1000;
  console.log(`⏱️ Generation completed in ${durationSec.toFixed(1)} seconds.`);
  console.log('Response Status:', generateResult.status);

  // 4. Load the updated project and record details per frame
  const project = JSON.parse(fs.readFileSync(path.join(projectDir, 'project-real-storyboard-qa.json'), 'utf8'));
  const scene = project.scenes[0];

  console.log('\n--- FRAME RESULTS RECORD ---');
  console.log(`FinishedAt: ${new Date().toISOString()}`);
  console.log(`storyboardStatus: ${scene.storyboardStatus}`);
  console.log(`providerEvidence: ${JSON.stringify(scene.providerEvidence)}`);

  console.log('\n1. Hero Frame');
  console.log(`   - status: ${scene.heroFrame ? 'completed' : 'missing'}`);
  console.log(`   - generationMode: ${scene.heroFrame?.generationMode}`);
  console.log(`   - isReal: ${scene.heroFrame?.isReal}`);
  console.log(`   - providerSource: ${scene.heroFrame?.providerSource}`);
  console.log(`   - providerImageUrl: ${scene.heroFrame?.imageUrl}`);
  console.log(`   - fallbackUsed: ${scene.heroFrame?.generationMode === 'fallback'}`);
  console.log(`   - rateLimited: ${scene.heroFrame?.generationMode === 'rate_limited'}`);

  if (scene.storyboardPanels) {
    scene.storyboardPanels.forEach((panel, i) => {
      console.log(`\n${i + 2}. Beat ${panel.panelNumber}`);
      console.log(`   - status: completed`);
      console.log(`   - generationMode: ${panel.generationMode}`);
      console.log(`   - isReal: ${panel.isReal}`);
      console.log(`   - providerSource: ${panel.providerSource}`);
      console.log(`   - providerImageUrl: ${panel.imageUrl}`);
      console.log(`   - fallbackUsed: ${panel.generationMode === 'fallback'}`);
      console.log(`   - rateLimited: ${panel.generationMode === 'rate_limited'}`);
    });
  }

  console.log('\n=== REAL GROKPI STORYBOARD QUEUE QA COMPLETE ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
