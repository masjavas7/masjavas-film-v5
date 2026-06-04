/**
 * narrationFitService.js
 * 
 * TTS Narration Fitting Pipeline — Memastikan setiap narasi scene
 * cocok (fit) ke dalam durasi 10 detik tanpa terpotong.
 * 
 * Pipeline:
 * A. Hitung karakter & kata
 * B. Estimasi durasi baca
 * C. Tentukan apakah narasi bisa masuk 10 detik
 * D. Jika terlalu panjang → compress tanpa hilangkan esensi
 * E. Atur pacing berdasarkan panjang & emosi
 * F. Generate TTS
 * G. Validasi durasi audio via ffprobe
 * H. Retry jika cutoff terdeteksi
 * 
 * TTS LENGTH RULES (Bahasa Indonesia, scene 10 detik):
 * - Safe speech window: 8.5 - 9.2 detik
 * - Ideal: 16-24 kata, 90-150 karakter
 * - Maksimal aman: 28 kata, 180 karakter
 * - > 28 kata atau > 180 karakter: wajib compress
 */

import { compressNarrationWithMode, cleanAndFormatNarration } from './narrationCompressor.js';
import { logToBackendFile } from '../utils/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCENE_DURATION_SEC = 10;
const SAFE_SPEECH_WINDOW_SEC = 9.0;
const TTS_START_DELAY_SEC = 2.0; // narration starts at 2.0s
const EFFECTIVE_SPEECH_WINDOW = SAFE_SPEECH_WINDOW_SEC - TTS_START_DELAY_SEC; // 7.0s for actual speech

// Indonesian speech rate baseline (words per second)
const ID_WPS_SLOW = 2.0;
const ID_WPS_MEDIUM = 2.8;
const ID_WPS_FAST = 3.5;

// Word/character limits
const WORD_LIMIT_IDEAL_MIN = 12;
const WORD_LIMIT_IDEAL_MAX = 24;
const WORD_LIMIT_SAFE_MAX = 28;
const CHAR_LIMIT_IDEAL_MIN = 90;
const CHAR_LIMIT_IDEAL_MAX = 150;
const CHAR_LIMIT_SAFE_MAX = 180;

// Maximum retry count for TTS regeneration
const MAX_FIT_RETRY = 2;

// ─── Pacing & Intonation Mapping ──────────────────────────────────────────────

const EMOTION_PACING_MAP = {
  // Emotion → { pacing, intonation, tempoModifier }
  angry:       { pacing: 'medium',      intonation: 'firm, restrained anger, sharp articulation, stable volume', tempoModifier: 1.0 },
  shocked:     { pacing: 'medium-fast',  intonation: 'urgent, startled clarity', tempoModifier: 1.1 },
  fearful:     { pacing: 'medium',      intonation: 'controlled tension, stronger word emphasis', tempoModifier: 1.0 },
  tense:       { pacing: 'medium',      intonation: 'controlled tension, deliberate pacing', tempoModifier: 1.0 },
  sad:         { pacing: 'medium-slow', intonation: 'low, warm, fragile, natural micro-pauses', tempoModifier: 0.9 },
  melancholic: { pacing: 'medium-slow', intonation: 'low, warm, fragile, reflective', tempoModifier: 0.9 },
  hopeful:     { pacing: 'medium',      intonation: 'warm, ascending, gently optimistic', tempoModifier: 1.0 },
  relieved:    { pacing: 'medium-slow', intonation: 'relaxed, exhaling, softening', tempoModifier: 0.9 },
  calm:        { pacing: 'medium-slow', intonation: 'cinematic, controlled, spacious', tempoModifier: 0.85 },
  determined:  { pacing: 'medium',      intonation: 'grounded, purposeful, clear', tempoModifier: 1.0 },
  heroic:      { pacing: 'medium-slow', intonation: 'grand, grounded, cinematic, sentence endings with space', tempoModifier: 0.9 },
  epic:        { pacing: 'medium-slow', intonation: 'grand, grounded, cinematic, sentence endings with space', tempoModifier: 0.9 },
};

const DEFAULT_PACING = { pacing: 'medium', intonation: 'clear, warm, cinematic', tempoModifier: 1.0 };

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Estimate speech duration in seconds for Indonesian text.
 * @param {string} text 
 * @param {string} pacing - 'slow' | 'medium-slow' | 'medium' | 'medium-fast'
 * @returns {number} estimated duration in seconds
 */
