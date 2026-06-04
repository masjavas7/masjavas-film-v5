/**
 * exportJobService.js
 * Background Worker Orchestrator untuk proses export video.
 * 
 * Pipeline:
 * 1. Validate & create job
 * 2. Download video per scene
 * 3. Transcode & ratio-fit per scene (FFmpeg)
 * 4. Concatenate all scenes (FFmpeg)
 * 5. Normalize audio + mux subtitle (FFmpeg)
 * 6. Generate manifest.json
 * 7. Bundle ZIP edit package
 * 8. Mark job complete
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { exportQueueStore } from './exportQueueStore.js';
import { ffmpegService } from './ffmpegService.js';
import { subtitleService } from './subtitleService.js';
import { editPackageService } from './editPackageService.js';
import { projectRepository } from './projectRepository.js';
import { sceneService } from './sceneService.js';
import { settingsService } from './settingsService.js';
import { ttsService } from './ttsService.js';
import { generateFittedTts } from './narrationFitService.js';
import { AppError } from '../utils/safeError.js';
import { getRuntimePaths } from '../utils/runtimePaths.js';

const _execAsync = promisify(exec);
const SCENE_DURATION_SEC = 10;

function mapAspectRatio(ar) {
  if (!ar) return '16:9';
  const match = ar.match(/(\d+:\d+)/);
  if (match) return match[1];
  const normalized = ar.toLowerCase().trim();
  if (normalized.includes('widescreen') || normalized.includes('landscape')) return '16:9';
  if (normalized.includes('vertical') || normalized.includes('vertikal') || normalized.includes('portrait')) return '9:16';
  if (normalized.includes('square') || normalized.includes('kotak')) return '1:1';
  return '16:9';
}

export const exportJobService = {

  /**
   * Memulai job export baru secara asinkron (tidak menunggu selesai).
   * @param {string} projectId
   * @param {object} inputs { approvedSceneIds, strategy, includeSubtitle }
   * @param {string} baseUrl
   * @returns {object} job state awal
   */
  startExportJob: (projectId, inputs, baseUrl) => {
    const { approvedSceneIds, strategy = 'fit_blur', includeSubtitle = true } = inputs;

    // Validasi dasar
    if (!approvedSceneIds || !Array.isArray(approvedSceneIds) || approvedSceneIds.length === 0) {
      throw new AppError('Tidak ada adegan yang disetujui untuk diekspor.', 400);
    }

    let project;
    try {
      project = projectRepository.getProject(projectId);
    } catch (err) {
      throw new AppError(`Project tidak ditemukan: ${err.message}`, 404);
    }
    if (!project) {
      throw new AppError('Project tidak ditemukan.', 404);
    }

    // Buat job baru
    const job = exportQueueStore.createJob(projectId);

    // Jalankan pipeline di background (tidak await)
    exportJobService._runPipeline(job.jobId, projectId, inputs, baseUrl, project).catch(err => {
      console.error(`[ExportJobService] Pipeline fatal error for job ${job.jobId}:`, err);
      exportQueueStore.failJob(job.jobId, err.message || 'Unknown pipeline error');
    });

    return job;
  },

  /**
   * Pipeline utama export — berjalan di background.
   * @private
   */
  _runPipeline: async (jobId, projectId, inputs, baseUrl, project) => {
    const { approvedSceneIds, strategy = 'fit_blur', includeSubtitle = true } = inputs;

    // Preflight validation: Pastikan kredensial Gemini TTS terkonfigurasi sebelum meluncurkan transkoding yang lama/mahal
    const userSettings = settingsService.getSettings();
    if (!userSettings.geminiApiKey) {
      throw new AppError(
        'Kredensial Gemini TTS (Google AI Studio API Key) belum diatur di halaman Pengaturan. Silakan masukkan API Key terlebih dahulu.',
        400
      );
    }

    const settings = project.settings || {};
    const projectAspectRatio = mapAspectRatio(settings.aspectRatio || '16:9');
    const durationPerSceneSec = settings.durationPerSceneSec || settings.duration || 10;
    const totalDurationSec = approvedSceneIds.length * durationPerSceneSec;
    const resolutionPreset = settings.resolutionPreset || '1920x1080';

    // Setup direktori isolasi untuk job ini
    const runtimePaths = getRuntimePaths();
    const exportsDir = path.join(runtimePaths.exportsDir, projectId, jobId);
    const tempScenesDir = path.join(runtimePaths.tempDir, `scenes-${jobId}`);
    
    fs.mkdirSync(exportsDir, { recursive: true });
    fs.mkdirSync(tempScenesDir, { recursive: true });

    const finalMp4Path = path.join(exportsDir, 'final.mp4');
    const subtitleSrtPath = path.join(exportsDir, 'subtitles.srt');
    const manifestJsonPath = path.join(exportsDir, 'manifest.json');
    const zipPath = path.join(exportsDir, 'edit-package.zip');
    
    const warnings = [];
    const projectScenes = project.scenes || [];

    try {
      // ── Step 1: Cek FFmpeg availability ─────────────────────────────
      exportQueueStore.setProgress(jobId, 'checking', 5, 'Memeriksa ketersediaan FFmpeg...');
      
      const ffmpegCheck = ffmpegService.checkAvailability();
      let ffmpegAvailable = ffmpegCheck.available;
      
      if (!ffmpegAvailable) {
        warnings.push('FFmpeg tidak tersedia. Export menggunakan mode REAL-MVP (video scene pertama).');
        console.warn(`[ExportJobService] FFmpeg not available for job ${jobId}, falling back to REAL-MVP mode`);
      }

      if (exportQueueStore.isCancelRequested(jobId)) {
        return exportJobService._handleCancel(jobId, tempScenesDir);
      }

      // ── Step 2: Download video per scene ────────────────────────────
      exportQueueStore.setProgress(jobId, 'downloading', 10, 'Mengunduh video per adegan...');
      
      const downloadedPaths = [];
      const sceneNarrations = [];
      const sceneAudits = [];

      for (let i = 0; i < approvedSceneIds.length; i++) {
        if (exportQueueStore.isCancelRequested(jobId)) {
          return exportJobService._handleCancel(jobId, tempScenesDir);
        }

        const sceneId = approvedSceneIds[i];
        const progressPct = 10 + Math.round((i / approvedSceneIds.length) * 20); // 10-30%
        exportQueueStore.setProgress(jobId, 'downloading', progressPct, 
          `Mengunduh video adegan ${i + 1} dari ${approvedSceneIds.length}...`);

        const sceneData = projectScenes.find(s => s.id === sceneId) || {};
        const videoUrl = sceneService.getSceneVideo(sceneId) || sceneData.previewVideoUrl;
        const narration = sceneService.getSceneNarration(sceneId) || sceneData.narration || `Adegan ${i + 1}`;

        sceneNarrations.push({
          sceneId,
          narration,
          durationSec: durationPerSceneSec
        });

        if (!videoUrl) {
          warnings.push(`Scene ${sceneId} tidak memiliki video URL. Menggunakan frame hitam sebagai fallback.`);
          // Buat file dummy untuk fallback
          const dummyPath = path.join(tempScenesDir, `raw-scene-${i + 1}.mp4`);
          fs.writeFileSync(dummyPath, Buffer.from(''));
          downloadedPaths.push({ path: dummyPath, sceneId, hasRealVideo: false });
          continue;
        }

        // Cek apakah URL adalah URL lokal atau external
        const isLocalUrl = videoUrl.startsWith('http://localhost') || videoUrl.startsWith('http://127.0.0.1');
        const rawScenePath = path.join(tempScenesDir, `raw-scene-${i + 1}.mp4`);

        try {
          await ffmpegService.downloadVideo(videoUrl, rawScenePath);
          downloadedPaths.push({ path: rawScenePath, sceneId, hasRealVideo: true });
        } catch (downloadErr) {
          console.warn(`[ExportJobService] Failed to download scene ${sceneId}:`, downloadErr.message);
          warnings.push(`Video adegan ${sceneId} gagal diunduh. Menggunakan fallback.`);
          // Create placeholder file
          fs.writeFileSync(rawScenePath, Buffer.from(''));
          downloadedPaths.push({ path: rawScenePath, sceneId, hasRealVideo: false });
        }
      }

      if (exportQueueStore.isCancelRequested(jobId)) {
        return exportJobService._handleCancel(jobId, tempScenesDir);
      }

      // ── Step 3: Subtitle generation (SRT & ASS) ─────────────────────
      exportQueueStore.setProgress(jobId, 'subtitles', 32, 'Membuat file subtitle...');
      subtitleService.generateSrtFile(sceneNarrations, subtitleSrtPath);
      const subtitleAssPath = path.join(exportsDir, 'subtitles.ass');
      subtitleService.generateAssFile(sceneNarrations, subtitleAssPath);

      // ── Step 4: Transcode & ratio fitting per scene ─────────────────
      const transcodedPaths = [];
      const realVideoPaths = downloadedPaths.filter(d => d.hasRealVideo);

      // ── Voice Locking: Cast project voice ONCE for consistent narration ──
      const lockedVoice = ttsService.castProjectVoice(project);
      const lockedVoiceModel = `gemini/${lockedVoice.modelName}/${lockedVoice.voiceName}`;
      console.log(`[Export] Project voice locked: ${lockedVoice.voiceName} — ${lockedVoice.castReason}`);

      if (ffmpegAvailable && realVideoPaths.length > 0) {
        for (let i = 0; i < downloadedPaths.length; i++) {
          if (exportQueueStore.isCancelRequested(jobId)) {
            return exportJobService._handleCancel(jobId, tempScenesDir);
          }

          const { path: rawPath, hasRealVideo, sceneId } = downloadedPaths[i];
          const progressPct = 35 + Math.round((i / downloadedPaths.length) * 30); // 35-65%
          exportQueueStore.setProgress(jobId, 'transcoding', progressPct,
            `Transkoding adegan ${i + 1} dari ${downloadedPaths.length} (Strategi: ${strategy})...`);

          const transcodedPath = path.join(tempScenesDir, `transcoded-scene-${i + 1}.mp4`);
          let transcodeStatus = 'transcoded';
          const sceneData = projectScenes.find(s => s.id === sceneId) || {};

          if (!hasRealVideo || !fs.existsSync(rawPath) || fs.statSync(rawPath).size === 0) {
            // Generate blank/color video as placeholder
            try {
              const { width, height } = ffmpegService.getTargetResolution(projectAspectRatio);
              await ffmpegService._execCmd([
                '-y',
                '-f', 'lavfi',
                '-i', `color=c=black:size=${width}x${height}:rate=30:duration=${durationPerSceneSec}`,
                '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
                '-t', String(durationPerSceneSec),
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
                '-c:a', 'aac', '-b:a', '128k',
                transcodedPath
              ], 30000);
              transcodeStatus = 'blank_placeholder';
            } catch (blankErr) {
              console.warn(`[ExportJobService] Blank frame generation failed for scene ${i + 1}: ${blankErr.message}`);
              transcodeStatus = 'failed';
              // If blank frame generation fails, skip this scene
              continue;
            }
          } else {
            try {
              await ffmpegService.transcodeScene(rawPath, transcodedPath, projectAspectRatio, strategy);
            } catch (transcodeErr) {
              console.warn(`[ExportJobService] Transcode failed for scene ${i + 1}, using raw:`, transcodeErr.message);
              warnings.push(`Transcode adegan ${i + 1} gagal, menggunakan video asli.`);
              fs.copyFileSync(rawPath, transcodedPath);
              transcodeStatus = 'raw_copy';
            }
          }

          const audit = {
            sceneId,
            sourceAspectRatio: sceneData.aspectRatio || '16:9',
            targetAspectRatio: projectAspectRatio,
            transcodeStrategy: hasRealVideo ? strategy : 'none',
            transcodeStatus,
            durationSec: durationPerSceneSec,
            ttsNarration: null
          };
          sceneAudits.push(audit);

          let finalMixedScenePath = transcodedPath;
          const narrationObj = sceneNarrations.find(sn => sn.sceneId === sceneId) || {};
          const narration = narrationObj.narration || '';
          const isSkipped = sceneData.status === 'skipped';

          if (isSkipped) {
            console.log(`[ExportJobService] Bypassing TTS generation for skipped scene ${sceneId}`);
            warnings.push(`Adegan ${i + 1} (${sceneId}) dilewati sementara (tanpa narasi audio).`);
          } else if (narration && narration.trim() && fs.existsSync(transcodedPath) && fs.statSync(transcodedPath).size > 0) {
            const ttsMp3Path = path.join(tempScenesDir, `tts-scene-${i + 1}.mp3`);
            const mixedScenePath = path.join(tempScenesDir, `mixed-scene-${i + 1}.mp4`);
            
            try {
              // Use fitted TTS pipeline for anti-cutoff guarantee
              const sceneEmotion = sceneData.emotionDirection?.primaryEmotion || 'tense';
              const ttsMetadata = await generateFittedTts({
                narration,
                destPath: ttsMp3Path,
                voiceModel: lockedVoiceModel,
                emotion: sceneEmotion,
                genre: settings.genre || '',
                sceneSummary: sceneData.summary || '',
                sceneId,
                generateTtsFn: ttsService.generateTts
              });

              // Store TTS metadata for evidence tracking
              audit.ttsNarration = ttsMetadata;
              
              // Log fit result
              exportQueueStore.setProgress(jobId, 'transcoding', progressPct,
                `Pengisi suara "${lockedVoice.voiceName}" selesai menarasi adegan ${i + 1} (${ttsMetadata.fitStatus}, ${ttsMetadata.actualAudioDurationSec}s)...`);

              // Check for cutoff — block export if critical
              if (ttsMetadata.cutoffDetected) {
                warnings.push(`Audio narasi adegan ${i + 1} terpotong (${ttsMetadata.actualAudioDurationSec}s > ${SCENE_DURATION_SEC}s). Perlu dipersingkat.`);
              }
              
              if (ttsMetadata.fitStatus === 'failed_fit') {
                warnings.push(`Narasi adegan ${i + 1} gagal fit ke ${SCENE_DURATION_SEC} detik. Status: ${ttsMetadata.fitStatus}`);
              }

              // Mix audio if TTS was generated
              if (fs.existsSync(ttsMp3Path) && fs.statSync(ttsMp3Path).size > 0) {
                exportQueueStore.setProgress(jobId, 'transcoding', progressPct,
                  `Mencampur audio dan video adegan ${i + 1} dari ${downloadedPaths.length}...`);
                await ffmpegService.mixTtsAudio(transcodedPath, ttsMp3Path, mixedScenePath);
                
                if (fs.existsSync(mixedScenePath) && fs.statSync(mixedScenePath).size > 0) {
                  finalMixedScenePath = mixedScenePath;
                  console.log(`[ExportJobService] Audio-video mixed successfully for scene ${i + 1}`);
                }
              }
            } catch (ttsErr) {
              console.warn(`[ExportJobService] TTS generation/mix failed for scene ${i + 1}:`, ttsErr.message);
              warnings.push(`Pencampuran narasi adegan ${i + 1} gagal: ${ttsErr.message}. Menggunakan video asli.`);
            }
          }

          if (fs.existsSync(finalMixedScenePath) && fs.statSync(finalMixedScenePath).size > 0) {
            transcodedPaths.push(finalMixedScenePath);
          }
        }
      } else if (!ffmpegAvailable) {
        // REAL-MVP mode: gunakan video scene pertama dengan download langsung
        warnings.push('FFmpeg tidak tersedia. Export REAL-MVP menggunakan video scene pertama.');
        
        const firstSceneId = approvedSceneIds[0];
        const firstVideoUrl = sceneService.getSceneVideo(firstSceneId);
        
        if (firstVideoUrl) {
          try {
            await ffmpegService.downloadVideo(firstVideoUrl, finalMp4Path);
          } catch (err) {
            warnings.push(`Gagal mengunduh video scene pertama: ${err.message}`);
            fs.writeFileSync(finalMp4Path, Buffer.from('REAL-MVP fallback - video tidak tersedia'));
          }
        }

        // Populate sceneAudits for REAL-MVP
        for (let i = 0; i < approvedSceneIds.length; i++) {
          const sid = approvedSceneIds[i];
          const sc = projectScenes.find(s => s.id === sid) || {};
          const isFirstSceneWithRealVideo = i === 0 && downloadedPaths[0]?.hasRealVideo;
          sceneAudits.push({
            sceneId: sid,
            sourceAspectRatio: sc.aspectRatio || '16:9',
            targetAspectRatio: projectAspectRatio,
            transcodeStrategy: 'none',
            transcodeStatus: isFirstSceneWithRealVideo ? 'raw_copy' : 'blank_placeholder',
            durationSec: durationPerSceneSec
          });
        }

        // Skip ke packaging step
        exportQueueStore.setProgress(jobId, 'packaging', 75, 'Mempaketkan aset...');
        return await exportJobService._finishJob(jobId, {
          projectId, finalMp4Path, subtitleSrtPath, subtitleAssPath, manifestJsonPath, zipPath,
          exportsDir, tempScenesDir, approvedSceneIds, projectScenes, sceneNarrations,
          projectAspectRatio, resolutionPreset, durationPerSceneSec, totalDurationSec,
          strategy, ffmpegVersion: null, warnings, baseUrl, sceneAudits
        });
      }

      if (exportQueueStore.isCancelRequested(jobId)) {
        return exportJobService._handleCancel(jobId, tempScenesDir);
      }

      // ── Pre-export validation: Check for critical TTS issues ──
      const ttsIssues = sceneAudits.filter(a => a.ttsNarration?.cutoffDetected || a.ttsNarration?.fitStatus === 'failed_fit');
      if (ttsIssues.length > 0) {
        const issueScenes = ttsIssues.map(a => a.sceneId).join(', ');
        warnings.push(`PERINGATAN: ${ttsIssues.length} adegan memiliki masalah narasi TTS (terpotong/gagal fit): ${issueScenes}`);
        console.warn(`[ExportJobService] TTS issues in scenes: ${issueScenes}`);
      }

      // ── Validate voice consistency ──
      const voiceNames = sceneAudits.filter(a => a.ttsNarration?.voiceName).map(a => a.ttsNarration.voiceName);
      const uniqueVoices = [...new Set(voiceNames)];
      if (uniqueVoices.length > 1) {
        warnings.push(`PERINGATAN: Voice tidak konsisten! Ditemukan ${uniqueVoices.length} voice berbeda: ${uniqueVoices.join(', ')}`);
      }

      // ── Step 5: Concatenate scenes ───────────────────────────────────
      exportQueueStore.setProgress(jobId, 'concatenating', 68, 'Menggabungkan semua adegan...');
      
      if (transcodedPaths.length > 0) {
        const concatOutputPath = path.join(tempScenesDir, 'concatenated.mp4');
        try {
          await ffmpegService.concatenateScenes(transcodedPaths, concatOutputPath);

          // ── Step 6: Normalize audio ─────────────────────────────────
          exportQueueStore.setProgress(jobId, 'muxing', 78, 'Normalisasi audio dan membakar subtitle premium...');
          await ffmpegService.normalizeAndMux(concatOutputPath, subtitleAssPath, finalMp4Path, includeSubtitle, exportsDir);
        } catch (concatErr) {
          console.warn(`[ExportJobService] Concat/normalize failed, using first available:`, concatErr.message);
          warnings.push(`Penggabungan adegan gagal: ${concatErr.message}. Menggunakan video adegan pertama.`);
          if (transcodedPaths.length > 0) {
            fs.copyFileSync(transcodedPaths[0], finalMp4Path);
          }
        }
      } else {
        // No transcoded paths available
        const firstSceneId = approvedSceneIds[0];
        const firstVideoUrl = sceneService.getSceneVideo(firstSceneId);
        if (firstVideoUrl) {
          await ffmpegService.downloadVideo(firstVideoUrl, finalMp4Path);
        }
        warnings.push('Tidak ada video terproses. Menggunakan fallback video scene pertama.');

        // Populate sceneAudits
        for (let i = 0; i < approvedSceneIds.length; i++) {
          const sid = approvedSceneIds[i];
          const sc = projectScenes.find(s => s.id === sid) || {};
          const isFirstSceneWithRealVideo = i === 0 && downloadedPaths[0]?.hasRealVideo;
          sceneAudits.push({
            sceneId: sid,
            sourceAspectRatio: sc.aspectRatio || '16:9',
            targetAspectRatio: projectAspectRatio,
            transcodeStrategy: 'none',
            transcodeStatus: isFirstSceneWithRealVideo ? 'raw_copy' : 'blank_placeholder',
            durationSec: durationPerSceneSec
          });
        }
      }

      // ── Final packaging ──────────────────────────────────────────────
      await exportJobService._finishJob(jobId, {
        projectId, finalMp4Path, subtitleSrtPath, subtitleAssPath, manifestJsonPath, zipPath,
        exportsDir, tempScenesDir, approvedSceneIds, projectScenes, sceneNarrations,
        projectAspectRatio, resolutionPreset, durationPerSceneSec, totalDurationSec,
        strategy, ffmpegVersion: ffmpegCheck?.version, warnings, baseUrl, sceneAudits
      });

    } catch (err) {
      // Cleanup temp on fatal error
      editPackageService.cleanupTempScenes(tempScenesDir);
      throw err;
    }
  },

  /**
   * Finishing step: generate manifest, create ZIP, mark job complete.
   * @private
   */
  _finishJob: async (jobId, params) => {
    const {
      projectId, finalMp4Path, subtitleSrtPath, subtitleAssPath, manifestJsonPath, zipPath,
      exportsDir, tempScenesDir, approvedSceneIds, projectScenes, sceneNarrations,
      projectAspectRatio, resolutionPreset, durationPerSceneSec, totalDurationSec,
      strategy, ffmpegVersion, warnings, baseUrl, sceneAudits
    } = params;

    exportQueueStore.setProgress(jobId, 'packaging', 85, 'Membuat manifest dan paket ZIP...');

    // Generate manifest.json
    const manifest = editPackageService.generateManifest({
      projectId,
      exportVersion: ffmpegVersion ? 'v2-ffmpeg' : 'REAL-MVP',
      projectAspectRatio,
      videoAspectRatio: projectAspectRatio,
      resolutionPreset,
      durationPerSceneSec,
      totalDurationSec,
      approvedSceneIds,
      projectScenes,
      sceneNarrations,
      ffmpegVersion,
      strategy,
      warnings,
      sceneAudits
    });

    fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Bundle ZIP (Include both SRT and premium ASS subtitles)
    const filesToZip = [finalMp4Path, subtitleSrtPath, subtitleAssPath, manifestJsonPath].filter(p => fs.existsSync(p));
    const zipResult = editPackageService.createZip(filesToZip, zipPath);
    
    if (!zipResult.success) {
      warnings.push(`Pembuatan ZIP gagal: ${zipResult.error}. File individual masih tersedia.`);
    }

    // Cleanup temp scenes
    editPackageService.cleanupTempScenes(tempScenesDir);

    // Build job ID path segment
    const jobPathSegment = `${projectId}/${jobId}`;
    const urls = {
      mp4Url: `${baseUrl}/exports/${jobPathSegment}/final.mp4`,
      subtitleUrl: `${baseUrl}/exports/${jobPathSegment}/subtitles.srt`,
      subtitleAssUrl: `${baseUrl}/exports/${jobPathSegment}/subtitles.ass`,
      packageZipUrl: `${baseUrl}/exports/${jobPathSegment}/edit-package.zip`,
      manifestUrl: `${baseUrl}/exports/${jobPathSegment}/manifest.json`,
      downloadUrl: `${baseUrl}/exports/${jobPathSegment}/final.mp4`
    };

    exportQueueStore.completeJob(jobId, urls);
    console.log(`[ExportJobService] Job ${jobId} completed successfully!`);
  },

  /**
   * Handle cancel request.
   * @private
   */
  _handleCancel: (jobId, tempScenesDir) => {
    console.log(`[ExportJobService] Job ${jobId} canceled.`);
    editPackageService.cleanupTempScenes(tempScenesDir);
    exportQueueStore.updateJob(jobId, { status: 'canceled', completedAt: new Date().toISOString() });
  }
};

export default exportJobService;
