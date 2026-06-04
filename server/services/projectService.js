import { grokpiChatCompletion } from './grokpiClient.js';
import { AppError } from '../utils/safeError.js';
import { logToBackendFile } from '../utils/logger.js';

/**
 * Extracts a JSON object from text, handling markdown blocks if present.
 * @param {string} text 
 * @returns {object} parsed JSON object
 */
function escapeNewlinesInJSON(jsonStr) {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escape) {
      result += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r')) {
      result += char === '\n' ? '\\n' : '\\r';
      continue;
    }
    result += char;
  }
  return result;
}

function cleanAndParseJSON(text) {
  // Strip reasoning/thinking tags if returned by thinking models
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Scan backwards for the last valid JSON object block
  let lastIndex = cleanText.lastIndexOf('{');
  while (lastIndex !== -1) {
    const candidate = cleanText.substring(lastIndex);
    const endIdx = candidate.lastIndexOf('}');
    if (endIdx !== -1) {
      const jsonStr = escapeNewlinesInJSON(candidate.substring(0, endIdx + 1));
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // Ignored, search previous bracket
      }
    }
    cleanText = cleanText.substring(0, lastIndex);
    lastIndex = cleanText.lastIndexOf('{');
  }

  throw new AppError('Gagal memformat respon JSON dari AI.', 500);
}

/**
 * Heuristic fallback: splits narration into scene chunks locally
 * when the LLM call fails.
 */
function generateHeuristicScenes(narration, sceneCount, selectedStyle, selectedTone) {
  const baseTitles = [
    'Awal Perjalanan',
    'Pengenalan Suasana',
    'Konflik Mulai Terasa',
    'Ketegangan Meningkat',
    'Titik Balik',
    'Resolusi & Akhir'
  ];

  // Build a title list that covers any sceneCount
  const titles = Array.from({ length: sceneCount }, (_, i) =>
    i < baseTitles.length ? baseTitles[i] : `Adegan ${i + 1}`
  );

  // Split narration into sentences
  let sentences = narration.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  let chunks;
  if (sentences.length >= sceneCount) {
    // Distribute sentences evenly across scenes
    chunks = Array.from({ length: sceneCount }, () => []);
    sentences.forEach((sentence, idx) => {
      const bucket = Math.min(Math.floor(idx / Math.ceil(sentences.length / sceneCount)), sceneCount - 1);
      chunks[bucket].push(sentence);
    });
    chunks = chunks.map(group => group.join('. ') + '.');
  } else {
    // Fewer sentences than sceneCount — split by words instead
    const words = narration.split(/\s+/).filter(Boolean);
    const wordsPerChunk = Math.max(1, Math.ceil(words.length / sceneCount));
    chunks = Array.from({ length: sceneCount }, (_, i) => {
      const start = i * wordsPerChunk;
      return words.slice(start, start + wordsPerChunk).join(' ');
    }).filter(Boolean);
    // Pad if we ended up with fewer chunks
    while (chunks.length < sceneCount) {
      chunks.push(chunks[chunks.length - 1] || narration);
    }
  }

  return chunks.map((text, idx) => ({
    sceneNumber: idx + 1,
    title: titles[idx],
    summary: text.substring(0, 80),
    narration: text,
    emotion: 'tense',
    goal: 'story progression',
    durationSec: 10
  }));
}

