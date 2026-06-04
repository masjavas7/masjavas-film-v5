/**
 * videoPromptBuilder.js
 * Builds the final video prompt text from a ScenePromptPackage.
 */

/**
 * Builds character reference lines from characterRefs.
 * @param {Array} characterRefs
 * @returns {string}
 */
function buildCharacterReferenceLines(characterRefs) {
  if (!characterRefs || characterRefs.length === 0) return '';
  return characterRefs.map((ref, i) =>
    `@[Character_${i + 1}] = identity and wardrobe lock for ${ref.title}. Use for face, skin tone, hair, body type, costume, posture.`
  ).join('\n');
}

/**
 * Builds environment reference lines from environmentRefs.
 * @param {Array} environmentRefs
 * @returns {string}
 */
function buildEnvironmentReferenceLines(environmentRefs) {
  if (!environmentRefs || environmentRefs.length === 0) return '';
  return environmentRefs.map((ref, i) =>
    `@[Environment_${i + 1}] = location and mood lock for ${ref.title}. Use for architecture, lighting, color palette, materials, atmosphere.`
  ).join('\n');
}

/**
 * Builds manual user reference lines.
 * @param {Array} manualRefs
 * @returns {string}
 */
function buildManualReferenceLines(manualRefs) {
  if (!manualRefs || manualRefs.length === 0) return '';
  return manualRefs.map((ref, i) =>
    `@[UserRef_${i + 1}] = visual reference for ${ref.title}.`
  ).join('\n');
}

/**
 * Builds the previous video continuity line.
 * @param {object|null} previousVideoRef
 * @returns {string}
 */
function buildPreviousVideoLine(previousVideoRef) {
  if (!previousVideoRef) return '';
  return '@[Previous_Scene] = Continue naturally from previous scene. Same lighting, same character state, same emotion.';
}

/**
 * Builds a beat map from storyboard panels.
 * Distributes panels across ~10 seconds in 5 beats.
 * @param {Array} panels
 * @returns {string}
 */
function buildBeatMap(panels) {
  if (!panels || panels.length === 0) {
    return [
      'Beat 1 (0.0–2.0s): Establish scene. Visual-only opening.',
      'Beat 2 (2.0–4.0s): Introduce main action.',
      'Beat 3 (4.0–6.0s): Build tension.',
      'Beat 4 (6.0–8.0s): Climactic moment.',
      'Beat 5 (8.0–10.0s): Resolution and transition.'
    ].join('\n');
  }

  const beatTimeRanges = [
    '0.0–2.0s',
    '2.0–4.0s',
    '4.0–6.0s',
    '6.0–8.0s',
    '8.0–10.0s'
  ];

  const beats = [];
  for (let i = 0; i < 5; i++) {
    const panel = panels[i] || panels[panels.length - 1];
    const action = panel.action || panel.description || panel.title || 'Continue scene action.';
    beats.push(`Beat ${i + 1} (${beatTimeRanges[i]}): ${action}`);
  }

  return beats.join('\n');
}

/**
 * Extracts dialogue from panel 3 if exists.
 * @param {Array} panels
 * @returns {string}
 */
function extractDialogue(panels) {
  if (!panels || panels.length < 3) return 'None.';
  const panel3 = panels[2];
  if (panel3.dialogue) return `"${panel3.dialogue}"`;
  if (panel3.dialog) return `"${panel3.dialog}"`;
  return 'None.';
}

/**
 * Extracts camera/shot types from panels.
 * @param {Array} panels
 * @returns {string}
 */
function extractCamera(panels) {
  if (!panels || panels.length === 0) {
    return 'Medium shot to close-up. Slow dolly forward. Eye-level angle.';
  }
  const cameraInstructions = panels
    .filter(p => p.camera || p.shotType || p.cameraAngle)
    .map(p => p.camera || p.shotType || p.cameraAngle);

  if (cameraInstructions.length === 0) {
    return 'Medium shot to close-up. Slow dolly forward. Eye-level angle.';
  }
  return cameraInstructions.join('. ') + '.';
}

