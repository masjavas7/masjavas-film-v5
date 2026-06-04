import { Router } from 'express';
import { aiFeaturesService } from '../services/aiFeaturesService.js';
import { projectRepository } from '../services/projectRepository.js';

const router = Router();

router.get('/ai/recommendations', (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    res.json({ success: true, recommendations: aiFeaturesService.recommendFilms(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/ai/search', (req, res, next) => {
  try {
    const q = String(req.query.q || '');
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json({ success: true, results: aiFeaturesService.naturalLanguageSearch(q, limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/ai/projects/:projectId/summary', (req, res, next) => {
  try {
    const project = projectRepository.getProject(req.params.projectId);
    res.json({ success: true, summary: aiFeaturesService.summarizeFilm(project) });
  } catch (err) {
    next(err);
  }
});

router.get('/ai/projects/:projectId/genre', (req, res, next) => {
  try {
    const project = projectRepository.getProject(req.params.projectId);
    res.json({ success: true, classification: aiFeaturesService.classifyGenre(project) });
  } catch (err) {
    next(err);
  }
});

router.post('/ai/chat', (req, res, next) => {
  try {
    const { message, projectId } = req.body || {};
    if (!message || typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Pesan tidak valid (maks 2000 karakter).' });
    }
    const result = aiFeaturesService.assistantReply(message, projectId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;