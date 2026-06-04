/**
 * Test: Prompt Sterility Validator — Context-Aware Scanning
 * Validates that negative instructions (No narrator, etc.) are ALLOWED
 * and positive narration instructions are BLOCKED.
 */
import { validatePromptSterility } from '../services/promptSterilityValidator.js';

const PASS = '\x1b[32m✓ PASS\x1b[0m';
const FAIL = '\x1b[31m✗ FAIL\x1b[0m';
let passCount = 0;
let failCount = 0;

function test(description, promptText, expectPassed) {
  const result = validatePromptSterility(promptText);
  const ok = result.passed === expectPassed;
  if (ok) {
    console.log(`  ${PASS} ${description}`);
    passCount++;
  } else {
    console.log(`  ${FAIL} ${description}`);
    console.log(`    Expected passed=${expectPassed}, got passed=${result.passed}`);
    console.log(`    forbiddenPositiveMatches: ${JSON.stringify(result.forbiddenPositiveMatches)}`);
    console.log(`    allowedNegativeMatches: ${JSON.stringify(result.allowedNegativeMatches)}`);
    console.log(`    reason: ${result.reason}`);
    failCount++;
  }
}

console.log('\n=== Prompt Sterility Validator Tests ===\n');

// --- Should PASS (negative/exclusion instructions are allowed) ---
console.log('[Group 1] Negative instructions — should all PASS (sterile)');

test('No narrator voice. No voiceover.',
  'No narrator voice. No voiceover.',
  true);

test('Must NOT contain narrator',
  'This video must NOT contain any narrator voice, voiceover, narration, or spoken narration audio.',
  true);

test('No off-screen narration',
  'No off-screen narration. No voiceover. No narrator.',
  true);

test('Narration added separately as post-production overlay',
  'Narration will be added separately as a post-production overlay.',
  true);

test('Full Audio Sterility Rule section from videoPromptBuilder',
  `Audio Sterility Rule:
CRITICAL: This video must NOT contain any narrator voice, voiceover, narration, or spoken narration audio.
The audio track must contain ONLY:
- Ambient environmental SFX (wind, water, fire, footsteps, etc.)
- Cinematic score / background music
- Character micro-dialogue ONLY if the character is physically speaking on-screen
- No off-screen narration. No voiceover. No narrator.
Narration will be added separately as a post-production overlay.`,
  true);

test('Sound section with SFX and no narrator',
  'SFX: ambient wind. Music: cinematic score.\nNo narrator voice. No voiceover.',
  true);

test('Do not include voiceover',
  'Do not include voiceover or narrator.',
  true);

test('Tanpa narasi (Indonesian negative)',
  'Video ini tanpa narasi. Tanpa suara narator.',
  true);

test('Jangan pakai narator (Indonesian)',
  'Jangan pakai narator atau membacakan narasi.',
  true);

test('Exclude narration',
  'Exclude narration from audio. Exclude voiceover.',
  true);

test('Narration handled by Gemini TTS externally',
  'Narration is handled by Gemini TTS as an external overlay.',
  true);

// --- Should FAIL (positive narration instructions are violations) ---
console.log('\n[Group 2] Positive instructions — should all FAIL (not sterile)');

test('Add narrator voice at 2 seconds',
  'Add narrator voice at 2 seconds with deep baritone.',
  false);

test('Narration begins at 2.0s',
  'Narration begins at 2.0s: "The city awakens..."',
  false);

test('Include voiceover throughout',
  'Include voiceover throughout the scene.',
  false);

test('Narrator says in deep voice',
  'Narrator says in a deep voice: "The battle begins."',
  false);

test('Narator membacakan (Indonesian positive)',
  'Narator membacakan dengan suara berat.',
  false);

test('Voiceover reads the text',
  'Voiceover reads the text with emotion.',
  false);

// --- Edge cases ---
console.log('\n[Group 3] Edge cases');

test('Empty prompt',
  '',
  true);

test('Null prompt',
  null,
  true);

test('No narration terms at all',
  'Create a cinematic scene with dramatic lighting and ambient SFX.',
  true);

test('Mixed: one allowed negative + one real violation',
  'No voiceover in the background. Narrator begins reading the text.',
  false);

// Summary
console.log(`\n=== Results: ${passCount} passed, ${failCount} failed ===\n`);
process.exit(failCount > 0 ? 1 : 0);