/**
 * Derives motion from panel actions.
 * @param {Array} panels
 * @returns {string}
 */
function deriveMotion(panels) {
  if (!panels || panels.length === 0) {
    return 'Slow, deliberate movement. Subtle environmental motion.';
  }
  const motionHints = panels
    .filter(p => p.motion || p.action || p.movement)
    .map(p => p.motion || p.movement || p.action);

  if (motionHints.length === 0) {
    return 'Slow, deliberate movement. Subtle environmental motion.';
  }
  // Take unique hints, limit to 3
  const unique = [...new Set(motionHints)].slice(0, 3);
  return unique.join('. ') + '.';
}

/**
 * Derives style from videoInstruction or default.
 * @param {string} videoInstruction
 * @returns {string}
 */
function deriveStyle(videoInstruction) {
  if (videoInstruction && videoInstruction.trim()) {
    return videoInstruction.trim();
  }
  return 'Cinematic, high contrast, dramatic lighting';
}

/**
 * Derives SFX from panels.
 * @param {Array} panels
 * @returns {string}
 */
function deriveSfx(panels) {
  if (!panels || panels.length === 0) {
    return 'Ambient environmental sound. Subtle tension score.';
  }
  const sfxHints = panels
    .filter(p => p.sfx || p.sound || p.audio)
    .map(p => p.sfx || p.sound || p.audio);

  if (sfxHints.length === 0) {
    return 'Ambient environmental sound. Subtle tension score.';
  }
  return sfxHints.join('. ') + '.';
}

/**
 * Builds a production-quality video prompt from a ScenePromptPackage.
 * @param {object} promptPackage - the full ScenePromptPackage
 * @returns {string} finalVideoPrompt
 */