function estimateDuration(text, pacing = 'medium') {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  
  let wps;
  switch (pacing) {
    case 'slow':        wps = ID_WPS_SLOW; break;
    case 'medium-slow': wps = (ID_WPS_SLOW + ID_WPS_MEDIUM) / 2; break; // ~2.4
    case 'medium-fast': wps = (ID_WPS_MEDIUM + ID_WPS_FAST) / 2; break; // ~3.15
    default:            wps = ID_WPS_MEDIUM; break; // medium = 2.8
  }
  
  // Add small overhead for pauses between sentences
  const sentenceCount = (text.match(/[.!?]/g) || []).length || 1;
  const pauseOverhead = sentenceCount * 0.3;
  
  return (wordCount / wps) + pauseOverhead;
}

/**
 * Determine pacing based on word count and emotion.
 * @param {number} wordCount 
 * @param {string} emotion 
 * @returns {{ pacing: string, intonation: string }}
 */
function determinePacing(wordCount, emotion = 'tense') {
  const emotionConfig = EMOTION_PACING_MAP[emotion.toLowerCase()] || DEFAULT_PACING;
  
  // Override pacing based on word count
  if (wordCount < 10) {
    // Very short → slow it down, make it cinematic
    return {
      pacing: 'medium-slow',
      intonation: `${emotionConfig.intonation}, with dramatic pauses and ambience space`
    };
  } else if (wordCount >= WORD_LIMIT_IDEAL_MIN && wordCount <= WORD_LIMIT_IDEAL_MAX) {
    // Ideal range → use emotion-based pacing
    return {
      pacing: emotionConfig.pacing,
      intonation: emotionConfig.intonation
    };
  } else if (wordCount > WORD_LIMIT_IDEAL_MAX && wordCount <= WORD_LIMIT_SAFE_MAX) {
    // Near limit → speed up slightly but stay natural
    return {
      pacing: 'medium-fast',
      intonation: `${emotionConfig.intonation}, clear articulation, minimal pauses`
    };
  } else {
    // Over limit (should have been compressed, but in case it's still here)
    return {
      pacing: 'medium-fast',
      intonation: `${emotionConfig.intonation}, clear articulation, no rushing`
    };
  }
}

/**
 * Build pause plan for the narration.
 * @param {string} text 
 * @param {string} pacing 
 * @returns {string}
 */
function buildPausePlan(text, pacing) {
  const sentenceCount = (text.match(/[.!?]/g) || []).length || 1;
  
  if (pacing === 'slow' || pacing === 'medium-slow') {
    return `${sentenceCount} sentence(s), natural pauses between sentences (0.3-0.5s each), dramatic pause at commas`;
  } else if (pacing === 'medium-fast') {
    return `${sentenceCount} sentence(s), minimal pauses between sentences (0.1-0.2s), no long pauses`;
  }
  return `${sentenceCount} sentence(s), standard pauses between sentences (0.2-0.3s each)`;
}

/**
 * Main narration fitting function.
 * Fits narration text to a 10-second scene window.
 * 
 * @param {string} sceneNarration - Original narration text
 * @param {object} options
 * @param {number} options.durationSec - Scene duration (default 10)
 * @param {string} options.language - Language code (default "id")
 * @param {string} options.emotion - Primary emotion of the scene
 * @param {string} options.genre - Project genre
 * @param {string} options.sceneSummary - Brief scene summary
 * @returns {Promise<object>} Fitting result with fittedText, pacing, status, etc.
 */
