/**
 * ffmpeg_smoke_test.js
 * Uji ketersediaan FFmpeg dan simulasi transcoding per strategi rasio.
 * 
 * Jalankan: node scratch/ffmpeg_smoke_test.js
 * Pastikan server berjalan di localhost:3000.
 */

import { execSync, exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

async function runTest(label, fn) {
  console.log(`\n📋 ${label}`);
  try {
    await fn();
  } catch (err) {
    console.error(`  ❌ TEST THREW EXCEPTION: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('       MASJAVAS AI — FFmpeg Smoke Test                  ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);

  // ── Test 1: FFmpeg availability ────────────────────────────────────────
  await runTest('Test 1: FFmpeg Availability Check', async () => {
    try {
      const result = execSync('ffmpeg -version 2>&1', { encoding: 'utf8', timeout: 8000 });
      const hasVersion = result.includes('ffmpeg version');
      check('FFmpeg tersedia di PATH sistem', hasVersion);
      if (hasVersion) {
        const versionMatch = result.match(/ffmpeg version ([^\s]+)/);
        console.log(`  ℹ️  FFmpeg version: ${versionMatch ? versionMatch[1] : 'unknown'}`);
      }
    } catch (err) {
      check('FFmpeg tersedia di PATH sistem', false, err.message);
      console.log(`\n  ⚠️  FFmpeg tidak tersedia. Ini BUKAN ERROR — sistem akan berjalan dalam mode REAL-MVP.`);
      console.log(`  ℹ️  Untuk mengaktifkan FFmpeg stitching, install ffmpeg:`);
      console.log(`      winget install Gyan.FFmpeg`);
      console.log(`      atau download dari https://ffmpeg.org/download.html`);
    }
  });

  // ── Test 2: Backend health ─────────────────────────────────────────────
  await runTest('Test 2: Backend Server Health', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/health');
      const data = await res.json();
      check('Backend server merespons', res.ok, `HTTP ${res.status}`);
      check('Service identifier benar', data.service === 'masjavas-backend-proxy' || data.service === 'MASJAVAS AI API Gateway', JSON.stringify(data));
    } catch (err) {
      check('Backend server merespons', false, err.message);
      console.log('  ⚠️  Pastikan server berjalan: npm run server');
    }
  });

  // ── Test 3: Export route availability ─────────────────────────────────
  await runTest('Test 3: Export Jobs API Route Availability', async () => {
    try {
      // Test with a non-existent project — should get 404 not 500
      const res = await fetch('http://localhost:3000/api/projects/test-nonexistent/export/jobs/nonexistent-job');
      check('Export job GET endpoint merespons', res.status === 404 || res.status === 200, `HTTP ${res.status}`);
      
      if (res.status === 404) {
        const data = await res.json();
        check('404 response memiliki error field', !!data.error, JSON.stringify(data));
        console.log(`  ℹ️  404 Response: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      check('Export job GET endpoint merespons', false, err.message);
    }
  });

  // ── Test 4: Start Export Job ────────────────────────────────────────────
  await runTest('Test 4: Start Async Export Job', async () => {
    try {
      // First create a test project
      const testProjectId = `smoke-test-${Date.now()}`;
      const createRes = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testProjectId,
          title: 'FFmpeg Smoke Test Project',
          topic: 'Uji sistem export'
        })
      });
      
      if (!createRes.ok) {
        check('Create test project', false, `HTTP ${createRes.status}`);
        return;
      }
      
      const project = await createRes.json();
      console.log(`  ℹ️  Test project created: ${project.id}`);
      check('Test project created', !!project.id, JSON.stringify(project));

      // Start export job with dummy scene IDs
      const exportRes = await fetch(`http://localhost:3000/api/projects/${project.id}/export/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedSceneIds: ['scene-smoke-1', 'scene-smoke-2'],
          strategy: 'fit_blur',
          includeSubtitle: true
        })
      });

      check('Export job started (HTTP 202)', exportRes.status === 202, `HTTP ${exportRes.status}`);
      
      if (exportRes.ok || exportRes.status === 202) {
        const jobData = await exportRes.json();
        check('Job response has jobId', !!jobData.jobId, JSON.stringify(jobData));
        check('Job initial status is queued', jobData.status === 'queued', jobData.status);
        console.log(`  ℹ️  Job created: ${jobData.jobId}`);

        // Poll status a few times
        if (jobData.jobId) {
          await new Promise(r => setTimeout(r, 3000)); // Wait 3s for processing to start
          
          const statusRes = await fetch(`http://localhost:3000/api/projects/${project.id}/export/jobs/${jobData.jobId}`);
          check('Export job status GET OK', statusRes.ok, `HTTP ${statusRes.status}`);
          
          if (statusRes.ok) {
            const status = await statusRes.json();
            console.log(`  ℹ️  Job status after 3s: ${status.status} (${status.progress}%)`);
            check('Job status is valid state', 
              ['queued', 'processing', 'completed', 'failed', 'canceled'].includes(status.status),
              status.status
            );

            // Test cancel
            const cancelRes = await fetch(
              `http://localhost:3000/api/projects/${project.id}/export/jobs/${jobData.jobId}/cancel`,
              { method: 'POST' }
            );
            check('Cancel endpoint merespons', cancelRes.ok, `HTTP ${cancelRes.status}`);
            if (cancelRes.ok) {
              const cancelData = await cancelRes.json();
              console.log(`  ℹ️  Cancel response: ${cancelData.status} — ${cancelData.message}`);
            }
          }
        }
      } else {
        const errData = await exportRes.json().catch(() => ({}));
        console.error(`  ℹ️  Export job error response: ${JSON.stringify(errData)}`);
      }
      
      // Cleanup test project
      await fetch(`http://localhost:3000/api/projects/${project.id}`, { method: 'DELETE' }).catch(() => {});
      console.log(`  ℹ️  Test project cleaned up`);

    } catch (err) {
      check('Export job creation', false, err.message);
    }
  });

  // ── Test 5: FFmpeg filter commands validation ──────────────────────────
  await runTest('Test 5: FFmpeg Filter Command Syntax Validation', async () => {
    let ffmpegAvailable = false;
    try {
      execSync('ffmpeg -version 2>&1', { timeout: 5000 });
      ffmpegAvailable = true;
    } catch (_) {
      console.log('  ⏭️  FFmpeg tidak tersedia — melewati uji filter command');
      check('FFmpeg filter validation (skipped - no FFmpeg)', true); // non-blocking
      return;
    }

    if (ffmpegAvailable) {
      const tempDir = path.join(process.cwd(), 'server', 'temp', `ffmpeg-smoke-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const strategies = [
        {
          name: 'fit_blur (16:9)',
          args: [
            '-y',
            '-f', 'lavfi',
            '-i', 'color=c=blue:size=1080x1920:rate=30:duration=2',
            '-lavfi', '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20:10[bg];[0:v]scale=1920:1080:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2',
            '-c:v', 'libx264',
            '-t', '2',
            path.join(tempDir, 'test_blur.mp4')
          ],
          outputFile: path.join(tempDir, 'test_blur.mp4')
        },
        {
          name: 'crop_center (16:9)',
          args: [
            '-y',
            '-f', 'lavfi',
            '-i', 'color=c=green:size=1080x1920:rate=30:duration=2',
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
            '-c:v', 'libx264',
            '-t', '2',
            path.join(tempDir, 'test_crop.mp4')
          ],
          outputFile: path.join(tempDir, 'test_crop.mp4')
        },
        {
          name: 'letterbox (16:9)',
          args: [
            '-y',
            '-f', 'lavfi',
            '-i', 'color=c=red:size=1080x1920:rate=30:duration=2',
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
            '-c:v', 'libx264',
            '-t', '2',
            path.join(tempDir, 'test_letterbox.mp4')
          ],
          outputFile: path.join(tempDir, 'test_letterbox.mp4')
        }
      ];

      for (const strategy of strategies) {
        try {
          await execFileAsync('ffmpeg', strategy.args, { timeout: 30000 });
          const exists = fs.existsSync(strategy.outputFile) && fs.statSync(strategy.outputFile).size > 0;
          check(`FFmpeg ${strategy.name} strategy berhasil`, !!exists);
        } catch (err) {
          check(`FFmpeg ${strategy.name} strategy berhasil`, false, err.message.slice(0, 200));
        }
      }

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`📊 HASIL: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 Semua test LULUS! FFmpeg Export Pipeline siap.');
  } else {
    console.log(`⚠️  ${failed} test perlu perhatian. Lihat log di atas.`);
  }
  console.log(`Selesai: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
