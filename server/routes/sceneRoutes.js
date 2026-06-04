import { Router } from 'express';
import { sceneService } from '../services/sceneService.js';

const router = Router();

// POST /api/scenes/:sceneId/storyboard
router.post('/scenes/:sceneId/storyboard', async (req, res, next) => {
  try {
    const inputs = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await sceneService.generateStoryboard(req.params.sceneId, inputs, baseUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/scenes/:sceneId/video — Full ScenePromptPackage pipeline
router.post('/scenes/:sceneId/video', async (req, res, next) => {
  try {
    const {
      projectId,
      videoInstruction,
      settings,
      scene,
      references,
      storyboardPanels,
      heroFrame,
      storyboardImageUrl,
      previousSceneVideoUrl
    } = req.body;

    const result = await sceneService.createVideoJob(req.params.sceneId, {
      projectId,
      videoInstruction,
      settings,
      scene,
      references,
      storyboardPanels,
      heroFrame,
      storyboardImageUrl,
      previousSceneVideoUrl
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/scenes/:sceneId/mock-video
router.post('/scenes/:sceneId/mock-video', async (req, res, next) => {
  try {
    const { videoUrl } = req.body;
    sceneService.setMockSceneVideo(req.params.sceneId, videoUrl);
    res.json({ status: 'success', sceneId: req.params.sceneId, videoUrl });
  } catch (error) {
    next(error);
  }
});

// GET /api/scenes/video/jobs/:jobId
router.get('/scenes/video/jobs/:jobId', async (req, res, next) => {
  try {
    const result = await sceneService.getJobStatus(req.params.jobId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
