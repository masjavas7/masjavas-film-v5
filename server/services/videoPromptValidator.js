/**
 * videoPromptValidator.js
 * Validates a ScenePromptPackage before sending to the provider.
 */

function mapAspectRatio(ar) {
  if (!ar) return '16:9';
  const match = ar.match(/(\d+:\d+)/);
  if (match) return match[1];
  const normalized = ar.toLowerCase().trim();
  if (normalized.includes('widescreen') || normalized.includes('landscape')) return '16:9';
  if (normalized.includes('vertical') || normalized.includes('vertikal') || normalized.includes('portrait')) return '9:16';
  if (normalized.includes('square') || normalized.includes('kotak')) return '1:1';
  return '16:9';
}

/**
 * Validates a ScenePromptPackage before sending to the provider.
 * @param {object} promptPackage - ScenePromptPackage
 * @param {string} finalPrompt - the built video prompt text
 * @returns {object} { passed: boolean, warnings: string[], errors: string[] }
 */
export function validateVideoPrompt(promptPackage, finalPrompt) {
  const warnings = [];
  const errors = [];

  const pkg = promptPackage || {};
  const prompt = finalPrompt || '';

  const projectRatio = mapAspectRatio(pkg.settings?.aspectRatio);
  const projectDuration = pkg.settings?.durationSec || 10;

  // 1. Validate Aspect Ratio Sync Gates
  if (pkg.storyboard?.heroFrame) {
    const heroRatio = mapAspectRatio(pkg.storyboard.heroFrame.aspectRatio);
    if (heroRatio !== projectRatio) {
      errors.push('Rasio adegan belum sinkron dengan setup project.');
    }
  }

  if (pkg.storyboard?.aspectRatio) {
    const storyboardRatio = mapAspectRatio(pkg.storyboard.aspectRatio);
    if (storyboardRatio !== projectRatio) {
      if (!errors.includes('Rasio adegan belum sinkron dengan setup project.')) {
        errors.push('Rasio adegan belum sinkron dengan setup project.');
      }
    }
  }

  const videoRatio = mapAspectRatio(pkg.settings?.aspectRatio);
  if (videoRatio !== projectRatio) {
    if (!errors.includes('Rasio adegan belum sinkron dengan setup project.')) {
      errors.push('Rasio adegan belum sinkron dengan setup project.');
    }
  }

  // 2. Validate Duration Sync Gates (durationSec !== 10 or !== project settings)
  const durationSec = pkg.settings?.durationSec ?? pkg.scene?.durationSec;
  if (durationSec !== projectDuration || durationSec !== 10) {
    errors.push('Durasi adegan belum sesuai dengan setup project.');
  }

  // 1b. Validate that aspect ratio is explicitly set
  const aspectRatio = pkg.settings?.aspectRatio ?? pkg.scene?.aspectRatio;
  if (!aspectRatio) {
    errors.push('Aspect ratio project kosong. Harap atur aspect ratio terlebih dahulu.');
  }

  // 2. scene.narration exists and non-empty → error if missing
  const narration = pkg.scene?.narration;
  if (!narration || (typeof narration === 'string' && narration.trim() === '')) {
    errors.push('Scene narration is missing or empty. Narration is required for video generation.');
  }

  // 3. storyboard.panels.length > 0 → error if no panels
  const panels = pkg.storyboard?.panels;
  if (!panels || !Array.isArray(panels) || panels.length === 0) {
    errors.push('No storyboard panels found. At least one panel is required.');
  }

  // 4. referenceImages.length > 0 → error if no references (GrokPI supports native image-to-video)
  const referenceImages = pkg.referenceImages;
  if (!referenceImages || !Array.isArray(referenceImages) || referenceImages.length === 0) {
    errors.push('Tidak ada reference images. GrokPI native image-to-video membutuhkan minimal 1 reference image (heroFrame atau character reference).');
  }

  // 4b. heroFrame or storyboard image should exist
  const hasHeroFrame = referenceImages && referenceImages.some(r => r.role === 'storyboard_structure' && r.weight >= 0.3);
  const hasStoryboardImage = pkg.storyboard?.storyboardImageUrl || (referenceImages && referenceImages.some(r => r.role === 'storyboard_structure'));
  if (!hasHeroFrame && !hasStoryboardImage) {
    warnings.push('Tidak ada heroFrame atau storyboard image. Video akan kurang terstruktur.');
  }

  // 4c. character/environment references
  const hasCharacterRef = referenceImages && referenceImages.some(r => r.role === 'character_identity');
  const hasEnvironmentRef = referenceImages && referenceImages.some(r => r.role === 'environment_lock');
  if (!hasCharacterRef) {
    warnings.push('Tidak ada character reference. Identity lock (wajah, kostum, postur) mungkin berubah antar scene.');
  }
  if (!hasEnvironmentRef) {
    warnings.push('Tidak ada environment reference. Lokasi dan mood lighting mungkin tidak konsisten.');
  }

  // 5. finalPrompt includes 'storyboard' or 'structure' → warn if missing
  const promptLower = prompt.toLowerCase();
  if (!promptLower.includes('storyboard') && !promptLower.includes('structure')) {
    warnings.push('Final prompt does not mention storyboard or structure. Scene framing may be inconsistent.');
  }

  // 6. finalPrompt includes timing rule ('0.0–2.0s' or '2.0s') → warn if missing
  if (!prompt.includes('0.0–2.0s') && !prompt.includes('2.0s')) {
    warnings.push('Final prompt does not include audio timing rule. Narration timing may be incorrect.');
  }

  // 7. finalPrompt includes negative rule ('No storyboard grid' or 'no watermark') → warn if missing
  if (!promptLower.includes('no storyboard grid') && !promptLower.includes('no watermark')) {
    warnings.push('Final prompt does not include negative constraints. Unwanted artifacts may appear.');
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors
  };
}
