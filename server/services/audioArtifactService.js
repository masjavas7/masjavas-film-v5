import fs from 'fs';
import path from 'path';
import { projectRepository } from './projectRepository.js';
import { AVAILABLE_VOICES } from './ttsService.js';

export const audioArtifactService = {
  /**
   * Menyiapkan audio artifact untuk semua scene di suatu project.
   * Menjamin respon super cepat (< 3 detik) tanpa memanggil provider API.
   * @param {string} projectId 
   * @returns {Array<object>} list of project scenes with populated artifacts
   */
  prepareAudioArtifacts: (projectId) => {
    const project = projectRepository.getProject(projectId);
    if (!project) {
      throw new Error('Project tidak ditemukan.');
    }

    const scenes = project.scenes || [];
    if (scenes.length === 0) {
      return [];
    }

    // Ambil pengisi suara locked atau cast default
    let voiceName = project.ttsSettings?.voiceName;
    if (!voiceName) {
      voiceName = project.lockedVoice?.voiceName || AVAILABLE_VOICES[0].voiceName;
    }

    let modified = false;

    // Helper untuk mengecek apakah audio valid berdasarkan kriteria ketat
    const checkAudioValidity = (scene, voiceLock) => {
      const tts = scene.ttsNarration;
      if (!tts || !tts.audioPath || !tts.audioUrl) return { valid: false, reason: 'Audio belum dibuat.' };
      if (scene.status === 'stale') return { valid: false, reason: 'Teks narasi berubah.' };
      if (tts.voiceName !== voiceLock) return { valid: false, reason: `Suara tidak konsisten dengan voice lock (${voiceLock}).` };
      if (tts.cutoffDetected) return { valid: false, reason: 'Audio terpotong (cutoff).' };

      try {
        const fileExists = fs.existsSync(tts.audioPath);
        if (!fileExists) return { valid: false, reason: 'File audio tidak terbentuk.' };

        const stats = fs.statSync(tts.audioPath);
        if (stats.size < 10240) return { valid: false, reason: 'File audio tidak terbentuk.' }; // size < 10KB

        if (tts.actualAudioDurationSec <= 1.0) return { valid: false, reason: 'Durasi audio terlalu pendek (< 1 detik).' };
        if (tts.actualAudioDurationSec > 10.05) return { valid: false, reason: 'Durasi audio terlalu panjang (> 10 detik).' };
      } catch (err) {
        return { valid: false, reason: `Gagal validasi file: ${err.message}` };
      }

      return { valid: true };
    };

    for (const scene of scenes) {
      const validity = checkAudioValidity(scene, voiceName);
      let artifactStatus = "pending_audio";

      if (validity.valid) {
        artifactStatus = "ready";
      } else {
        if (scene.status === 'stale') {
          artifactStatus = "stale";
        } else if (scene.status === 'failed' || (scene.ttsNarration && !validity.valid)) {
          artifactStatus = "failed";
        }
      }

      // Hitung kata & karakter untuk estimasi teks
      const text = scene.narrationText || scene.narration || "";
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const charCount = text.length;
      
      // Kecepatan membaca rata-rata ~130-150 kata per menit (~2.3 kata per detik)
      const estimatedDurationSec = parseFloat((wordCount / 2.3).toFixed(2));

      // Jika artifact belum ada, atau perlu disinkronkan, buat/update
      if (!scene.audioArtifact || scene.audioArtifact.narrationText !== text || scene.audioArtifact.voiceName !== voiceName || validity.valid !== (scene.audioArtifact.status === "ready")) {
        scene.audioArtifact = {
          status: artifactStatus,
          sceneId: scene.id,
          order: scene.order || scene.sceneNumber || 1,
          title: scene.title || `Adegan ${scene.sceneNumber || 1}`,
          narrationText: text,
          fittedText: scene.ttsNarration?.fittedText || text,
          targetDurationSec: 10,
          estimatedDurationSec,
          wordCount,
          charCount,
          voiceName,
          voiceStatus: "locked",
          audioUrl: validity.valid ? scene.ttsNarration.audioUrl : null,
          audioPath: validity.valid ? scene.ttsNarration.audioPath : null,
          actualDurationSec: validity.valid ? scene.ttsNarration.actualAudioDurationSec : 0,
          generationMode: validity.valid ? (scene.ttsNarration.generationMode || "real") : "not_generated",
          retryCount: scene.audioArtifact?.retryCount || 0,
          lastError: validity.valid ? null : (scene.ttsNarration?.message || validity.reason),
          createdAt: scene.audioArtifact?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        modified = true;
      }
    }

    if (modified) {
      projectRepository.saveProjectSnapshot(projectId, { scenes });
    }

    return scenes;
  }
};

export default audioArtifactService;
