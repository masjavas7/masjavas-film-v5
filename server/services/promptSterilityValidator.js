/**
 * promptSterilityValidator.js
 * Validates that a final video prompt is STERILE from all narration/voiceover instructions.
 * Uses context-aware sentence-level scanning to avoid false positives from negative instructions.
 */

const FORBIDDEN_TERMS = [
  'narrator', 'narration', 'voiceover', 'voice-over', 'voice over',
  'narrator voice', 'spoken narration', 'narration track',
  'narator', 'narasi', 'membacakan narasi', 'suara narator'
];

const NEGATION_PREFIXES = [
  'no ', 'not ', 'don\'t ', 'do not ', 'must not ', 'never ', 'exclude ',
  'without ', 'tanpa ', 'jangan ', 'bukan ', 'tidak boleh ',
  'not contain', 'not include'
];

const SEPARATION_KEYWORDS = [
  'separately', 'post-production', 'external', 'gemini tts',
  'muxed later', 'added later', 'overlay',
  'di luar video', 'secara terpisah', 'ditambahkan kemudian'
];

/**
 * Validates that a final video prompt is sterile from positive narration/voiceover instructions.
 * Splits the prompt into sentences and classifies each one contextually.
 *
 * @param {string} promptText - The final video prompt text to validate
 * @returns {{ passed: boolean, forbiddenPositiveMatches: string[], allowedNegativeMatches: string[], reason: string }}
 */
export function validatePromptSterility(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    return { passed: true, forbiddenPositiveMatches: [], allowedNegativeMatches: [], reason: 'Empty prompt' };
  }

  const sentences = promptText.split(/[.\n]/).map(s => s.trim()).filter(Boolean);
  const forbiddenPositiveMatches = [];
  const allowedNegativeMatches = [];

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();

    for (const term of FORBIDDEN_TERMS) {
      const termIndex = lowerSentence.indexOf(term);
      if (termIndex === -1) continue;

      const beforeTerm = lowerSentence.substring(0, termIndex);
      const hasNegation = NEGATION_PREFIXES.some(prefix => beforeTerm.includes(prefix));
      const hasSeparation = SEPARATION_KEYWORDS.some(kw => lowerSentence.includes(kw));

      if (hasNegation || hasSeparation) {
        allowedNegativeMatches.push(sentence);
      } else {
        forbiddenPositiveMatches.push(sentence);
      }
      break;
    }
  }

  const passed = forbiddenPositiveMatches.length === 0;
  let reason;
  if (passed) {
    reason = allowedNegativeMatches.length > 0
      ? `Sterile. ${allowedNegativeMatches.length} negative instruction(s) correctly allowed.`
      : 'Sterile. No narration terms found.';
  } else {
    reason = `${forbiddenPositiveMatches.length} positive narration instruction(s) detected as violation(s).`;
  }

  return { passed, forbiddenPositiveMatches, allowedNegativeMatches, reason };
}
