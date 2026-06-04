/**
 * sceneReferenceResolver.js
 * Resolves and categorizes all reference assets for a scene.
 */

/**
 * Creates a ProviderReferenceImage object.
 * @param {object} params
 * @returns {object} ProviderReferenceImage
 */
function createProviderReferenceImage({ imageUrl, role, weight, title, category, usageRule }) {
  return {
    id: `ref-${role}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    imageUrl: imageUrl || null,
    role: role || 'manual_user_reference',
    weight: typeof weight === 'number' ? weight : 0.10,
    title: title || 'Untitled',
    category: category || 'unknown',
    usageRule: usageRule || ''
  };
}

/**
 * Resolves and categorizes all reference assets for a scene.
 * @param {object} sceneData - { references, storyboardPanels, heroFrame, storyboardImageUrl, previousSceneVideoUrl }
 * @returns {object} { referenceImages: ProviderReferenceImage[], summary: object }
 */
export function resolveSceneReferences(sceneData) {
  const {
    references = [],
    storyboardPanels = [],
    heroFrame = null,
    storyboardImageUrl = null,
    previousSceneVideoUrl = null
  } = sceneData || {};

  const referenceImages = [];
  let characterCount = 0;
  let environmentCount = 0;
  let storyboardCount = 0;
  let manualCount = 0;

  // 1. Map category 'Karakter' references → role 'character_identity'
  const karakterRefs = references.filter(r => r.category === 'Karakter');
  for (const ref of karakterRefs) {
    if (ref.imageUrl || ref.url) {
      referenceImages.push(createProviderReferenceImage({
        imageUrl: ref.imageUrl || ref.url,
        role: 'character_identity',
        weight: 0.30,
        title: ref.title || ref.name || 'Character',
        category: 'Karakter',
        usageRule: 'Lock face, skin tone, hairstyle, body type, wardrobe, posture. Preserve identity across all frames.'
      }));
      characterCount++;
    }
  }

  // 2. Map category 'Lokasi' references → role 'environment_lock'
  const lokasiRefs = references.filter(r => r.category === 'Lokasi');
  for (const ref of lokasiRefs) {
    if (ref.imageUrl || ref.url) {
      referenceImages.push(createProviderReferenceImage({
        imageUrl: ref.imageUrl || ref.url,
        role: 'environment_lock',
        weight: 0.20,
        title: ref.title || ref.name || 'Environment',
        category: 'Lokasi',
        usageRule: 'Lock location layout, lighting conditions, color palette, materials, and atmospheric mood.'
      }));
      environmentCount++;
    }
  }

  // 3. Map categories 'Mood', 'Style', 'Referensi Tambahan' → role 'manual_user_reference'
  const manualCategories = ['Mood', 'Style', 'Referensi Tambahan'];
  const manualRefs = references.filter(r => manualCategories.includes(r.category));
  for (const ref of manualRefs) {
    if (ref.imageUrl || ref.url) {
      referenceImages.push(createProviderReferenceImage({
        imageUrl: ref.imageUrl || ref.url,
        role: 'manual_user_reference',
        weight: 0.25,
        title: ref.title || ref.name || 'Visual Reference',
        category: ref.category,
        usageRule: `Visual reference for ${ref.category.toLowerCase()}. Use as stylistic guidance.`
      }));
      manualCount++;
    }
  }

  // 4. If heroFrame?.imageUrl exists, add as 'storyboard_structure'
  const hasHeroFrame = !!(heroFrame && heroFrame.imageUrl);
  if (hasHeroFrame) {
    referenceImages.push(createProviderReferenceImage({
      imageUrl: heroFrame.imageUrl,
      role: 'storyboard_structure',
      weight: 0.35,
      title: heroFrame.title || 'Hero Frame',
      category: 'Storyboard',
      usageRule: 'Use for scene structure, framing, beat order, and emotional rhythm. Do not reproduce storyboard grid or labels.'
    }));
    storyboardCount++;
  }

  // 5. Storyboard panels with imageUrl → also 'storyboard_structure'
  for (const panel of storyboardPanels) {
    if (panel.imageUrl) {
      referenceImages.push(createProviderReferenceImage({
        imageUrl: panel.imageUrl,
        role: 'storyboard_structure',
        weight: 0.15,
        title: panel.title || `Panel ${panel.panelNumber || ''}`.trim(),
        category: 'Storyboard',
        usageRule: 'Use for story flow, framing, and action sequence. Do not reproduce panel borders or labels.'
      }));
      storyboardCount++;
    }
  }

  // 6. If previousSceneVideoUrl exists, note it but don't add as image reference (it's a video)
  const hasPreviousVideo = !!previousSceneVideoUrl;

  // 7. Return referenceImages and summary
  const summary = {
    characterCount,
    environmentCount,
    storyboardCount,
    manualCount,
    hasPreviousVideo,
    hasHeroFrame
  };

  return { referenceImages, summary };
}