export function buildVideoPrompt(promptPackage) {
  const {
    sceneNumber = 1,
    scene = {},
    storyboard = {},
    references = {},
    videoInstruction = '',
    audioDirection = {},
    emotionDirection = {},
    compressedNarration = '',
    settings = {}
  } = promptPackage || {};

  const aspectRatio = settings.aspectRatio || '16:9';
  let aspectPromptPart = 'widescreen cinematic 16:9';
  if (aspectRatio.includes('9:16') || aspectRatio === '9:16') {
    aspectPromptPart = 'vertical cinematic 9:16';
  } else if (aspectRatio.includes('1:1') || aspectRatio === '1:1') {
    aspectPromptPart = 'square 1:1';
  } else if (aspectRatio.includes('21:9') || aspectRatio === '21:9') {
    aspectPromptPart = 'widescreen ultra-wide 21:9';
  }

  const {
    characterRefs = [],
    environmentRefs = [],
    manualRefs = [],
    previousVideoRef = null
  } = references;

  const panels = storyboard.panels || [];

  // Extract variables for Audio Timing & Pacing
  const {
    narrationPacing = "calm cinematic, medium-slow, clear articulation",
    emotionTone = "restrained sadness",
    sfxDirection = "soft room tone, distant ambience, subtle breath",
    musicDirection = "low cinematic bed, subtle underscore"
  } = audioDirection;

  // Extract variables for Emotion & Acting
  const {
    primaryEmotion = "tense",
    emotionalIntensity = 3,
    expressionDirection = "focused gaze, controlled breathing, micro tension",
    bodyLanguageDirection = "minimal movement, readiness",
    voiceToneDirection = "low, measured, urgent but not rushed"
  } = emotionDirection;

  // Build each section
  const characterLines = buildCharacterReferenceLines(characterRefs);
  const environmentLines = buildEnvironmentReferenceLines(environmentRefs);
  const manualLines = buildManualReferenceLines(manualRefs);
  const previousVideoLine = buildPreviousVideoLine(previousVideoRef);
  const beatMap = buildBeatMap(panels);
  const dialogue = scene.dialogue && scene.dialogue !== '-' && scene.dialogue !== '—'
    ? `"${scene.dialogue}"`
    : extractDialogue(panels);
  const camera = extractCamera(panels);
  const motion = deriveMotion(panels);
  const style = deriveStyle(videoInstruction);
  const sfx = sfxDirection || deriveSfx(panels);

  // Assemble the prompt
  const sections = [];

  // References section
  const refLines = [
    'References:',
    `@[Storyboard_Scene_${sceneNumber}] = scene structure only.`,
    'Use this only for story flow, framing, action order, emotional beats, camera rhythm, and transition.',
    'Do not show storyboard grid, panel borders, numbers, labels, captions, arrows, or poster layout.'
  ];
  if (characterLines) refLines.push('', characterLines);
  if (environmentLines) refLines.push('', environmentLines);
  if (manualLines) refLines.push('', manualLines);
  if (previousVideoLine) refLines.push('', previousVideoLine);
  sections.push(refLines.join('\n'));

  // Task section
  sections.push([
    'Task:',
    `Create Scene ${sceneNumber} of the same cinematic short film.`,
    'Duration: 10 seconds.',
    'Continue naturally from the previous scene if provided.',
    'Do not restart the story.'
  ].join('\n'));

  // Reference Use section
  sections.push([
    'Reference Use:',
    'Use character references only to preserve face, skin tone, hairstyle, body type, wardrobe, posture, and key props.',
    'Use environment references only to preserve location layout, lighting, color palette, materials, and atmosphere.',
    'Use storyboard reference only for structure, shot flow, emotional beats, and transition.',
    'Use previous video only for continuity.'
  ].join('\n'));

  // Visual Timing section
  sections.push([
    'Visual Timing:',
    '0.0–2.0s: Visual opening, establish scene. Silent or ambient SFX only.',
    '2.0–5.5s: Main action and emotional peak.',
    '5.5–7.0s: Character micro-dialogue if applicable (on-screen lip-synced speech only).',
    '7.0–10.0s: Resolution, transition beat.'
  ].join('\n'));

  // Emotion & Performance Direction section
  sections.push([
    'Emotion & Performance Direction:',
    `- Primary emotion: ${primaryEmotion}`,
    `- Emotional intensity: ${emotionalIntensity}`,
    `- Facial expression: ${expressionDirection}`,
    `- Body language: ${bodyLanguageDirection}`,
    '- Acting style: cinematic, realistic, restrained, not theatrical.',
    '- Match expression to the story beat, not exaggerated.'
  ].join('\n'));

  // Story Action section
  sections.push([
    'Story Action:',
    scene.storyAction || scene.summary || 'Continue the cinematic narrative.'
  ].join('\n'));

  // Beat Map section
  sections.push([
    'Beat Map:',
    beatMap
  ].join('\n'));



  // Dialogue section
  sections.push([
    'Dialogue:',
    dialogue
  ].join('\n'));

  // Camera section
  sections.push([
    'Camera:',
    camera
  ].join('\n'));

  // Motion section
  sections.push([
    'Motion:',
    motion
  ].join('\n'));

  // Style section
  sections.push([
    'Style:',
    `${style}. Enforce aspect ratio: ${aspectPromptPart}.`
  ].join('\n'));

  // Sound section (SFX-only, no voice)
  sections.push([
    'Sound:',
    `SFX: ${sfx}. Music: ${musicDirection}.`,
    'No narrator voice. No voiceover.'
  ].join('\n'));

  // Audio Sterility Rule section
  sections.push([
    'Audio Sterility Rule:',
    'CRITICAL: This video must NOT contain any narrator voice, voiceover, narration, or spoken narration audio.',
    'The audio track must contain ONLY:',
    '- Ambient environmental SFX (wind, water, fire, footsteps, etc.)',
    '- Cinematic score / background music',
    '- Character micro-dialogue ONLY if the character is physically speaking on-screen',
    '- No off-screen narration. No voiceover. No narrator.',
    'Narration will be added separately as a post-production overlay.'
  ].join('\n'));

  // Negative section
  sections.push([
    'Negative:',
    'No storyboard grid, no panel borders, no labels, no captions, no subtitles, no visible text, no watermark, no logo, no face drift, no wardrobe drift, no environment drift, no unrelated genre, no generic stock footage, no template video.'
  ].join('\n'));

  return sections.join('\n\n');
}
