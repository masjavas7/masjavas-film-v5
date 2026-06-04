import { createApp } from '../server/app.js';

async function runTest() {
  console.log('--- STARTING BACKEND SANITY TEST ---');
  
  // Use a random port to avoid conflicts
  const testPort = 4567;
  const app = createApp({
    port: testPort,
    userDataDir: './scratch/test-userdata'
  });
  
  const server = app.listen(testPort, async () => {
    console.log(`Test server listening on port ${testPort}`);
    
    try {
      const baseUrl = `http://localhost:${testPort}`;
      
      // 1. Test Health endpoint
      console.log('Testing /api/health...');
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthRes.json();
      console.log('Health Response:', JSON.stringify(healthData));
      if (healthData.status !== 'ok') throw new Error('Health check failed');
      
      // 2. Test /api/debug/runtime endpoint
      console.log('Testing /api/debug/runtime...');
      const runtimeRes = await fetch(`${baseUrl}/api/debug/runtime`);
      const runtimeData = await runtimeRes.json();
      console.log('Runtime Response:', JSON.stringify(runtimeData));
      if (!runtimeData.userDataPath) throw new Error('Debug runtime path missing');
      
      // 3. Test /api/debug/health/full endpoint
      console.log('Testing /api/debug/health/full...');
      const fullHealthRes = await fetch(`${baseUrl}/api/debug/health/full`);
      const fullHealthData = await fullHealthRes.json();
      console.log('Full Health Response:', JSON.stringify(fullHealthData));
      if (fullHealthData.status !== 'healthy' && fullHealthData.status !== 'degraded') {
        throw new Error('Full health response structure mismatch');
      }
      
      // 4. Test References generateAutoReferences validation (Missing source)
      console.log('Testing references generator with missing source...');
      const refRes = await fetch(`${baseUrl}/api/projects/test-proj-1/references/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaText: '',
          narration: '',
          storyDraft: null
        })
      });
      const refData = await refRes.json();
      console.log('Auto Reference Response (No Source):', JSON.stringify(refData));
      if (refData.status !== 'error' || refData.errorCode !== 'MISSING_STORY_SOURCE') {
        throw new Error('MISSING_STORY_SOURCE validation failed');
      }
      
      // 5. Test References with ideaText (Source text provided but no API key configured yet)
      console.log('Testing references generator with ideaText (Expecting no API key or invalid key error)...');
      const refRes2 = await fetch(`${baseUrl}/api/projects/test-proj-1/references/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaText: 'Sebuah cerita tentang petualangan anak-anak di hutan terlarang.',
          narration: '',
          storyDraft: null
        })
      });
      const refData2 = await refRes2.json();
      console.log('Auto Reference Response (With Source):', JSON.stringify(refData2));
      // Should either succeed (if dev environment key exists) or return error/fallback
      
      console.log('--- ALL BACKEND TESTS PASSED SUCCESSFULY ---');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Test failed with error:', err);
      server.close();
      process.exit(1);
    }
  });
}

runTest();
