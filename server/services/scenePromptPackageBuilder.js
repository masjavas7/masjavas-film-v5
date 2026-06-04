/**
 * scenePromptPackageBuilder.js
 * Builds the complete ScenePromptPackage object from scene data and resolved references.
 */

import { resolveSceneReferences } from './sceneReferenceResolver.js';

/**
 * Maps quality label (Indonesian) to standard quality string.
 * @param {string} q - Quality label
 * @returns {string} 'high' | 'standard' | 'draft'
 */
function mapQuality(q) {
  if (!q) return 'standard';
  const normalized = q.toLowerCase().trim();
  if (normalized === 'tinggi' || normalized === 'high') return 'high';
  if (normalized === 'standar' || normalized === 'standard') return 'standard';
  if (normalized === 'draft' || normalized === 'rendah') return 'draft';
  return 'standard';
}

/**
 * Maps aspect ratio label to clean ratio string.
 * Extracts ratio from labels like '16:9 Widescreen', '9:16 Vertikal', '1:1 Square'.
 * @param {string} ar - Aspect ratio label
 * @returns {string} Clean ratio string e.g. '16:9'
 */
function mapAspectRatio(ar) {
  if (!ar) return '16:9';
  // Try to extract a ratio pattern like '16:9', '9:16', '1:1', '4:3'
  const match = ar.match(/(\d+:\d+)/);
  if (match) return match[1];
  // Fallback mappings
  const normalized = ar.toLowerCase().trim();
  if (normalized.includes('widescreen') || normalized.includes('landscape')) return '16:9';
  if (normalized.includes('vertical') || normalized.includes('vertikal') || normalized.includes('portrait')) return '9:16';
  if (normalized.includes('square') || normalized.includes('kotak')) return '1:1';
  return '16:9';
}

/**
 * Builds a complete ScenePromptPackage from scene data and resolved references.
 * @param {object} params - { projectId, sceneId, scene, references, storyboardPanels, heroFrame, storyboardImageUrl, videoInstruction, settings, previousSceneVideoUrl }
 * @returns {object} ScenePromptPackage
 */
export function buildScenePromptPackage(params) {
  const {
    projectId,
    sceneId,
    scene = {},
    references = [],
    storyboardPanels = [],
    heroFrame = null,
    storyboardImageUrl = null,
    videoInstruction = '',
    settings = {},
    previousSceneVideoUrl = null
  } = params || {};

  // Resolve all reference images
  const { referenceImages, summary } = resolveSceneReferences({
    references,
    storyboardPanels,
    heroFrame,
    storyboardImageUrl,
    previousSceneVideoUrl
  });

  // Build the ScenePromptPackage
  const promptPackage = {
    projectId,
    sceneId,
    sceneNumber: scene.sceneNumber,
    contentHash: `spp-${Date.now()}`,
    scene: {
      title: scene.title || '',
      narration: scene.narration || '',
      storyAction: scene.summary || scene.narration || '',
      durationSec: settings.durationSec || 10,
      emotion: 'Tegang, dramatis',
      goal: 'Meningkatkan ketegangan visual'
    },
    storyboard: {
      storyboardImageUrl: storyboardImageUrl || heroFrame?.imageUrl || null,
      heroFrame: heroFrame || null,
      panels: storyboardPanels || [],
      aspectRatio: mapAspectRatio(scene.aspectRatio)
    },
    references: {
      characterRefs: referenceImages.filter(r => r.role === 'character_identity'),
      environmentRefs: referenceImages.filter(r => r.role === 'environment_lock'),
      storyboardRef: referenceImages.find(r => r.role === 'storyboard_structure') || null,
      manualRefs: referenceImages.filter(r => r.role === 'manual_user_reference'),
      propRefs: referenceImages.filter(r => r.role === 'prop_lock'),
      creatureRefs: referenceImages.filter(r => r.role === 'creature_lock'),
      previousVideoRef: previousSceneVideoUrl
        ? { sceneId: 'previous', videoUrl: previousSceneVideoUrl }
        : null
    },
    videoInstruction: videoInstruction || '',
    settings: {
      mode: 'video',
      durationSec: settings.durationSec || 10,
      quality: mapQuality(settings.quality),
      aspectRatio: mapAspectRatio(settings.aspectRatio)
    },
    referenceImages,
    referenceSummary: summary
  };

  return promptPackage;
}
