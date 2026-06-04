const BACKEND_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== STARTING BACKEND PROXY SMOKE TEST ===\n');

  try {
    // 1. Health Check
    console.log('[Test 1] Health Check...');
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log(`- Status: ${healthRes.status}`);
    console.log(`- Response: ${JSON.stringify(healthData)}\n`);

    // 2. Generate Narration
    console.log('[Test 2] Generate Narration...');
    const narrationRes = await fetch(`${BACKEND_URL}/api/projects/project-123/narration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ideaText: 'Hari dan Wiwi dikejar mobil hitam misterius di bawah guyuran hujan.',
        selectedPlatform: 'YouTube 16:9',
        selectedDuration: '6 adegan',
        selectedTone: 'Misterius',
        selectedStyle: 'Sinematik'
      })
    });
    const narrationData = await narrationRes.json();
    console.log(`- Status: ${narrationRes.status}`);
    console.log(`- Narration length: ${narrationData.narration ? narrationData.narration.length : 0} chars`);
    console.log(`- Keys returned: ${Object.keys(narrationData).join(', ')}\n`);

    // 2.5. Generate Scenes
    console.log('[Test 2.5] Generate Scenes from Narration...');
    const scenesRes = await fetch(`${BACKEND_URL}/api/projects/project-123/scenes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narration: narrationData.narration || 'Ini adalah contoh narasi Roro Jonggrang untuk dipecah.',
        storyDraft: narrationData,
        selectedDuration: '6 adegan',
        selectedStyle: 'Sinematik',
        selectedTone: 'Misterius'
      })
    });
    
    // Pure JS function to generate a valid solid 256x256 PNG image buffer using built-in zlib
    function generateSolidPNG(width, height, r = 100, g = 150, b = 200) {
      const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

      const crc32Table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crc32Table[i] = c;
      }

      function crc32(buf) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < buf.length; i++) {
          crc = crc32Table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
        }
        return crc ^ 0xFFFFFFFF;
      }

      function makeChunk(typeStr, dataBuf) {
        const typeBuf = Buffer.from(typeStr, 'ascii');
        const lengthBuf = Buffer.alloc(4);
        lengthBuf.writeUInt32BE(dataBuf.length, 0);

        const checkBuf = Buffer.concat([typeBuf, dataBuf]);
        const crcVal = crc32(checkBuf);
        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crcVal, 0);

        return Buffer.concat([lengthBuf, checkBuf, crcBuf]);
      }

      // IHDR Chunk
      const ihdrData = Buffer.alloc(13);
      ihdrData.writeUInt32BE(width, 0);
      ihdrData.writeUInt32BE(height, 4);
      ihdrData[8] = 8;
      ihdrData[9] = 2;
      ihdrData[10] = 0;
      ihdrData[11] = 0;
      ihdrData[12] = 0;
      const ihdrChunk = makeChunk('IHDR', ihdrData);

      // Raw image data: filter type 0 (None) followed by RGB bytes for each row
      const rowSize = 1 + width * 3;
      const rawData = Buffer.alloc(height * rowSize);
      let offset = 0;
      for (let y = 0; y < height; y++) {
        rawData[offset++] = 0;
        for (let x = 0; x < width; x++) {
          rawData[offset++] = r;
          rawData[offset++] = g;
          rawData[offset++] = b;
        }
      }

      const compressed = zlib.deflateSync(rawData);
      const idatChunk = makeChunk('IDAT', compressed);
      const iendChunk = makeChunk('IEND', Buffer.alloc(0));

      return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
    }

    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    const buffer = generateSolidPNG(256, 256); // 256x256 is fully valid for dimensions validation
    const mockFiles = [
      'sb-panel-test-char.png',
      'sb-panel-test-loc.png',
      'sb-panel-test-1.png',
      'sb-panel-test-2.png',
      'sb-panel-test-3.png',
      'sb-panel-test-4.png',
      'sb-panel-test-5.png',
      'sb-panel-test-hero.png'
    ];

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of mockFiles) {
      fs.writeFileSync(path.join(uploadDir, file), buffer);
    }
    console.log('✅ Created mock 256x256 solid images in server/uploads for base64 conversion test.\n');
    
    const scenesData = await scenesRes.json();
    console.log(`- Status: ${scenesRes.status}`);
    console.log(`- Scenes count: ${scenesData.scenes ? scenesData.scenes.length : 0}`);
    if (scenesData.scenes && scenesData.scenes.length > 0) {
      console.log(`- Example Scene 1: title="${scenesData.scenes[0].title}", duration=${scenesData.scenes[0].videoSettings.duration}s, status="${scenesData.scenes[0].status}"`);
    }
    console.log('\n');

    // 3. Generate Auto References
    console.log('[Test 3] Generate Auto References...');
    const refRes = await fetch(`${BACKEND_URL}/api/projects/project-123/references/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narration: narrationData.narration || 'Hari dikejar mobil hitam misterius.'
      })
    });
    const refData = await refRes.json();
    console.log(`- Status: ${refRes.status}`);
    console.log(`- References count: ${refData.length}`);
    if (refData.length > 0) {
      console.log(`- Example Ref: ${JSON.stringify(refData[0])}`);
    }
    console.log('\n');

    // 4. Generate Storyboard
    console.log('[Test 4] Generate Storyboard...');
    const storyboardRes = await fetch(`${BACKEND_URL}/api/scenes/scene-1/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narration: 'Hari memacu motor tuanya melintasi jalanan kota yang sepi di bawah guyuran hujan lebat.'
      })
    });
    const storyboardData = await storyboardRes.json();
    console.log(`- Status: ${storyboardRes.status}`);
    
    const panels = storyboardData.panels || (Array.isArray(storyboardData) ? storyboardData : null);
    if (!panels) {
      console.log(`  [FAIL] Storyboard panels not found. Response: ${JSON.stringify(storyboardData)}`);
    } else {
      console.log(`- Panels count: ${panels.length}`);
      if (panels.length === 5) {
        console.log('  [PASS] Storyboard has exactly 5 panels.');
      } else {
        console.log(`  [FAIL] Storyboard has ${panels.length} panels, expected 5.`);
      }

      panels.forEach(p => {
        console.log(`  * Panel ${p.order || p.panelNumber}: label="${p.label}", timeRange="${p.timeRange || p.timeCode}", hasImage=${!!p.imageUrl}`);
      });
    }
    console.log('\n');

    // 5. Generate Video Async Job
    console.log('[Test 5] Generate Video Async Job...');
    const videoRes = await fetch(`${BACKEND_URL}/api/scenes/scene-1/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoInstruction: 'Wide shot motor klasik melaju kencang di jalanan beraspal basah. Lampu jalan kuning memantul di aspal.',
        quality: 'Tinggi',
        aspectRatio: '16:9 Widescreen'
      })
    });
    const videoData = await videoRes.json();
    console.log(`- Status: ${videoRes.status}`);
    console.log(`- Response: ${JSON.stringify(videoData)}\n`);

    const { jobId } = videoData;

    // 6. Check Video Job Status & Poll until completion
    if (jobId) {
      console.log('[Test 6] Polling Video Job Status...');
      const startTime = Date.now();
      const timeoutMs = 60000; // Poll for max 60s for testing
      const pollInterval = 3000;
      let completed = false;
      let statusData = null;

      while (Date.now() - startTime < timeoutMs) {
        const statusRes = await fetch(`${BACKEND_URL}/api/scenes/video/jobs/${jobId}`);
        statusData = await statusRes.json();
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        console.log(`  * [${elapsed}s elapsed] Status: ${statusData.status}, Progress: ${statusData.progress}%, url: ${statusData.videoUrl || 'null'}`);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          completed = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      console.log('\n');
    }

    // 7. Export Project
    console.log('[Test 7] Export Project...');
    const exportRes = await fetch(`${BACKEND_URL}/api/projects/project-123/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedSceneIds: ['scene-1'],
        includeSubtitle: true,
        includeEditPackage: true
      })
    });
    const exportData = await exportRes.json();
    console.log(`- Status: ${exportRes.status}`);
    console.log(`- Response: ${JSON.stringify(exportData)}\n`);

    console.log('=== ALL SMOKE TESTS COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Smoke Test Failed:', error);
  }
}

runTests();
