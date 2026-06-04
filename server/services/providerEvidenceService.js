/**
 * providerEvidenceService.js
 * 
 * Tracks and reports provider evidence for every pipeline output.
 * Ensures that "success" claims are backed by real provider output,
 * not fallback placeholders.
 * 
 * Status Definitions:
 * - SUCCESS_REAL:     Real output from provider (GrokPI image/video, Gemini TTS audio)
 * - FALLBACK_UX:      Placeholder/fallback rendered for UX safety, NOT production output
 * - PENDING:          Not yet processed
 * - FAILED:           Provider failed, no output at all
 */

import { logToBackendFile } from '../utils/logger.js';

/**
 * Analyzes reference items and returns provider evidence summary
 * @param {Array} references - Array of reference items
 * @returns {object} evidence summary
 */
export function analyzeReferenceEvidence(references) {
  if (!references || references.length === 0) {
    return {
      totalItems: 0,
      realCount: 0,
      fallbackCount: 0,
      overallStatus: 'PENDING',
      details: []
    };
  }

  const details = references.map(ref => ({
    id: ref.id,
    title: ref.title,
    isReal: ref.isReal === true,
    providerSource: ref.providerSource || 'unknown',
    status: ref.isReal === true ? 'SUCCESS_REAL' : 'FALLBACK_UX'
  }));

  const realCount = details.filter(d => d.isReal).length;
  const fallbackCount = details.filter(d => !d.isReal).length;

  let overallStatus;
  if (realCount === details.length) {
    overallStatus = 'SUCCESS_REAL';
  } else if (realCount > 0) {
    overallStatus = 'PARTIAL_REAL';
  } else if (fallbackCount > 0) {
    overallStatus = 'FALLBACK_UX';
  } else {
    overallStatus = 'FAILED';
  }

  return {
    totalItems: details.length,
    realCount,
    fallbackCount,
    overallStatus,
    details
  };
}

/**
 * Analyzes storyboard panels and returns provider evidence summary
 * @param {Array} panels - Array of storyboard panels
 * @returns {object} evidence summary
 */
export function analyzeStoryboardEvidence(panels) {
  if (!panels || panels.length === 0) {
    return {
      totalPanels: 0,
      realCount: 0,
      fallbackCount: 0,
      overallStatus: 'PENDING',
      details: []
    };
  }

  const details = panels.map(panel => ({
    id: panel.id,
    panelNumber: panel.panelNumber,
    isReal: panel.isReal === true,
    providerSource: panel.providerSource || 'unknown',
    status: panel.isReal === true ? 'SUCCESS_REAL' : 'FALLBACK_UX'
  }));

  const realCount = details.filter(d => d.isReal).length;
  const fallbackCount = details.filter(d => !d.isReal).length;

  let overallStatus;
  if (realCount === details.length) {
    overallStatus = 'SUCCESS_REAL';
  } else if (realCount > 0) {
    overallStatus = 'PARTIAL_REAL';
  } else if (fallbackCount > 0) {
    overallStatus = 'FALLBACK_UX';
  } else {
    overallStatus = 'FAILED';
  }

  return {
    totalPanels: details.length,
    realCount,
    fallbackCount,
    overallStatus,
    details
  };
}

/**
 * Generates a full project provider evidence report
 * @param {object} projectData - Full project data including scenes
 * @returns {object} comprehensive evidence report
 */
export function generateProjectEvidenceReport(projectData) {
  const scenes = projectData.scenes || [];
  const references = projectData.references || [];

  const refEvidence = analyzeReferenceEvidence(references);

  const sceneEvidences = scenes.map(scene => {
    const storyboardEvidence = analyzeStoryboardEvidence(scene.storyboardPanels || []);
    const heroFrameReal = scene.heroFrame?.isReal === true;

    return {
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      storyboard: storyboardEvidence,
      heroFrame: {
        exists: !!scene.heroFrame,
        isReal: heroFrameReal,
        status: scene.heroFrame ? (heroFrameReal ? 'SUCCESS_REAL' : 'FALLBACK_UX') : 'PENDING'
      },
      video: {
        exists: !!scene.previewVideoUrl,
        status: scene.previewVideoUrl ? 'SUCCESS_REAL' : 'PENDING'
      },
      tts: {
        exists: !!scene.ttsAudioPath,
        status: scene.ttsAudioPath ? 'SUCCESS_REAL' : 'PENDING'
      }
    };
  });

  const report = {
    projectId: projectData.id || projectData.projectId,
    projectTitle: projectData.title,
    generatedAt: new Date().toISOString(),
    references: refEvidence,
    scenes: sceneEvidences,
    voiceLock: projectData.lockedVoice || null,
    summary: {
      totalScenes: scenes.length,
      scenesWithRealStoryboard: sceneEvidences.filter(s => s.storyboard.overallStatus === 'SUCCESS_REAL').length,
      scenesWithFallbackStoryboard: sceneEvidences.filter(s => ['FALLBACK_UX', 'PARTIAL_REAL'].includes(s.storyboard.overallStatus)).length,
      scenesWithRealVideo: sceneEvidences.filter(s => s.video.status === 'SUCCESS_REAL').length,
      scenesWithRealTts: sceneEvidences.filter(s => s.tts.status === 'SUCCESS_REAL').length,
      referenceStatus: refEvidence.overallStatus,
      voiceLocked: !!projectData.lockedVoice
    }
  };

  logToBackendFile(`[ProviderEvidence] Project ${report.projectId}: refs=${refEvidence.overallStatus} storyboards=${report.summary.scenesWithRealStoryboard}/${scenes.length} real`);

  return report;
}