export const projectService = {
  /**
   * Generates story narration based on user idea and preferences
   * @param {string} projectId 
   * @param {object} inputs ideaText, selectedPlatform, selectedDuration, selectedTone, selectedStyle
   * @returns {Promise<object>} { opener, core, ending, narration, scenes }
   */
  generateNarration: async (projectId, inputs) => {
    const { ideaText, selectedPlatform, selectedDuration, selectedTone, selectedStyle } = inputs;
    
    if (!ideaText) {
      throw new AppError('Ide cerita tidak boleh kosong.', 400);
    }

    const systemPrompt = `Anda adalah penulis naskah film dan video profesional. Tugas Anda adalah menyusun narasi cerita yang menarik dalam Bahasa Indonesia berdasarkan ide cerita pengguna.
Kembalikan respon strictly berupa valid JSON dengan format persis seperti ini:
{
  "opener": "Bagian pembuka cerita yang memikat...",
  "core": "Bagian inti/konflik cerita...",
  "ending": "Bagian penutup/resolusi cerita...",
  "narration": "Teks narasi lengkap yang menggabungkan opener, core, dan ending secara lancar untuk dibaca narator."
}
Jangan memberikan penjelasan tambahan di luar JSON. Pastikan JSON valid.`;

    const userPrompt = `Buat naskah narasi berdasarkan detail berikut:
Ide cerita: ${ideaText}
Platform target: ${selectedPlatform || 'Umum'}
Durasi target: ${selectedDuration || '1 menit (±120-150 kata)'}
Tone: ${selectedTone || 'Sinematik'}
Style: ${selectedStyle || 'Realistis'}

Susun narasi yang dramatis, premium, dan mengesankan.`;

    try {
      const chatResponse = await grokpiChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'grok-4.1-expert',
        temperature: 0.7
      });

      const messageContent = chatResponse.choices?.[0]?.message?.content;
      if (!messageContent) {
        throw new AppError('AI provider tidak mengembalikan teks.', 502);
      }

      const parsedResult = cleanAndParseJSON(messageContent);
      return {
        opener: parsedResult.opener || '',
        core: parsedResult.core || '',
        ending: parsedResult.ending || '',
        narration: parsedResult.narration || '',
        scenes: parsedResult.scenes || []
      };
    } catch (error) {
      console.error('Error in projectService.generateNarration:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Narasi gagal dibuat. Coba lagi.', 500);
    }
  },

  /**
   * Generates a structured list of scenes from the narration
   * @param {string} projectId 
   * @param {object} inputs narration, storyDraft, selectedDuration, selectedStyle, selectedTone
   * @returns {Promise<Array<object>>} list of mapped SceneArtifact objects
   */
  generateScenes: async (projectId, inputs) => {
    const { narration, selectedDuration, selectedStyle, selectedTone } = inputs;
    if (!narration) {
      throw new AppError('Narasi tidak boleh kosong untuk memecah adegan.', 400);
    }

    let sceneCount = 6;
    if (selectedDuration) {
      const match = selectedDuration.match(/(\d+)/);
      if (match) {
        sceneCount = parseInt(match[1], 10);
      }
    }

    const systemPrompt = `Anda adalah seorang sutradara dan produser film profesional. Tugas Anda adalah memecah naskah narasi film yang diberikan menjadi daftar adegan (scene list) yang terstruktur.
Pecah cerita tersebut menjadi tepat ${sceneCount} adegan berurutan yang saling bersambung dari awal hingga akhir.
Kembalikan respon strictly berupa valid JSON array berisi adegan dengan format persis seperti ini:
[
  {
    "sceneNumber": 1,
    "title": "Judul adegan yang menarik...",
    "summary": "Deskripsi singkat mengenai apa yang terjadi di adegan ini...",
    "narration": "Potongan teks narasi yang dibaca khusus untuk adegan ini...",
    "emotion": "Emosi utama adegan (misal: Tegang, Haru, Takut)...",
    "goal": "Tujuan adegan ini dalam alur cerita...",
    "durationSec": 10
  }
]
Jangan memberikan penjelasan tambahan di luar JSON array. Pastikan JSON valid.`;

    const userPrompt = `Pecah narasi berikut menjadi tepat ${sceneCount} adegan:
Gaya: ${selectedStyle || 'Sinematik'}
Tone: ${selectedTone || 'Dramatis'}
Narasi: ${narration}`;

    try {
      let parsedScenes;

      try {
        const chatResponse = await grokpiChatCompletion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ], {
          model: 'grok-4.1-expert',
          temperature: 0.7
        });

        const messageContent = chatResponse.choices?.[0]?.message?.content;
        if (!messageContent) {
          throw new AppError('AI provider tidak mengembalikan detail adegan.', 502);
        }

        try {
          let cleanText = messageContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          let lastIndex = cleanText.lastIndexOf('[');
          let arrayFound = false;

          while (lastIndex !== -1) {
            const candidate = cleanText.substring(lastIndex);
            const endIdx = candidate.lastIndexOf(']');
            if (endIdx !== -1) {
              const jsonStr = escapeNewlinesInJSON(candidate.substring(0, endIdx + 1));
              try {
                const parsedVal = JSON.parse(jsonStr);
                if (Array.isArray(parsedVal)) {
                  parsedScenes = parsedVal;
                  arrayFound = true;
                  break;
                }
              } catch (e) {
                // Ignore
              }
            }
            cleanText = cleanText.substring(0, lastIndex);
            lastIndex = cleanText.lastIndexOf('[');
          }

          if (!arrayFound) {
            throw new Error('No valid JSON array found');
          }
        } catch (err) {
          console.error('Failed to parse scenes JSON:', messageContent);
          throw new AppError('Gagal memproses detail adegan dari AI.', 500);
        }
      } catch (llmError) {
        // ---- Heuristic fallback when LLM call fails ----
        const reason = llmError?.message || String(llmError);
        console.warn('[generateScenes] LLM call failed, using heuristic fallback:', reason);
        logToBackendFile(`[WARN] generateScenes heuristic fallback activated – ${reason}`);
        parsedScenes = generateHeuristicScenes(narration, sceneCount, selectedStyle, selectedTone);
      }

      // Map backend scenes to full scene artifacts expected by the frontend
      return parsedScenes.map((s, idx) => ({
        id: `scene-${idx + 1}-${Date.now()}`,
        sceneNumber: s.sceneNumber || idx + 1,
        title: s.title || `Adegan ${idx + 1}`,
        summary: s.summary || 'Deskripsi adegan.',
        narration: s.narration || '',
        videoInstruction: `Tembakan sinematik memperlihatkan adegan: ${s.title}. ${s.summary}`,
        videoSettings: {
          duration: s.durationSec || 10,
          quality: "Tinggi",
          aspectRatio: "16:9 Widescreen"
        },
        checklist: {
          narrationReady: !!s.narration,
          referencesReady: false,
          storyboardReady: false,
          instructionsReady: true,
          aspectRatioSelected: true,
          qualitySelected: true,
          promptPackageReady: false
        },
        references: [],
        storyboardPanels: [],
        isGenerated: false,
        status: "Siap dicek"
      }));

    } catch (error) {
      console.error('Error in projectService.generateScenes:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Gagal membuat daftar adegan. Coba beberapa saat lagi.', 500);
    }
  }
};
