import { Router } from 'express';
import { referenceService } from '../services/referenceService.js';
import upload from '../middleware/upload.js';

const router = Router();

// POST /api/projects/:projectId/references/auto
router.post('/projects/:projectId/references/auto', async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await referenceService.generateAutoReferences(req.params.projectId, req.body, baseUrl);
    // Always return 200 with structured response — let frontend read status field
    res.json(result);
  } catch (error) {
    // Even on error, return a structured response so frontend doesn't get a raw HTTP error
    console.error('[Route /references/auto] Caught error:', error.message);
    res.json({
      status: 'error',
      references: [],
      warnings: [],
      errorMessage: error.message || 'Referensi gagal dibuat.',
      httpStatus: error.statusCode || 500
    });
  }
});

// POST /api/projects/:projectId/references
router.post('/projects/:projectId/references', upload.single('file'), async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await referenceService.saveManualReference(req.file, req.body.category, baseUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/scenes/:sceneId/references
router.post('/scenes/:sceneId/references', upload.single('file'), async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await referenceService.saveManualReference(req.file, req.body.category, baseUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/references/:refId/replace
router.post('/references/:refId/replace', upload.single('file'), async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await referenceService.replaceReference(req.params.refId, req.file, baseUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/references/:refId
router.delete('/references/:refId', async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Referensi berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

export default router;
