import { grokpiChatCompletion } from './grokpiClient.js';

const EMOTION_MAPS = {
  angry: {
    expressionDirection: "tightened jaw, focused eyes, controlled facial tension",
    voiceToneDirection: "low, firm, restrained, not screaming",
    bodyLanguageDirection: "still posture, small sharp movement",
    avoid: "exaggerated shouting, cartoon anger"
  },
  sad: {
    expressionDirection: "softened eyes, lowered gaze, subtle trembling breath",
    voiceToneDirection: "soft, slower, fragile but clear",
    bodyLanguageDirection: "shoulders slightly lowered",
    avoid: "melodrama, excessive crying"
  },
  fearful: {
    expressionDirection: "alert eyes, tense lips, unstable breath",
    voiceToneDirection: "quiet, hesitant, slightly broken",
    bodyLanguageDirection: "small backward movement, tense shoulders",
    avoid: "horror overacting unless genre requires it"
  },
  tense: {
    expressionDirection: "focused gaze, controlled breathing, micro tension",
    voiceToneDirection: "low, measured, urgent but not rushed",
    bodyLanguageDirection: "minimal movement, readiness",
    avoid: "fast chaotic speech"
  },
  hopeful: {
    expressionDirection: "softened face, small light in the eyes",
    voiceToneDirection: "warm, gentle, lifted ending",
    bodyLanguageDirection: "open posture",
    avoid: "overly cheerful tone"
  },
  shocked: {
    expressionDirection: "widened eyes, short freeze, delayed reaction",
    voiceToneDirection: "brief pause, short phrase only",
    bodyLanguageDirection: "stillness before movement",
    avoid: "long dialogue"
  },
  determined: {
    expressionDirection: "steady eyes, firm mouth",
    voiceToneDirection: "calm, confident, grounded",
    bodyLanguageDirection: "stable posture, forward intention",
    avoid: "aggressive overacting"
  },
  melancholic: {
    expressionDirection: "distant eyes, restrained sadness",
    voiceToneDirection: "low, reflective, slow but not dragging",
    bodyLanguageDirection: "minimal movement",
    avoid: "sleepy delivery"
  },
  calm: {
    expressionDirection: "relaxed facial muscles, steady direct gaze",
    voiceToneDirection: "even tempo, steady, neutral tone",
    bodyLanguageDirection: "relaxed shoulders, open posture",
    avoid: "bored or expressionless delivery"
  },
  relieved: {
    expressionDirection: "softened features, gentle release of tension around the eyes",
    voiceToneDirection: "warm exhaling voice tone, soft delivery",
    bodyLanguageDirection: "shoulders dropping, relaxed release of posture",
    avoid: "overly happy or laughing"
  }
};

/**
 * Extracts emotional traits from a scene using GrokPI Chat, with a robust keyword fallback.
 * @param {object} params - { narration, summary, goal, storyboardPanels, videoInstruction, dialogue }
 * @returns {Promise<object>} EmotionDirection object
 */
