/**
 * audioTimingValidator.js
 * Validates audio, dialogue word counts, timing parameters, and final prompt contents
 * against production-quality audio guidelines.
 */
import { validateCompressedNarrationQuality } from './compressedNarrationQualityValidator.js';
import { validatePromptSterility } from './promptSterilityValidator.js';

/**
 * Validates scene prompt package and final prompt text for audio compliance.
 * @param {object} promptPackage - The ScenePromptPackage containing scene metadata, audioDirection, emotionDirection, compressedNarration, etc.
 * @param {string} finalPrompt - The final generated prompt text
 * @returns {object} { passed: boolean, warnings: Array<string>, errors: Array<string> }
 */
export function validateAudioTiming(promptPackage, finalPrompt) {
  const errors = [];
  const warnings = [];

  const { scene = {}, audioDirection = {}, emotionDirection = {}, compressedNarration } = promptPackage || {};
  const narration = compressedNarration || scene.narration || '';
  const dialogue = scene.dialogue || '';

  // 1. Narration must not be empty (HARD FAIL)
  if (!narration.trim()) {
    errors.push('Narasi tidak boleh kosong.');
  }

  // 2. Narration word count <= 18 (Advisory Guideline)
  const narrationWordCount = narration.split(/\s+/).filter(Boolean).length;
  if (narrationWordCount > 18) {
    warnings.push(`Jumlah kata narasi (${narrationWordCount}) melebihi batas ideal 18 kata.`);
  }

  // 3. Dialogue word count <= 7 if dialogue exists (Advisory Guideline)
  if (dialogue && dialogue.trim() !== '-' && dialogue.trim() !== '—') {
    const dialogueWordCount = dialogue.split(/\s+/).filter(Boolean).length;
    if (dialogueWordCount > 7) {
      warnings.push(`Jumlah kata dialog (${dialogueWordCount}) melebihi batas ideal 7 kata.`);
    }
  }

  // 4. audioStartSec must be 2.0 (Advisory Guideline)
  if (audioDirection.narrationStartSec !== 2.0) {
    warnings.push(`Waktu mulai narasi audio harus tepat 2.0 detik (saat ini ${audioDirection.narrationStartSec || 'belum diatur'}).`);
  }

  // 5. dialogueStartSec must be >= 5.5 (Advisory Guideline)
  if (dialogue && dialogue.trim() !== '-' && dialogue.trim() !== '—') {
    if (audioDirection.dialogueEarliestStartSec < 5.5) {
      warnings.push(`Waktu mulai dialog tidak boleh kurang dari 5.5 detik (saat ini ${audioDirection.dialogueEarliestStartSec || 'belum diatur'}).`);
    }
  }

  // 6. prompt contents checks (case-insensitive keyword matching - Advisory Guideline)
  const lowerPrompt = (finalPrompt || '').toLowerCase();
  
  if (!lowerPrompt.includes('visual opening') && !lowerPrompt.includes('0.0–2.0s')) {
    warnings.push('Prompt tidak memuat instruksi Visual Timing pembukaan.');
  }

  // Check for Audio Sterility Rule keyword
  if (!lowerPrompt.includes('audio sterility')) {
    warnings.push('Prompt tidak memuat instruksi mandatory "Audio Sterility Rule".');
  }

  // Sterility check: prompt must NOT contain positive narration instructions
  const sterilityResult = validatePromptSterility(finalPrompt);
  if (!sterilityResult.passed) {
    for (const violation of sterilityResult.forbiddenPositiveMatches) {
      errors.push(`Prompt sterility violation: ${violation}`);
    }
  }

  // 7. Prompt must contain voice tone direction
  if (audioDirection.emotionTone) {
    const tonePart = audioDirection.emotionTone.toLowerCase();
    // Check if parts of the tone are present in the final prompt text
    const words = tonePart.split(',').map(w => w.trim()).filter(Boolean);
    const hasTone = words.some(w => lowerPrompt.includes(w));
    if (!hasTone) {
      warnings.push(`Petunjuk intonasi suara (${audioDirection.emotionTone}) mungkin terlewat di prompt teks.`);
    }
  } else {
    warnings.push('Petunjuk intonasi suara tidak diatur.');
  }

  // 8. Prompt must contain emotion direction
  if (emotionDirection.primaryEmotion) {
    if (!lowerPrompt.includes(emotionDirection.primaryEmotion.toLowerCase())) {
      warnings.push(`Emosi utama (${emotionDirection.primaryEmotion}) mungkin terlewat di prompt teks.`);
    }
  } else {
    warnings.push('Emosi adegan belum diekstrak.');
  }

  // 9. Compressed Narration Quality checks
  if (compressedNarration) {
    const qualityCheck = validateCompressedNarrationQuality(compressedNarration, scene.narration || '');
    if (!qualityCheck.passed) {
      errors.push(...qualityCheck.errors);
    }
    warnings.push(...qualityCheck.warnings);
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors,
    sterilityResult
  };
}
