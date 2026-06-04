/**
 * providerPayloadBuilder.js
 * Builds the provider-ready payload for GrokPI video generation.
 *
 * GrokPI native image-to-video: the FIRST image_url in the multimodal
 * content array is used as the primary reference_image (api.md §8.5).
 *
 * This builder ensures referenceImages are ordered by priority:
 *   1. heroFrame (storyboard_structure, weight 0.35)
 *   2. character_identity (weight 0.30)
 *   3. environment_lock (weight 0.20)
 *   4. storyboard panel beats (storyboard_structure, weight 0.15)
 *   5. manual_user_reference (weight 0.25)
 */

/**
 * Resolution mapping from quality tier to resolution name.
 */
const resolutionMap = {
  high: '720p',
  standard: '480p',
  draft: '480p'
};

/**
 * Priority order for reference roles.
 * Lower number = higher priority = sent first to GrokPI.
 */
const ROLE_PRIORITY = {
  'storyboard_structure': 1,  // heroFrame has highest weight (0.35) within this role
  'character_identity': 2,
  'environment_lock': 3,
  'prop_lock': 4,
  'creature_lock': 5,
  'manual_user_reference': 6
};

/**
 * Sorts reference images by priority for GrokPI consumption.
 * - Primary sort: role priority (heroFrame/storyboard first)
 * - Secondary sort: weight descending (heroFrame 0.35 > panel 0.15)
 * @param {Array} referenceImages
 * @returns {Array} sorted and filtered reference images
 */
function sortReferencesByPriority(referenceImages) {
  return [...referenceImages]
    .filter(ref => ref && ref.imageUrl)
    .sort((a, b) => {
      const priorityA = ROLE_PRIORITY[a.role] || 99;
      const priorityB = ROLE_PRIORITY[b.role] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (b.weight || 0) - (a.weight || 0);
    });
}

/**
 * Builds the provider-ready payload for GrokPI video generation.
 * @param {object} promptPackage - ScenePromptPackage
 * @param {string} finalPrompt - the built video prompt text
 * @returns {object} Provider-ready payload with priority-sorted referenceImages
 */
export function buildProviderPayload(promptPackage, finalPrompt) {
  const pkg = promptPackage || {};
  const settings = pkg.settings || {};

  const quality = settings.quality || 'standard';
  const aspectRatio = settings.aspectRatio || '16:9';
  const durationSec = settings.durationSec || 10;

  // Sort reference images by priority for GrokPI native image-to-video
  const sortedReferenceImages = sortReferencesByPriority(pkg.referenceImages || []);

  return {
    prompt: finalPrompt || '',
    model: 'grok-imagine-1.0-video',
    durationSec,
    aspectRatio,
    quality,
    resolution_name: resolutionMap[quality] || '480p',
    referenceImages: sortedReferenceImages,
    nativeImageToVideo: sortedReferenceImages.length > 0
  };
}