export async function extractEmotionDirection(params) {
  const {
    narration = '',
    summary = '',
    goal = '',
    storyboardPanels = [],
    videoInstruction = '',
    dialogue = ''
  } = params || {};

  const combinedText = `
Narration: ${narration}
Summary: ${summary}
Goal: ${goal}
Video Instruction: ${videoInstruction}
Dialogue: ${dialogue || (storyboardPanels.map(p => p.dialogue).filter(Boolean).join(' ')) || 'None.'}
  `.trim();

  // Try LLM Extraction
  try {
    const prompt = `Anda adalah sutradara drama dan ahli akting film profesional. Analisis teks adegan berikut dan tentukan emosi yang dominan beserta petunjuk performa aktingnya.

Kembalikan respon strictly berupa valid JSON object dengan format:
{
  "primaryEmotion": "calm" | "tense" | "sad" | "angry" | "fearful" | "hopeful" | "shocked" | "relieved" | "determined" | "melancholic",
  "secondaryEmotion": string,
  "emotionalIntensity": 1 | 2 | 3 | 4 | 5,
  "expressionDirection": "petunjuk ekspresi wajah dalam bahasa inggris",
  "bodyLanguageDirection": "petunjuk gerak tubuh dalam bahasa inggris",
  "voiceToneDirection": "petunjuk intonasi suara dalam bahasa inggris"
}

PENTING:
- Pilihlah "primaryEmotion" hanya dari daftar yang diperbolehkan di atas.
- Nilai intensity harus berupa angka antara 1 sampai 5.
- Sesuaikan "expressionDirection", "bodyLanguageDirection", dan "voiceToneDirection" dengan aturan emosi:
  * angry: tightened jaw, focused eyes, controlled facial tension. Voice: low, firm, restrained. Body: still posture, small sharp movement.
  * sad: softened eyes, lowered gaze, subtle trembling breath. Voice: soft, slower, fragile but clear. Body: shoulders slightly lowered.
  * fearful: alert eyes, tense lips, unstable breath. Voice: quiet, hesitant, slightly broken. Body: small backward movement, tense shoulders.
  * tense: focused gaze, controlled breathing, micro tension. Voice: low, measured, urgent but not rushed. Body: minimal movement.
  * hopeful: softened face, small light in the eyes. Voice: warm, gentle, lifted ending.
  * shocked: widened eyes, short freeze, delayed reaction. Voice: brief pause, short phrase only.
  * determined: steady eyes, firm mouth. Voice: calm, confident, grounded.
  * melancholic: distant eyes, restrained sadness. Voice: low, reflective, slow but not dragging.

Jangan sertakan teks penjelasan lain di luar JSON object.`;

    const response = await grokpiChatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: combinedText }
    ], {
      model: 'grok-4.1-expert',
      temperature: 0.2
    });

    const content = response.choices?.[0]?.message?.content || '';
    const cleanText = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // Attempt parsing JSON
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = cleanText.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);

      // Validate primaryEmotion format
      let primary = (parsed.primaryEmotion || 'tense').toLowerCase();
      if (!EMOTION_MAPS[primary]) {
        primary = 'tense';
      }

      // Merge and return
      const mapDefaults = EMOTION_MAPS[primary] || EMOTION_MAPS.tense;
      return {
        primaryEmotion: primary,
        secondaryEmotion: parsed.secondaryEmotion || null,
        emotionalIntensity: Math.min(Math.max(Number(parsed.emotionalIntensity) || 3, 1), 5),
        expressionDirection: parsed.expressionDirection || mapDefaults.expressionDirection,
        bodyLanguageDirection: parsed.bodyLanguageDirection || mapDefaults.bodyLanguageDirection,
        voiceToneDirection: parsed.voiceToneDirection || mapDefaults.voiceToneDirection
      };
    }
  } catch (err) {
    console.warn('[EmotionExtractor] Failed using LLM extractor, falling back to rules:', err.message);
  }

  // Fallback: rule-based extractor
  return extractEmotionDirectionFallback(combinedText);
}

/**
 * Fallback keyword parser for emotion extraction
 */
function extractEmotionDirectionFallback(text) {
  const lower = text.toLowerCase();
  
  let primary = 'tense'; // default
  let intensity = 3;
  let secondary = null;

  if (lower.includes('marah') || lower.includes('murka') || lower.includes('angry') || lower.includes('benci')) {
    primary = 'angry';
    intensity = 4;
  } else if (lower.includes('sedih') || lower.includes('menangis') || lower.includes('sad') || lower.includes('duka')) {
    primary = 'sad';
    intensity = 4;
  } else if (lower.includes('takut') || lower.includes('khawatir') || lower.includes('cemas') || lower.includes('fearful') || lower.includes('gentar')) {
    primary = 'fearful';
    intensity = 4;
  } else if (lower.includes('harapan') || lower.includes('hopeful') || lower.includes('senang') || lower.includes('terharu') || lower.includes('lega')) {
    primary = 'hopeful';
    intensity = 3;
    if (lower.includes('lega')) {
      primary = 'relieved';
    }
  } else if (lower.includes('terkejut') || lower.includes('shocked') || lower.includes('kaget') || lower.includes('terperangah')) {
    primary = 'shocked';
    intensity = 5;
  } else if (lower.includes('tekad') || lower.includes('determined') || lower.includes('yakin') || lower.includes('tegas')) {
    primary = 'determined';
    intensity = 4;
  } else if (lower.includes('sendu') || lower.includes('melancholic') || lower.includes('pilu') || lower.includes('lesu')) {
    primary = 'melancholic';
    intensity = 3;
  } else if (lower.includes('tenang') || lower.includes('calm') || lower.includes('damai')) {
    primary = 'calm';
    intensity = 2;
  }

  // Set secondary emotion if found
  if (primary !== 'tense' && (lower.includes('tegang') || lower.includes('tense') || lower.includes('terdesak'))) {
    secondary = 'tense';
  } else if (primary !== 'sad' && (lower.includes('sedih') || lower.includes('sad'))) {
    secondary = 'sad';
  }

  const defaults = EMOTION_MAPS[primary] || EMOTION_MAPS.tense;

  return {
    primaryEmotion: primary,
    secondaryEmotion: secondary,
    emotionalIntensity: intensity,
    expressionDirection: defaults.expressionDirection,
    bodyLanguageDirection: defaults.bodyLanguageDirection,
    voiceToneDirection: defaults.voiceToneDirection
  };
}
