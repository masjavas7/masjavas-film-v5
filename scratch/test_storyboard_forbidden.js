import { validateCompressedNarrationQuality } from '../server/services/compressedNarrationQualityValidator.js';
import { validateAudioTiming } from '../server/services/audioTimingValidator.js';

console.log('--- STARTING DIAGNOSTIC VALIDATION AND SEMANTIC TESTS ---');

// 1. Verify that short word counts (like 7 words) are no longer blocked as errors
console.log('Testing validateCompressedNarrationQuality with a naturally short 7-word narration...');
const result1 = validateCompressedNarrationQuality(
  'Rio menatap layang-layang terakhir miliknya sedih.', // 7 words Indonesian
  'Rio menatap layang-layang terakhir miliknya sedih di bawah sore kelabu.'
);

console.log('Short narration validation result:', JSON.stringify(result1));

if (!result1.passed) {
  console.error('FAILED: validateCompressedNarrationQuality should pass for 7 words since it is a warning now!');
  process.exit(1);
} else {
  console.log('PASSED: Short narration is treated as a warning guideline, not a hard error.');
}

// 2. Verify that dangling connector check is still a hard error to protect visual acting direction
console.log('Testing validateCompressedNarrationQuality with a dangling connector ("dan")...');
const result2 = validateCompressedNarrationQuality(
  'Rio menatap layang-layang terakhir miliknya dengan sedih dan',
  'Rio menatap layang-layang terakhir miliknya dengan sedih dan...'
);

console.log('Dangling connector validation result:', JSON.stringify(result2));
if (result2.passed || !result2.errors.some(e => e.includes('kata sambung menggantung'))) {
  console.error('FAILED: Dangling connector check should return a blocking error!');
  process.exit(1);
} else {
  console.log('PASSED: Dangling connector correctly blocks generation.');
}

// 3. Verify validateAudioTiming timing plan and keyword warnings
console.log('Testing validateAudioTiming with timing guidelines...');
const mockPackage = {
  scene: {
    narration: 'Rio menatap layang-layang terakhir miliknya sedih.'
  },
  audioDirection: {
    narrationStartSec: 2.0,
    dialogueEarliestStartSec: 6.0,
    emotionTone: 'sad, slow pacing'
  },
  emotionDirection: {
    primaryEmotion: 'sadness'
  },
  compressedNarration: 'Rio menatap layang-layang terakhir miliknya sedih.'
};

const result3 = validateAudioTiming(
  mockPackage,
  '0.0–2.0s visual only, narration begins exactly at 2.0s. Rio menatap layang-layang terakhir miliknya sedih. Dialogue, if used, only after 5.5s. Tone: sadness, voice sad, slow pacing.'
);

console.log('Audio timing validation result:', JSON.stringify(result3));
if (!result3.passed) {
  console.error('FAILED: validateAudioTiming should pass with all warning checks converted to guidelines!');
  process.exit(1);
} else {
  console.log('PASSED: Audio timing validation is fully advisory for guidelines.');
}

console.log('--- ALL PROGRAMMATIC DIAGNOSTIC TESTS PASSED SUCCESSFULY ---');
process.exit(0);