export async function fitNarrationToDuration(sceneNarration, options = {}) {
  const {
    durationSec = SCENE_DURATION_SEC,
    language = 'id',
    emotion = 'tense',
    genre = '',
    sceneSummary = ''
  } = options;

  const originalText = (sceneNarration || '').trim();
  const originalWordCount = originalText.split(/\s+/).filter(Boolean).length;
  const originalCharCount = originalText.length;

  // Empty narration
  if (!originalText || originalWordCount === 0) {
    return {
      originalText: '',
      fittedText: '',
      originalWordCount: 0,
      fittedWordCount: 0,
      originalCharCount: 0,
      fittedCharCount: 0,
      estimatedDurationSec: 0,
      targetDurationSec: durationSec,
      safeSpeechWindowSec: SAFE_SPEECH_WINDOW_SEC,
      compressionApplied: false,
      pacing: 'medium',
      intonation: 'cinematic',
      pausePlan: '',
      emotionDirection: emotion,
      fitStatus: 'fit'
    };
  }

  let fittedText = originalText;
  let compressionApplied = false;
  let compressionMode = null;
  let qualityLevel = 'original_quality';
  let requiresReview = false;

  // Step 1: Check if compression is needed
  const needsCompression = originalWordCount > WORD_LIMIT_SAFE_MAX || originalCharCount > CHAR_LIMIT_SAFE_MAX;

  if (needsCompression) {
    logToBackendFile(`[NarrationFit] Compression needed: ${originalWordCount} words, ${originalCharCount} chars (limits: ${WORD_LIMIT_SAFE_MAX} words, ${CHAR_LIMIT_SAFE_MAX} chars)`);
    
    // Use existing narration compressor (LLM-based + heuristic fallback)
    try {
      const compressResult = await compressNarrationWithMode(originalText);
      fittedText = compressResult.compressedText;
      compressionMode = compressResult.compressionMode;
      qualityLevel = compressResult.qualityLevel;
      requiresReview = compressResult.requiresReview;
      compressionApplied = true;
      
      // Verify compression result
      const compressedWordCount = fittedText.split(/\s+/).filter(Boolean).length;
      if (compressedWordCount > WORD_LIMIT_SAFE_MAX) {
        // Still too long after compression — apply harder heuristic trim
        logToBackendFile(`[NarrationFit] Post-compression still too long (${compressedWordCount} words). Applying hard trim.`);
        const words = fittedText.split(/\s+/).filter(Boolean);
        fittedText = cleanAndFormatNarration(words.slice(0, WORD_LIMIT_SAFE_MAX - 2).join(' '));
      }
    } catch (err) {
      logToBackendFile(`[NarrationFit] Compression error: ${err.message}. Using original.`);
      fittedText = originalText;
      compressionMode = null;
      qualityLevel = 'original_quality';
      requiresReview = false;
    }
  }

  // Step 2: Determine pacing and intonation
  const fittedWordCount = fittedText.split(/\s+/).filter(Boolean).length;
  const fittedCharCount = fittedText.length;
  const { pacing, intonation } = determinePacing(fittedWordCount, emotion);

  // Step 3: Estimate duration
  const estimatedDurationSec = estimateDuration(fittedText, pacing);

  // Step 4: Build pause plan
  const pausePlan = buildPausePlan(fittedText, pacing);

  // Step 5: Determine fit status
  let fitStatus;
  if (estimatedDurationSec <= EFFECTIVE_SPEECH_WINDOW) {
    fitStatus = compressionApplied ? 'compressed_fit' : 'fit';
  } else if (estimatedDurationSec <= SAFE_SPEECH_WINDOW_SEC) {
    // Marginal — might work with slightly faster delivery
    fitStatus = compressionApplied ? 'compressed_fit' : 'fit';
  } else {
    // Estimated too long even after compression
    fitStatus = 'too_long_warning';
    logToBackendFile(`[NarrationFit] Warning: estimated ${estimatedDurationSec.toFixed(1)}s exceeds safe window ${SAFE_SPEECH_WINDOW_SEC}s`);
  }

  const result = {
    originalText,
    fittedText,
    originalWordCount,
    fittedWordCount,
    originalCharCount,
    fittedCharCount,
    estimatedDurationSec: parseFloat(estimatedDurationSec.toFixed(2)),
    targetDurationSec: durationSec,
    safeSpeechWindowSec: SAFE_SPEECH_WINDOW_SEC,
    compressionApplied,
    compressionMode,
    qualityLevel,
    requiresReview,
    pacing,
    intonation,
    pausePlan,
    emotionDirection: emotion,
    fitStatus
  };

  logToBackendFile(`[NarrationFit] Result: ${fittedWordCount} words, est=${estimatedDurationSec.toFixed(1)}s, pacing=${pacing}, status=${fitStatus}${compressionApplied ? ' (compressed)' : ''}`);

  return result;
}

/**
 * Validate actual audio duration via ffprobe after TTS generation.
 * Returns validation result with recommendations.
 * 
 * @param {string} audioPath - Path to the generated MP3 file
 * @param {number} targetDurationSec - Target scene duration (default 10)
 * @returns {Promise<object>} { actualDurationSec, cutoffDetected, recommendation, valid }
 */
