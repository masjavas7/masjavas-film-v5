import { Router } from 'express';
import { projectService } from '../services/projectService.js';
import { projectRepository } from '../services/projectRepository.js';
import { sceneDraftService } from '../services/sceneDraftService.js';
import { fitNarrationToDuration } from '../services/narrationFitService.js';
import { audioArtifactService } from '../services/audioArtifactService.js';


const router = Router();

// GET /api/projects - Lists all projects with metadata
router.get('/', async (req, res, next) => {
  try {
    const list = projectRepository.listProjects();
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId - Gets detailed project data
router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    try {
      audioArtifactService.prepareAudioArtifacts(projectId);
    } catch (e) {
      console.warn('Skipping audio artifacts preparation during project retrieval:', e.message);
    }
    const project = projectRepository.getProject(projectId);
    res.json(project);
  } catch (error) {
    if (error.statusCode === 422) {
      const backupExists = projectRepository.backupExists(req.params.projectId);
      const backupTime = projectRepository.getBackupTime(req.params.projectId);
      return res.status(422).json({
        error: error.message,
        hasBackup: backupExists,
        backupTime: backupTime
      });
    }
    next(error);
  }
});

// POST /api/projects - Creates a new project entity
router.post('/', async (req, res, next) => {
  try {
    const { id, title, topic } = req.body;
    const project = projectRepository.createProject({ id, title, topic });
    res.json(project);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/:projectId - Updates project metadata/settings
router.patch('/:projectId', async (req, res, next) => {
  try {
    const patch = req.body;
    const updated = projectRepository.updateProject(req.params.projectId, patch);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/snapshot - Saves a complete workspace state snapshot
router.post('/:projectId/snapshot', async (req, res, next) => {
  try {
    const snapshot = req.body;
    const saved = projectRepository.saveProjectSnapshot(req.params.projectId, snapshot);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:projectId - Deletes a project
router.delete('/:projectId', async (req, res, next) => {
  try {
    projectRepository.deleteProject(req.params.projectId);
    res.json({ success: true, message: 'Project berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/touch - Updates last opened timestamp
router.post('/:projectId/touch', async (req, res, next) => {
  try {
    projectRepository.touchProject(req.params.projectId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/duplicate - Duplicates a project
router.post('/:projectId/duplicate', async (req, res, next) => {
  try {
    const duplicated = projectRepository.duplicateProject(req.params.projectId);
    res.json(duplicated);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/restore-backup - Restores a project from backup
router.post('/:projectId/restore-backup', async (req, res, next) => {
  try {
    const restored = projectRepository.restoreBackup(req.params.projectId);
    res.json(restored);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/narration - Story generation
router.post('/:projectId/narration', async (req, res, next) => {
  try {
    const { ideaText, selectedPlatform, selectedDuration, selectedTone, selectedStyle } = req.body;
    const result = await projectService.generateNarration(req.params.projectId, {
      ideaText,
      selectedPlatform,
      selectedDuration,
      selectedTone,
      selectedStyle
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/scenes/generate - Scene list generation
router.post('/:projectId/scenes/generate', async (req, res, next) => {
  try {
    const { narration, storyDraft, selectedDuration, selectedStyle, selectedTone } = req.body;
    const result = await projectService.generateScenes(req.params.projectId, {
      narration,
      storyDraft,
      selectedDuration,
      selectedStyle,
      selectedTone
    });
    res.json({ scenes: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/scenes/ensure-drafts
router.post('/:projectId/scenes/ensure-drafts', async (req, res, next) => {
  try {
    const { force } = req.body;
    const scenes = await sceneDraftService.ensureSceneDrafts(req.params.projectId, force === true);
    res.json(scenes);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId/scenes
router.get('/:projectId/scenes', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const scenes = audioArtifactService.prepareAudioArtifacts(projectId);
    res.json(scenes || []);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/scenes/:sceneId/narration/update
router.post('/:projectId/scenes/:sceneId/narration/update', async (req, res, next) => {
  try {
    const { projectId, sceneId } = req.params;
    const { narrationText } = req.body;

    const project = projectRepository.getProject(projectId);
    const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      return res.status(404).json({ error: 'Adegan tidak ditemukan' });
    }

    const scene = project.scenes[sceneIndex];
    const textChanged = scene.narration !== narrationText;

    if (textChanged) {
      scene.narration = narrationText;
      scene.narrationText = narrationText;

      // Update fit metadata
      const fitResult = await fitNarrationToDuration(narrationText, {
        emotion: scene.emotion || 'tense',
        sceneSummary: scene.summary || ''
      });

      // Reset ttsNarration and checklist audio timing
      scene.ttsNarration = null;
      if (!scene.checklist) {
        scene.checklist = {};
      }
      scene.checklist.ttsAudioReady = false;
      scene.checklist.audioTimingReady = false;

      // Merge fit status indicators
      scene.audioValidation = fitResult.audioValidation || {
        passed: fitResult.fitStatus !== 'too_long_warning',
        warnings: fitResult.fitStatus === 'too_long_warning' ? ['Teks narasi terlalu panjang.'] : [],
        errors: []
      };
    }

    projectRepository.saveProjectSnapshot(projectId, { scenes: project.scenes });
    res.json({ success: true, scene });
  } catch (error) {
    next(error);
  }
});

export default router;
