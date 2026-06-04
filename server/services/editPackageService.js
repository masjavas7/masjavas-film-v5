/**
 * editPackageService.js
 * Membundel file-file export (final.mp4, subtitles.srt, manifest.json)
 * ke dalam sebuah file edit-package.zip menggunakan PowerShell Compress-Archive.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export const editPackageService = {

  /**
   * Membuat ZIP package dari array file paths.
   * @param {string[]} filePaths - Array path file yang akan di-zip
   * @param {string} zipOutputPath - Path output file .zip
   * @returns {{ success: boolean, zipPath: string, error?: string }}
   */
  createZip: (filePaths, zipOutputPath) => {
    // Pastikan semua file ada
    const existingFiles = filePaths.filter(p => {
      if (!fs.existsSync(p)) {
        console.warn(`[EditPackage] File tidak ditemukan, dilewati: ${p}`);
        return false;
      }
      return true;
    });

    if (existingFiles.length === 0) {
      console.error('[EditPackage] Tidak ada file yang bisa di-zip.');
      return { success: false, zipPath: null, error: 'No valid files to zip' };
    }

    // Buat temp directory untuk bundle
    const tempBundleDir = zipOutputPath.replace('.zip', `_bundle_${Date.now()}`);
    try {
      fs.mkdirSync(tempBundleDir, { recursive: true });

      // Copy semua file ke temp dir
      for (const filePath of existingFiles) {
        const fileName = path.basename(filePath);
        fs.copyFileSync(filePath, path.join(tempBundleDir, fileName));
      }

      // Hapus zip lama jika ada
      if (fs.existsSync(zipOutputPath)) {
        fs.unlinkSync(zipOutputPath);
      }

      // Compress menggunakan PowerShell Compress-Archive
      const escapedSrc = tempBundleDir.replace(/\\/g, '\\\\');
      const escapedDest = zipOutputPath.replace(/\\/g, '\\\\');
      const psCmd = `powershell -Command "Compress-Archive -Path '${escapedSrc}\\\\*' -DestinationPath '${escapedDest}' -Force"`;
      
      console.log(`[EditPackage] Creating ZIP: ${path.basename(zipOutputPath)}`);
      execSync(psCmd, { timeout: 60000 });

      if (!fs.existsSync(zipOutputPath)) {
        throw new Error('ZIP file was not created');
      }

      const stats = fs.statSync(zipOutputPath);
      console.log(`[EditPackage] ZIP created: ${zipOutputPath} (${Math.round(stats.size / 1024)}KB)`);

      return { success: true, zipPath: zipOutputPath };

    } catch (err) {
      console.error(`[EditPackage] ZIP creation failed: ${err.message}`);
      return { success: false, zipPath: null, error: err.message };
    } finally {
      // Cleanup temp bundle dir
      try {
        if (fs.existsSync(tempBundleDir)) {
          fs.rmSync(tempBundleDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.warn(`[EditPackage] Cleanup temp dir failed: ${cleanupErr.message}`);
      }
    }
  },

  /**
   * Generate manifest.json dengan metadata lengkap export.
   * @param {object} params - Parameter manifest
   * @returns {object} manifest object
   */
  generateManifest: ({
    projectId,
    exportVersion,
    projectAspectRatio,
    videoAspectRatio,
    resolutionPreset,
    durationPerSceneSec,
    totalDurationSec,
    approvedSceneIds,
    projectScenes,
    sceneNarrations,
    ffmpegVersion,
    strategy,
    warnings = [],
    sceneAudits = []
  }) => {
    const hasSkipped = (projectScenes || []).some(s => s.status === 'skipped');
    const exportReadiness = hasSkipped ? 'draft_allowed' : 'final_ready';

    const manifest = {
      projectId,
      exportTime: new Date().toISOString(),
      status: 'completed',
      exportVersion: exportVersion || 'v2-ffmpeg',
      exportReadiness,
      ffmpegVersion: ffmpegVersion || 'unknown',
      mediaHandlingStrategy: strategy || 'fit_blur',
      projectAspectRatio,
      videoAspectRatio,
      resolutionPreset,
      durationPerSceneSec,
      totalDurationSec,
      approvedScenesCount: approvedSceneIds.length,
      scenes: approvedSceneIds.map((sceneId, index) => {
        const sc = (projectScenes || []).find(s => s.id === sceneId) || {};
        const narEntry = (sceneNarrations || []).find(n => n.sceneId === sceneId) || {};
        const audit = (sceneAudits || []).find(a => a.sceneId === sceneId) || {};
        return {
          sceneId,
          order: index + 1,
          title: sc.title || `Adegan ${index + 1}`,
          durationSeconds: durationPerSceneSec,
          aspectRatio: sc.aspectRatio || projectAspectRatio,
          timeRange: `${index * durationPerSceneSec}.0–${(index + 1) * durationPerSceneSec}.0s`,
          narration: narEntry.narration || sc.narration || 'Narasi tidak ditemukan',
          storybeat: sc.storybeat || null,
          sourceAspectRatio: audit.sourceAspectRatio || sc.aspectRatio || '16:9',
          targetAspectRatio: audit.targetAspectRatio || projectAspectRatio,
          transcodeStrategy: audit.transcodeStrategy || 'none',
          transcodeStatus: audit.transcodeStatus || 'unknown',
          durationSec: audit.durationSec || durationPerSceneSec,
          skipped: sc.status === 'skipped'
        };
      }),
      warnings,
      files: {
        video: 'final.mp4',
        subtitles: 'subtitles.srt',
        manifest: 'manifest.json',
        editPackage: 'edit-package.zip'
      }
    };

    return manifest;
  },

  /**
   * Bersihkan folder temp scenes setelah export selesai.
   * @param {string} tempScenesDir - Path folder temp
   */
  cleanupTempScenes: (tempScenesDir) => {
    try {
      if (fs.existsSync(tempScenesDir)) {
        fs.rmSync(tempScenesDir, { recursive: true, force: true });
        console.log(`[EditPackage] Temp scenes cleaned: ${tempScenesDir}`);
      }
    } catch (err) {
      console.warn(`[EditPackage] Could not clean temp scenes: ${err.message}`);
    }
  }
};

export default editPackageService;
