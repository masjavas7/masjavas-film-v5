/**
 * MASJAVAS FILM V5 — GrokPI Real Media Pipeline Retest Script
 * 
 * Modul otomatisasi pengujian untuk memverifikasi jalur media nyata (REAL):
 * 1. Reference Image Real Test
 * 2. Storyboard Real Test
 * 3. Video Real Test
 * 4. Full End-to-End Mappings
 * 
 * Jalankan perintah berikut saat kuota GrokPI Anda tersedia:
 * node scratch/qa_grokpi_real_media_retest.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolusi directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '..');

// Import modul backend dari workspace
const referenceServicePath = path.join(WORKSPACE_DIR, 'server', 'services', 'referenceService.js');
const sceneServicePath = path.join(WORKSPACE_DIR, 'server', 'services', 'sceneService.js');
const settingsServicePath = path.join(WORKSPACE_DIR, 'server', 'services', 'settingsService.js');
const ttsServicePath = path.join(WORKSPACE_DIR, 'server', 'services', 'ttsService.js');
const narrationFitServicePath = path.join(WORKSPACE_DIR, 'server', 'services', 'narrationFitService.js');

async function main() {
  console.log('==================================================================');
  console.log('   MASJAVAS AI FILM V5 — GROKPI REAL MEDIA PIPELINE RETEST PLAN   ');
  console.log('==================================================================');
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log(`Workspace: ${WORKSPACE_DIR}\n`);

  // Load services
  const { referenceService } = await import(`file://${referenceServicePath}`);
  const { sceneService } = await import(`file://${sceneServicePath}`);
  const { settingsService } = await import(`file://${settingsServicePath}`);
  const { ttsService } = await import(`file://${ttsServicePath}`);
  const { generateFittedTts } = await import(`file://${narrationFitServicePath}`);

  const settings = settingsService.getSettings();
  console.log(`GrokPI Key Configured: ${settings.apiKey ? '✅ YES' : '❌ NO'}`);
  console.log(`Gemini Key Configured: ${settings.geminiApiKey ? '✅ YES' : '❌ NO'}`);
  console.log(`Gemini Base URL: ${settings.geminiBaseUrl || 'default'}\n`);

  if (!settings.apiKey) {
    console.error('❌ Batal: Kunci akses GrokPI belum disetting di config.json/env.');
    process.exit(1);
  }

  const results = {
    step1_references: { passed: false, details: null },
    step2_storyboard: { passed: false, details: null },
    step3_video: { passed: false, details: null },
    step4_tts: { passed: false, details: null }
  };

  const testProjectId = `retest-${Date.now()}`;
  const testSceneId = `scene-retest-${Date.now()}`;
  const baseUrl = 'http://localhost:3000';

  // ==================================================================
  // STAGE 1: Reference Image Real Test
  // ==================================================================
  console.log('------------------------------------------------------------------');
  console.log('STAGE 1: Reference Image Real Test');
  console.log('------------------------------------------------------------------');
  try {
    const testNarration = "Sultan Mehmed tersenyum melihat pasukan Ottoman siap menyerang gerbang Konstantinopel.";
    console.log(`Generating references from narration: "${testNarration}"...`);
    
    const refRes = await referenceService.generateAutoReferences(testProjectId, testNarration, baseUrl);
    
    console.log(`  -> Status: ${refRes.status}`);
    console.log(`  -> References count: ${refRes.references?.length || 0}`);
    
    if (refRes.references && refRes.references.length > 0) {
      refRes.references.forEach((ref, idx) => {
        console.log(`     [Ref ${idx + 1}] Title: "${ref.title}" | isReal: ${ref.isReal} | Source: ${ref.providerSource}`);
        console.log(`           URL: ${ref.imageUrl}`);
      });

      const allReal = refRes.references.every(r => r.isReal === true);
      if (allReal) {
        console.log('\n✅ STAGE 1 PASSED: Semua referensi gambar real terbuat dari GrokPI!');
        results.step1_references.passed = true;
      } else {
        console.log('\n⚠️ STAGE 1 PARTIAL: Beberapa referensi menggunakan fallback.');
      }
      results.step1_references.details = refRes;
    } else {
      console.log('\n❌ STAGE 1 FAILED: Tidak ada referensi yang dihasilkan.');
      results.step1_references.details = refRes;
    }
  } catch (err) {
    console.error('\n❌ STAGE 1 ERROR:', err.message);
  }
  console.log('');

  // ==================================================================
  // STAGE 2: Storyboard Real Test
  // ==================================================================
  console.log('------------------------------------------------------------------');
  console.log('STAGE 2: Storyboard Real Test');
  console.log('------------------------------------------------------------------');
  try {
    const testNarration = "Derap ribuan tentara Ottoman menggelegar di malam pekat Bosporus, membawa mimpi penaklukan Konstantinopel.";
    console.log(`Generating storyboard from narration: "${testNarration}"...`);
    
    const sbRes = await sceneService.generateStoryboard(testSceneId, {
      projectId: testProjectId,
      aspectRatio: '16:9',
      orientation: 'landscape',
      resolutionPreset: '1280x720',
      narration: testNarration,
      visualStyle: 'Sinematik',
      durationSec: 10
    }, baseUrl);

    console.log(`  -> Status: ${sbRes.status}`);
    console.log(`  -> StoryboardStatus: ${sbRes.storyboardStatus}`);
    console.log(`  -> HeroFrame URL: ${sbRes.heroFrame?.imageUrl}`);
    console.log(`  -> HeroFrame isReal: ${sbRes.heroFrame?.isReal}`);
    console.log(`  -> Panels count: ${sbRes.panels?.length || 0}`);

    if (sbRes.panels && sbRes.panels.length > 0) {
      sbRes.panels.slice(0, 3).forEach((panel, idx) => {
        console.log(`     [Panel ${panel.panelNumber}] Action: "${panel.action.substring(0, 45)}..." | isReal: ${panel.isReal} | Source: ${panel.providerSource}`);
        console.log(`               URL: ${panel.imageUrl}`);
      });

      const allPanelsReal = sbRes.panels.every(p => p.isReal === true);
      const heroReal = sbRes.heroFrame?.isReal === true;

      if (allPanelsReal && heroReal) {
        console.log('\n✅ STAGE 2 PASSED: Hero frame dan semua panel storyboard real terbuat dari GrokPI!');
        results.step2_storyboard.passed = true;
      } else {
        console.log('\n⚠️ STAGE 2 PARTIAL: Storyboard menggunakan fallback.');
      }
      results.step2_storyboard.details = sbRes;
    } else {
      console.log('\n❌ STAGE 2 FAILED: Gagal menyusun panel storyboard.');
      results.step2_storyboard.details = sbRes;
    }
  } catch (err) {
    console.error('\n❌ STAGE 2 ERROR:', err.message);
  }
  console.log('');

  // ==================================================================
  // STAGE 3: Video Real Test (Async Queue & Sterility Check)
  // ==================================================================
  console.log('------------------------------------------------------------------');
  console.log('STAGE 3: Video Real Test');
  console.log('------------------------------------------------------------------');
  try {
    // We will build a package that can successfully generate a video
    const refs = results.step1_references.details?.references || [];
    const panels = results.step2_storyboard.details?.panels || [];
    const heroFrame = results.step2_storyboard.details?.heroFrame;
    const storyboardImageUrl = results.step2_storyboard.details?.storyboardImageUrl;

    if (panels.length === 0) {
      console.log('⚠️ Melewati Stage 3: Membutuhkan data storyboard dari Stage 2 untuk rendering video.');
    } else {
      console.log('Creating Video generation job via ScenePromptPackage pipeline...');
      const jobRes = await sceneService.createVideoJob(testSceneId, {
        projectId: testProjectId,
        videoInstruction: "Tembok raksasa Konstantinopel dibombardir artileri berat Ottoman di malam badai pekat.",
        settings: { quality: 'Tinggi' },
        scene: {
          narration: "Pasukan Ottoman berdiri tegak menatap Konstantinopel.",
          summary: "Pengepungan kota Konstantinopel oleh Ottoman.",
          goal: "Mendramatisasi kemenangan Mehmed.",
          dialogue: ""
        },
        references: refs,
        storyboardPanels: panels,
        heroFrame,
        storyboardImageUrl
      });

      console.log(`  -> JobId: ${jobRes.jobId}`);
      console.log(`  -> Status: ${jobRes.status}`);
      console.log(`  -> Sterile Prompt: ${jobRes.validation?.passed ? '✅ YES' : '❌ NO'}`);
      console.log(`  -> Violations found: ${jobRes.validation?.errors?.length || 0}`);
      
      if (jobRes.jobId) {
        console.log('Polling video job queue status (Waiting up to 45s)...');
        let jobStatus = jobRes.status;
        let attempts = 0;
        let finalJobData = null;

        while ((jobStatus === 'queued' || jobStatus === 'processing') && attempts < 9) {
          await new Promise(r => setTimeout(r, 5000));
          attempts++;
          const check = await sceneService.getJobStatus(jobRes.jobId);
          jobStatus = check.status;
          finalJobData = check;
          console.log(`     [Poll ${attempts}] Status: ${check.status} | Progress: ${check.progress}%`);
        }

        if (jobStatus === 'completed' && finalJobData?.videoUrl) {
          const PLACEHOLDER_BLOCKLIST = ['w3schools.com', 'mov_bbb.mp4', 'big_buck_bunny', 'sample-videos.com', 'placeholder', 'template'];
          const isPlaceholder = PLACEHOLDER_BLOCKLIST.some(b => finalJobData.videoUrl.toLowerCase().includes(b));
          
          if (!isPlaceholder) {
            console.log(`\n✅ STAGE 3 PASSED: Video real terbuat sukses oleh GrokPI!`);
            console.log(`   Video URL: ${finalJobData.videoUrl}`);
            results.step3_video.passed = true;
          } else {
            console.log('\n❌ STAGE 3 FAILED: Video terbuat tapi menggunakan placeholder.');
          }
        } else {
          console.log(`\n❌ STAGE 3 FAILED: Video job berakhir dengan status "${jobStatus}" | Error: ${finalJobData?.errorMessage}`);
        }
        results.step3_video.details = finalJobData;
      } else {
        console.log(`\n❌ STAGE 3 FAILED: Gagal membuat video job.`);
      }
    }
  } catch (err) {
    console.error('\n❌ STAGE 3 ERROR:', err.message);
  }
  console.log('');

  // ==================================================================
  // STAGE 4: Gemini TTS & Narration Fitting Test
  // ==================================================================
  console.log('------------------------------------------------------------------');
  console.log('STAGE 4: Gemini TTS & Narration Fitting Test');
  console.log('------------------------------------------------------------------');
  try {
    const testNarration = "Meskipun badai topan yang mengerikan berkecamuk dengan dahsyatnya di atas lautan berombak tinggi yang bergemuruh keras, dan seolah-olah langit sendiri hendak runtuh menimpa bumi yang basah, keyakinan suci yang tertanam kokoh di dalam lubuk hati terdalam setiap prajurit pemberani tidak pernah goyah sedikit pun demi meraih kejayaan abadi.";
    const voiceModel = 'gemini/gemini-2.5-flash-preview-tts/Charon';
    const destPath = path.join(WORKSPACE_DIR, 'server', 'temp', 'qa_retest_tts.mp3');

    console.log(`TTS Narration: "${testNarration}"`);
    console.log(`Voice locked to: Charon (male, epic)`);
    console.log('Running narration fit and direct TTS generation...');

    const fitResult = await generateFittedTts({
      narration: testNarration,
      destPath,
      voiceModel,
      emotion: 'determined',
      sceneId: 'retest_scene',
      generateTtsFn: ttsService.generateTts
    });

    console.log(`  -> Fitted text: "${fitResult.fittedText}"`);
    console.log(`  -> Words count: Original=${fitResult.originalWordCount} Fitted=${fitResult.fittedWordCount}`);
    console.log(`  -> Actual Duration: ${fitResult.actualAudioDurationSec}s`);
    console.log(`  -> Pacing: ${fitResult.pacing}`);
    console.log(`  -> requiresReview: ${fitResult.requiresReview}`);
    console.log(`  -> qualityLevel: ${fitResult.qualityLevel}`);
    console.log(`  -> fitStatus: ${fitResult.fitStatus}`);

    const passed = fitResult.actualAudioDurationSec > 0 && fitResult.actualAudioDurationSec <= 10 && !fitResult.cutoffDetected;

    if (passed) {
      console.log('\n✅ STAGE 4 PASSED: Gemini TTS nyata terbuat sukses dan durasi aman (< 10 detik)!');
      results.step4_tts.passed = true;
    } else {
      console.log('\n❌ STAGE 4 FAILED: TTS generation gagal.');
    }
    results.step4_tts.details = fitResult;

    // Clean up
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  } catch (err) {
    console.error('\n❌ STAGE 4 ERROR:', err.message);
  }
  console.log('');

  // ==================================================================
  // FINAL VERIFICATION SUMMARY
  // ==================================================================
  console.log('==================================================================');
  console.log('                 RETEST VERIFICATION SUMMARY                      ');
  console.log('==================================================================');
  console.log(`1. Reference Image Real Test : ${results.step1_references.passed ? 'PASSED ✅' : 'PENDING/FAILED ⏳'}`);
  console.log(`2. Storyboard Real Test      : ${results.step2_storyboard.passed ? 'PASSED ✅' : 'PENDING/FAILED ⏳'}`);
  console.log(`3. Video Real Test           : ${results.step3_video.passed ? 'PASSED ✅' : 'PENDING/FAILED ⏳'}`);
  console.log(`4. Gemini TTS Real Test      : ${results.step4_tts.passed ? 'PASSED ✅' : 'PENDING/FAILED ⏳'}`);
  console.log('------------------------------------------------------------------');
  
  const allPassed = results.step1_references.passed && results.step2_storyboard.passed && results.step3_video.passed && results.step4_tts.passed;
  console.log(`FINAL REPORT STATUS: ${allPassed ? 'APPROVED 🏆 (All Media Real Verification Succeeded!)' : 'PARTIAL ⏳ (Awaiting GrokPI Quota Recovery)'}`);
  console.log('==================================================================');
}

main().catch(err => {
  console.error('Retest script fatal error:', err);
});