export async function validateAudioDuration(audioPath, targetDurationSec = SCENE_DURATION_SEC) {
  try {
    const { getFfprobePath } = await import('../utils/ffmpegResolver.js');
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    const ffprobePath = getFfprobePath();
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath
    ];
    
    const { stdout } = await execFileAsync(ffprobePath, args, { timeout: 10000 });
    const actualDurationSec = parseFloat(stdout.trim());
    
    if (isNaN(actualDurationSec)) {
      return {
        actualDurationSec: 0,
        cutoffDetected: true,
        recommendation: 'ffprobe_failed',
        valid: false,
        message: 'Gagal membaca durasi audio dari ffprobe.'
      };
    }

    // Validation logic
    const effectiveSpeechWindow = targetDurationSec - TTS_START_DELAY_SEC; // 8.0s
    
    if (actualDurationSec > targetDurationSec) {
      // Audio longer than scene — needs regeneration with shorter text or faster pacing
      return {
        actualDurationSec: parseFloat(actualDurationSec.toFixed(2)),
        cutoffDetected: false,
        recommendation: 'regenerate_shorter',
        valid: false,
        message: `Audio (${actualDurationSec.toFixed(1)}s) melebihi durasi scene (${targetDurationSec}s). Perlu diperpendek.`
      };
    } else if (actualDurationSec > SAFE_SPEECH_WINDOW_SEC) {
      // Audio between 9.0-10.0s — marginal, add fade-out if needed
      return {
        actualDurationSec: parseFloat(actualDurationSec.toFixed(2)),
        cutoffDetected: false,
        recommendation: 'add_fade_out',
        valid: true,
        message: `Audio (${actualDurationSec.toFixed(1)}s) mendekati batas. Fade-out halus akan ditambahkan.`
      };
    } else if (actualDurationSec < 3.0 && actualDurationSec > 0) {
      // Very short — acceptable but should add ambience
      return {
        actualDurationSec: parseFloat(actualDurationSec.toFixed(2)),
        cutoffDetected: false,
        recommendation: 'add_ambience',
        valid: true,
        message: `Audio sangat pendek (${actualDurationSec.toFixed(1)}s). Ambience akan mengisi sisa waktu.`
      };
    } else {
      // Perfect fit
      return {
        actualDurationSec: parseFloat(actualDurationSec.toFixed(2)),
        cutoffDetected: false,
        recommendation: 'none',
        valid: true,
        message: `Audio fit sempurna (${actualDurationSec.toFixed(1)}s).`
      };
    }
  } catch (err) {
    logToBackendFile(`[NarrationFit] ffprobe validation failed: ${err.message}`);
    return {
      actualDurationSec: 0,
      cutoffDetected: false,
      recommendation: 'ffprobe_unavailable',
      valid: true, // Don't block if ffprobe fails — best-effort validation
      message: `Validasi durasi audio gagal: ${err.message}. Melanjutkan tanpa validasi.`
    };
  }
}

/**
 * Full TTS generation with fitting pipeline.
 * Fits narration → generates TTS → validates duration → retries if needed.
 * 
 * @param {object} params
 * @param {string} params.narration - Original narration text
 * @param {string} params.destPath - File path for the generated MP3
 * @param {string} params.voiceModel - Voice model string (e.g. "gemini/gemini-2.5-flash-preview-tts/Charon")
 * @param {string} params.emotion - Scene emotion
 * @param {string} params.genre - Project genre
 * @param {string} params.sceneSummary - Scene summary
 * @param {string} params.sceneId - Scene ID for logging
 * @param {Function} params.generateTtsFn - The ttsService.generateTts function
 * @returns {Promise<object>} Full TTS narration metadata
 */
