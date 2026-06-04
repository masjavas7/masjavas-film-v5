import { projectRepository } from './projectRepository.js';
import { projectService } from './projectService.js';
import { fitNarrationToDuration } from './narrationFitService.js';
import { logToBackendFile } from '../utils/logger.js';
import { AppError } from '../utils/safeError.js';

export const sceneDraftService = {
  /**
   * Ensures that scene drafts are generated and saved to the project.
   * If scenes already exist, it will not overwrite them unless force is true.
   * 
   * @param {string} projectId 
   * @param {boolean} force 
   * @returns {Promise<Array<object>>} list of project scenes
   */
  ensureSceneDrafts: async (projectId, force = false) => {
    const project = projectRepository.getProject(projectId);
    if (!project) {
      throw new AppError('Proyek tidak ditemukan', 404);
    }

    if (project.scenes && project.scenes.length > 0 && !force) {
      logToBackendFile(`[SceneDraft] Scenes already exist for project ${projectId}. Skipping.`);
      return project.scenes;
    }

    logToBackendFile(`[SceneDraft] Generating scene drafts for project ${projectId} (force=${force})`);

    const narration = project.reviewNarration || project.narration || project.story?.narration || "";
    if (!narration) {
      throw new AppError('Narasi cerita kosong, tidak dapat membagi menjadi adegan.', 400);
    }

    const totalScenes = project.settings?.totalScenes || 6;
    const selectedDuration = `${totalScenes} adegan`;
    const selectedStyle = project.settings?.style || "Sinematik";
    const selectedTone = project.settings?.tone || "Dramatis";

    // Call existing projectService.generateScenes
    const generated = await projectService.generateScenes(projectId, {
      narration,
      selectedDuration,
      selectedStyle,
      selectedTone
    });

    const processedScenes = [];
    for (let i = 0; i < generated.length; i++) {
      const scene = generated[i];
      const fitResult = await fitNarrationToDuration(scene.narration, {
        emotion: scene.emotion || 'tense',
        sceneSummary: scene.summary || ''
      });

      const fittedNarration = fitResult.fittedText || scene.narration;

      processedScenes.push({
        ...scene,
        order: scene.sceneNumber || (i + 1),
        narration: fittedNarration,
        narrationText: fittedNarration, // For UI narration textareas
        durationSec: 10,
        emotion: scene.emotion || 'tense',
        location: scene.location || 'lereng Merapi',
        goal: scene.goal || 'story progression',
        status: "draft",
        ttsNarration: null,
        storyboardStatus: "not_started",
        videoStatus: "not_started",
        videoInstruction: scene.videoInstruction || `Tembakan sinematik memperlihatkan adegan: ${scene.title}. ${scene.summary}`,
        videoSettings: {
          duration: 10,
          quality: "Tinggi",
          aspectRatio: project.settings?.aspectRatio || project.aspectRatio || "16:9 Widescreen"
        },
        checklist: {
          narrationReady: true,
          referencesReady: false,
          storyboardReady: false,
          instructionsReady: true,
          aspectRatioSelected: true,
          qualitySelected: true,
          promptPackageReady: false,
          audioTimingReady: false,
          sceneEmotionReady: true,
          ttsAudioReady: false
        },
        references: [],
        storyboardPanels: []
      });
    }

    // Save scenes snapshot back to project repository
    projectRepository.saveProjectSnapshot(projectId, { scenes: processedScenes });
    logToBackendFile(`[SceneDraft] Successfully generated ${processedScenes.length} scenes for project ${projectId}`);

    return processedScenes;
  }
};

export default sceneDraftService;
