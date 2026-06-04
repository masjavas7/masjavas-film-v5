/**
 * audioDirectionBuilder.js
 * Builds detailed audio timing and pacing directions for a scene based on scene parameters.
 * Output is split into:
 *   - videoAudioDirection: SFX, music, ambient (for GrokPI video prompt — sterile, no narration)
 *   - ttsAudioDirection: narrationPacing, timing, voice tone (for Gemini TTS)
 * Top-level fields are preserved for backward compatibility.
 */

const EMOTION_TONE_MAP = {
  angry: 'controlled anger, low firm tone, restrained intensity',
  sad: 'soft, slow, fragile but clear, deep sadness',
  fearful: 'quiet, hesitant, slightly broken, high tension',
  tense: 'measured, urgent but restrained, medium-low tone',
  hopeful: 'warm, gentle, optimistic, light lifted endings',
  shocked: 'breathless, sharp pause, highly intense short delivery',
  determined: 'calm, confident, grounded, firm and unwavering',
  melancholic: 'low, reflective, slow, soft and melancholic',
  calm: 'peaceful, even tempo, steady and comforting',
  relieved: 'warm exhaling tone, gentle release of strain'
};

const EMOTION_PACING_MAP = {
  angry: 'deliberate, steady and sharp articulation, medium pacing',
  sad: 'slow cinematic, soft delivery, elongated pauses',
  fearful: 'slightly hesitant pacing, micro-pauses, rapid but low articulation',
  tense: 'cinematic medium-slow, clear articulation, high subtext tension',
  hopeful: 'warm cinematic, moderate pacing, clear and natural flow',
  shocked: 'brief staccato phrasing, distinct suspension',
  determined: 'firm cinematic, steady pacing, authoritative articulation',
  melancholic: 'reflective, slow-tempo cinematic pacing, soft tone',
  calm: 'smooth cinematic, calm and steady pacing',
  relieved: 'relaxed cinematic pacing, gentle and comforting cadence'
};

/**
 * Builds the audioDirection object based on emotion directions and panels.
 * @param {object} params - { emotionDirection, panels }
 * @returns {object} AudioDirection
 */
export function buildAudioDirection(params) {
  const { emotionDirection = {}, panels = [] } = params || {};
  const primary = emotionDirection.primaryEmotion || 'tense';

  // Determine sfxDirection dynamically from storyboard panels
  const sfxHints = panels
    .map(p => p.sfx)
    .filter(s => s && s !== '-' && s !== '—')
    .slice(0, 3);
  
  const sfxDirection = sfxHints.length > 0
    ? `${sfxHints.join(', ').toLowerCase()}, low ambient room tone`
    : 'soft room tone, distant ambience, subtle cinematic breathing';

  // Determine musicDirection dynamically based on emotion
  let musicDirection = 'low cinematic bed, subtle underscore';
  if (primary === 'angry') {
    musicDirection = 'low-frequency sub bass rumble, dark ominous drone';
  } else if (primary === 'sad' || primary === 'melancholic') {
    musicDirection = 'minimalist solitary piano notes, ambient melancholic strings';
  } else if (primary === 'fearful' || primary === 'tense') {
    musicDirection = 'tense repeating synth pulse, high-pitched horror string rise';
  } else if (primary === 'hopeful' || primary === 'relieved') {
    musicDirection = 'warm ambient pad, gentle cinematic cello bed';
  } else if (primary === 'shocked') {
    musicDirection = 'sudden dynamic impact, hollow reverb echo tail';
  } else if (primary === 'determined') {
    musicDirection = 'low marching percussion roll, rising brass harmony';
  }

  // Determine wordsPerSecondTarget based on emotion pacing
  let wordsPerSecondTarget = 3.2; // default
  if (primary === 'sad' || primary === 'melancholic') {
    wordsPerSecondTarget = 2.8;
  } else if (primary === 'fearful' || primary === 'shocked') {
    wordsPerSecondTarget = 3.5;
  } else if (primary === 'calm' || primary === 'relieved') {
    wordsPerSecondTarget = 3.0;
  }

  // Determine pauseDirection based on emotion
  let pauseDirection = 'brief emotional pause after key phrase';
  if (primary === 'sad') {
    pauseDirection = 'long emotional breath pause at punctuation';
  } else if (primary === 'shocked') {
    pauseDirection = 'extended stun pause, delayed verbal reaction';
  } else if (primary === 'angry') {
    pauseDirection = 'sharp deliberate pause for tension delivery';
  }

  const emotionTone = EMOTION_TONE_MAP[primary] || EMOTION_TONE_MAP.tense;
  const narrationPacing = EMOTION_PACING_MAP[primary] || EMOTION_PACING_MAP.tense;

  // Sub-object for GrokPI video prompt (sterile — no narration fields)
  const videoAudioDirection = {
    sfxDirection,
    musicDirection,
    dialogueEarliestStartSec: 5.5,
    dialogueLatestEndSec: 7.0
  };

  // Sub-object for Gemini TTS (narration timing and voice)
  const ttsAudioDirection = {
    narrationStartSec: 2.0,
    narrationEndSec: 5.5,
    narrationPacing,
    wordsPerSecondTarget,
    pauseDirection,
    emotionTone,
    voiceToneDirection: emotionTone
  };

  return {
    // Primary sub-objects (new API)
    videoAudioDirection,
    ttsAudioDirection,

    // Backward-compatible top-level fields
    narrationStartSec: 2.0,
    narrationEndSec: 5.5,
    dialogueEarliestStartSec: 5.5,
    dialogueLatestEndSec: 7.0,
    narrationPacing,
    wordsPerSecondTarget,
    pauseDirection,
    emotionTone,
    sfxDirection,
    musicDirection
  };
}