export async function generateFittedTts(params) {
  const {
    narration,
    destPath,
    voiceModel,
    emotion = 'tense',
    genre = '',
    sceneSummary = '',
    sceneId = 'unknown',
    generateTtsFn
  } = params;

  // Step 1: Fit narration
  const fitResult = await fitNarrationToDuration(narration, {
    durationSec: SCENE_DURATION_SEC,
    language: 'id',
    emotion,
    genre,
    sceneSummary
  });

  const textToSpeak = fitResult.fittedText;
  
  if (!textToSpeak || textToSpeak.trim().length === 0) {
    return {
      ...fitResult,
      provider: 'gemini',
      model: voiceModel,
      voiceName: voiceModel?.split('/')?.pop() || 'unknown',
      actualAudioDurationSec: 0,
      audioPath: null,
      cutoffDetected: false,
      generationMode: 'failed',
      fitStatus: 'failed_fit',
      message: 'Narasi kosong setelah fitting.'
    };
  }

  // Parse voice details from model string
  const voiceParts = (voiceModel || '').split('/');
  const voiceName = voiceParts[voiceParts.length - 1] || 'unknown';
  const modelName = voiceParts.length >= 2 ? voiceParts[voiceParts.length - 2] : 'gemini-2.5-flash-preview-tts';

  let lastAudioValidation = null;
  let retryCount = 0;
  let currentText = textToSpeak;
  let currentPacing = fitResult.pacing;

  // Retry loop for duration fitting
  while (retryCount <= MAX_FIT_RETRY) {
    try {
      // Generate TTS
      logToBackendFile(`[NarrationFit:${sceneId}] Generating TTS (attempt ${retryCount + 1}): "${currentText.substring(0, 60)}..." voice=${voiceName} pacing=${currentPacing}`);
      await generateTtsFn(currentText, destPath, voiceModel);

      // Validate duration
      lastAudioValidation = await validateAudioDuration(destPath, SCENE_DURATION_SEC);
      
      if (lastAudioValidation.valid) {
        // Success!
        logToBackendFile(`[NarrationFit:${sceneId}] TTS fit successful: ${lastAudioValidation.actualDurationSec}s (${lastAudioValidation.recommendation})`);
        break;
      }

      // Audio too long — try to compress further
      if (lastAudioValidation.recommendation === 'regenerate_shorter') {
        retryCount++;
        if (retryCount > MAX_FIT_RETRY) {
          logToBackendFile(`[NarrationFit:${sceneId}] Max retries (${MAX_FIT_RETRY}) reached. Accepting last result.`);
          break;
        }

        // Shorten text by removing ~20% of words
        const words = currentText.split(/\s+/).filter(Boolean);
        const targetWordCount = Math.max(8, Math.floor(words.length * 0.8));
        currentText = cleanAndFormatNarration(words.slice(0, targetWordCount).join(' '));
        currentPacing = 'medium-fast';
        
        logToBackendFile(`[NarrationFit:${sceneId}] Retry ${retryCount}: shortened to ${targetWordCount} words, pacing=medium-fast`);
      } else {
        break; // Other recommendations don't need retry
      }
    } catch (ttsErr) {
      logToBackendFile(`[NarrationFit:${sceneId}] TTS generation failed: ${ttsErr.message}`);
      return {
        ...fitResult,
        provider: 'gemini',
        model: modelName,
        voiceName,
        actualAudioDurationSec: 0,
        audioPath: null,
        cutoffDetected: false,
        generationMode: 'failed',
        fitStatus: 'failed_fit',
        message: `TTS generation failed: ${ttsErr.message}`
      };
    }
  }

  const actualDuration = lastAudioValidation?.actualDurationSec || 0;
  const cutoffDetected = actualDuration > SCENE_DURATION_SEC;
  
  let finalFitStatus;
  if (cutoffDetected) {
    finalFitStatus = 'failed_fit';
  } else if (fitResult.compressionApplied) {
    finalFitStatus = 'compressed_fit';
  } else {
    finalFitStatus = 'fit';
  }

  return {
    provider: 'gemini',
    model: modelName,
    voiceName,
    projectVoiceLockId: voiceModel,
    originalText: fitResult.originalText,
    fittedText: currentText,
    originalWordCount: fitResult.originalWordCount,
    fittedWordCount: currentText.split(/\s+/).filter(Boolean).length,
    originalCharCount: fitResult.originalCharCount,
    fittedCharCount: currentText.length,
    estimatedDurationSec: fitResult.estimatedDurationSec,
    actualAudioDurationSec: actualDuration,
    targetDurationSec: SCENE_DURATION_SEC,
    safeSpeechWindowSec: SAFE_SPEECH_WINDOW_SEC,
    pacing: currentPacing,
    intonation: fitResult.intonation,
    emotionDirection: emotion,
    compressionApplied: fitResult.compressionApplied || currentText !== textToSpeak,
    compressionMode: fitResult.compressionMode || (currentText !== textToSpeak ? 'heuristic' : null),
    qualityLevel: (fitResult.compressionMode === 'template_fallback' || (fitResult.compressionMode || (currentText !== textToSpeak ? 'heuristic' : null)) === 'template_fallback') ? 'safe_but_generic' : (fitResult.qualityLevel || (currentText !== textToSpeak ? 'good_quality' : 'original_quality')),
    requiresReview: fitResult.requiresReview || (fitResult.compressionMode === 'template_fallback' || (fitResult.compressionMode || (currentText !== textToSpeak ? 'heuristic' : null)) === 'template_fallback') || false,
    fitStatus: finalFitStatus,
    cutoffDetected,
    audioPath: destPath,
    generationMode: 'real',
    pausePlan: fitResult.pausePlan,
    audioValidation: lastAudioValidation
  };
}

export default {
  fitNarrationToDuration,
  validateAudioDuration,
  generateFittedTts,
  estimateDuration,
  determinePacing,
  WORD_LIMIT_SAFE_MAX,
  CHAR_LIMIT_SAFE_MAX,
  SCENE_DURATION_SEC,
  SAFE_SPEECH_WINDOW_SEC,
  MAX_FIT_RETRY
};
