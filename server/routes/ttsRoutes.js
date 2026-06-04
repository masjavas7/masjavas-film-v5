import { Router } from 'express';
import { projectTtsService } from '../services/projectTtsService.js';
import { AVAILABLE_VOICES } from '../services/ttsService.js';
import { AppError } from '../utils/safeError.js';

const router = Router();

// Endpoint helper to build baseUrl dynamically based on request
function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * GET /api/projects/:projectId/tts/voices
 * Mengembalikan daftar voice narator yang didukung beserta metadata.
 */
router.get('/projects/:projectId/tts/voices', async (req, res, next) => {
  try {
    res.json({
      success: true,
      voices: AVAILABLE_VOICES
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/voice-preview
 * Menghasilkan sampel suara preview 3-5 detik.
 */
router.post('/projects/:projectId/tts/voice-preview', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { voiceName, sampleText } = req.body;
    const baseUrl = getBaseUrl(req);
    
    const result = await projectTtsService.generateVoicePreview(projectId, voiceName, sampleText, baseUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/select-voice
 * Memilih dan mengunci voice project secara manual.
 */
router.post('/projects/:projectId/tts/select-voice', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { voiceName } = req.body;
    
    const result = await projectTtsService.selectProjectVoice(projectId, voiceName);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/generate
 * Memulai batch TTS generation untuk seluruh scene.
 */
router.post('/projects/:projectId/tts/generate', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const baseUrl = getBaseUrl(req);
    const { mode, concurrency } = req.body;
    
    const job = await projectTtsService.generateProjectNarrationAudio(projectId, baseUrl, { mode, concurrency });
    res.json({
      success: true,
      message: 'Batch TTS generation started',
      job
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/tts/status
 * Memeriksa progress batch TTS generation.
 */
router.get('/projects/:projectId/tts/status', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const job = projectTtsService.getBatchJobStatus(projectId);
    res.json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/scenes/:sceneId/regenerate
 * Meregenerasi TTS untuk adegan tunggal.
 */
router.post('/projects/:projectId/tts/scenes/:sceneId/regenerate', async (req, res, next) => {
  try {
    const { projectId, sceneId } = req.params;
    const baseUrl = getBaseUrl(req);
    const result = await projectTtsService.regenerateSceneTts(projectId, sceneId, baseUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/scenes/:sceneId/update-text
 * Menyimpan teks narasi baru dan menandai audio scene sebagai stale.
 */
router.post('/projects/:projectId/tts/scenes/:sceneId/update-text', async (req, res, next) => {
  try {
    const { projectId, sceneId } = req.params;
    const { narrationText } = req.body;
    
    const result = await projectTtsService.updateSceneTextAndMarkStale(projectId, sceneId, narrationText);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/scenes/:sceneId/reset-status
 * Resets a scene's status back to pending_audio and clears errors.
 */
router.post('/projects/:projectId/tts/scenes/:sceneId/reset-status', async (req, res, next) => {
  try {
    const { projectId, sceneId } = req.params;
    const { projectRepository } = await import('../services/projectRepository.js');
    const project = projectRepository.getProject(projectId);
    if (!project) throw new AppError('Project tidak ditemukan.', 404);
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) throw new AppError('Adegan tidak ditemukan.', 404);
    
    scene.status = 'pending_audio';
    if (scene.audioArtifact) {
      scene.audioArtifact.status = 'pending_audio';
      scene.audioArtifact.lastError = null;
    }
    if (scene.ttsNarration) {
      scene.ttsNarration.fitStatus = 'pending';
      scene.ttsNarration.message = null;
    }
    
    projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });
    res.json({ success: true, scene });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/scenes/:sceneId/skip
 * Marks a scene as skipped.
 */
router.post('/projects/:projectId/tts/scenes/:sceneId/skip', async (req, res, next) => {
  try {
    const { projectId, sceneId } = req.params;
    const { projectRepository } = await import('../services/projectRepository.js');
    const project = projectRepository.getProject(projectId);
    if (!project) throw new AppError('Project tidak ditemukan.', 404);
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) throw new AppError('Adegan tidak ditemukan.', 404);
    
    scene.status = 'skipped';
    if (scene.audioArtifact) {
      scene.audioArtifact.status = 'skipped';
    }
    
    projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });
    res.json({ success: true, scene });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/scenes/:sceneId/unskip
 * Resets a skipped scene status back to pending_audio.
 */
router.post('/projects/:projectId/tts/scenes/:sceneId/unskip', async (req, res, next) => {
  try {
    const { projectId, sceneId } = req.params;
    const { projectRepository } = await import('../services/projectRepository.js');
    const project = projectRepository.getProject(projectId);
    if (!project) throw new AppError('Project tidak ditemukan.', 404);
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) throw new AppError('Adegan tidak ditemukan.', 404);
    
    scene.status = 'pending_audio';
    if (scene.audioArtifact) {
      scene.audioArtifact.status = 'pending_audio';
    }
    
    projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });
    res.json({ success: true, scene });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tts/cancel
 * Cancels the active batch TTS generation queue.
 */
router.post('/projects/:projectId/tts/cancel', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const job = projectTtsService.cancelBatchJob(projectId);
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
});

export default router;
