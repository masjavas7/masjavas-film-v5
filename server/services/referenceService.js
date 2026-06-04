import fs from 'fs';
import path from 'path';
import { grokpiChatCompletion, grokpiImageGeneration } from './grokpiClient.js';
import { AppError } from '../utils/safeError.js';
import { getRuntimePaths } from '../utils/runtimePaths.js';
import { settingsService } from './settingsService.js';
import { logToBackendFile, logToDesktopMainFile } from '../utils/logger.js';

// Helper to extract base64 from different GrokPI response structures
function extractBase64(response) {
  if (response && response.data && response.data[0]) {
    if (response.data[0].b64_json) return response.data[0].b64_json;
    if (response.data[0].url) return response.data[0].url;
  }

  const content = response?.choices?.[0]?.message?.content || '';
  const match = content.match(/data:image\/[a-zA-Z]+;base64,([a-zA-Z0-9+/=\r\n]+)/);
  if (match) {
    return match[1].replace(/[\r\n]/g, '');
  }

  const rawMatch = content.match(/([a-zA-Z0-9+/=]{100,})/);
  if (rawMatch) {
    return rawMatch[1].replace(/[\r\n]/g, '');
  }

  return null;
}

// Helper to save base64 image data to local server uploads
function saveBase64Image(base64Str) {
  const filename = `auto-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
  const uploadDir = getRuntimePaths().uploadsDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64Str, 'base64'));
  return filename;
}

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

export const referenceService = {
  /**
   * Generates automatic reference items from narration
   */
  generateAutoReferences: async (projectId, narrationOrPayload, baseUrl) => {
    let narration = '';
    let ideaText = '';
    let storyDraft = null;
    let selectedStyle = '';
    let selectedTone = '';
    let aspectRatio = '';
    
    if (typeof narrationOrPayload === 'string') {
      narration = narrationOrPayload;
    } else if (narrationOrPayload && typeof narrationOrPayload === 'object') {
      narration = narrationOrPayload.narration || '';
      ideaText = narrationOrPayload.ideaText || '';
      storyDraft = narrationOrPayload.storyDraft || null;
      selectedStyle = narrationOrPayload.selectedStyle || narrationOrPayload.style || '';
      selectedTone = narrationOrPayload.selectedTone || narrationOrPayload.tone || '';
      aspectRatio = narrationOrPayload.aspectRatio || '';
    }

    // Tentukan sumber teks utama berdasarkan prioritas:
    // A. storyDraft / narration jika sudah ada
    // B. ideaText jika narration belum ada
    // C. project topic/title
    const sourceText = narration || storyDraft?.fullText || storyDraft?.narration || ideaText;
    const sourceTextType = narration ? 'narration' : (storyDraft?.fullText || storyDraft?.narration ? 'storyDraft' : (ideaText ? 'ideaText' : 'none'));

    const settings = settingsService.getSettings();
    const hasApiKey = !!settings.apiKey;

    // Desktop debug logging aman (tanpa key)
    logToBackendFile(`[ReferencesAuto] projectId=${projectId}`);
    logToBackendFile(`[ReferencesAuto] sourceTextType=${sourceTextType}`);
    logToBackendFile(`[ReferencesAuto] sourceTextLength=${sourceText?.length || 0}`);
    logToBackendFile(`[ReferencesAuto] hasApiKey=${hasApiKey}`);
    logToBackendFile(`[ReferencesAuto] baseUrl=${settings.apiBaseUrl}`);
    logToDesktopMainFile(`[ReferencesAuto] projectId=${projectId} sourceTextType=${sourceTextType} sourceTextLength=${sourceText?.length || 0} hasApiKey=${hasApiKey}`);

    if (!sourceText || sourceText.trim() === '') {
      logToBackendFile(`[ReferencesAuto] responseStatus=error error=MISSING_STORY_SOURCE`);
      logToDesktopMainFile(`[ReferencesAuto] responseStatus=error error=MISSING_STORY_SOURCE`);
      return {
        status: "error",
        errorCode: "MISSING_STORY_SOURCE",
        errorMessage: "Belum ada ide cerita untuk dibuat referensi."
      };
    }

    const systemPrompt = `Anda adalah penasihat gaya visual film. Analisis cerita berikut dan buat 3 item referensi visual yang paling penting.
${selectedStyle ? `Gaya visual target: ${selectedStyle}. ` : ''}${selectedTone ? `Nuansa target: ${selectedTone}. ` : ''}${aspectRatio ? `Rasio aspek target: ${aspectRatio}. ` : ''}
Kembalikan respon strictly berupa valid JSON array dengan format persis seperti ini:
[
  {
    "title": "Judul referensi (misal: Karakter Utama, Terowongan Gelap, Mood Sinematik)",
    "category": "Karakter | Lokasi | Mood | Style",
    "description": "Deskripsi visual detail referensi ini...",
    "imagePrompt": "Prompt bahasa inggris yang sangat detail untuk AI generator gambar (misal: Cinematic close up portrait of...)"
  }
]
Gunakan kategori yang sesuai. Jangan sertakan penjelasan apa pun di luar JSON array.`;

    try {
      logToBackendFile(`[ReferencesAuto] providerStatus=sending`);
      const response = await grokpiChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Cerita: ${sourceText}` }
      ], {
        model: 'grok-4.1-expert',
        temperature: 0.7
      });

      logToBackendFile(`[ReferencesAuto] providerStatus=received`);
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new AppError('Gagal menganalisis cerita untuk referensi otomatis.', 502);
      }

      let parsed;
      try {
        let cleanText = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
                parsed = parsedVal;
                arrayFound = true;
                break;
              }
            } catch (e) {
              // Abaikan dan scan ke belakang
            }
          }
          cleanText = cleanText.substring(0, lastIndex);
          lastIndex = cleanText.lastIndexOf('[');
        }

        if (!arrayFound) {
          throw new Error('No valid JSON array found');
        }
      } catch (err) {
        console.error('Failed to parse references JSON:', content);
        throw new AppError('Gagal memformat referensi AI.', 500);
      }

      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      // Batasi 3 item gambar referensi maksimal
      const itemsToGenerate = parsed.slice(0, 3);

      // Buat gambar secara berurutan (sequential) untuk menghindari Image rate limit exceeded
      const results = [];
      for (let i = 0; i < itemsToGenerate.length; i++) {
        const item = itemsToGenerate[i];
        let base64 = null;
        let filename = null;
        
        // Coba hingga 3 kali dengan backoff jika terkena rate limit
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            logToBackendFile(`[ReferencesAuto] providerStatus=generating_image title=${item.title} attempt=${attempt}/${maxRetries}`);
            const imgResponse = await grokpiImageGeneration(item.imagePrompt || item.description, {
              size: '1024x1024'
            });

            const extracted = extractBase64(imgResponse);
            if (extracted) {
              base64 = extracted;
              filename = saveBase64Image(base64);
              break; // sukses, keluar dari loop retry
            }
          } catch (imgErr) {
            console.error(`[ReferencesAuto] Attempt ${attempt} failed for ${item.title}:`, imgErr.message);
            
            const errText = (imgErr.message || '').toLowerCase();
            const isRateLimit = errText.includes('rate limit') || errText.includes('no token') || imgErr.statusCode === 429;
            
            if (isRateLimit && attempt < maxRetries) {
              const backoffTime = attempt * 3000; // 3s, 6s
              logToBackendFile(`[ReferencesAuto] Rate limit hit. Backing off for ${backoffTime}ms...`);
              await new Promise(r => setTimeout(r, backoffTime));
            } else {
              if (attempt === maxRetries) {
                logToBackendFile(`[ReferencesAuto] Failed after ${maxRetries} attempts.`);
              }
            }
          }
        }

        if (base64 && filename) {
          results.push({
            id: `ref-auto-${Date.now()}-${i}`,
            title: item.title,
            imageUrl: `${baseUrl}/uploads/${filename}`,
            type: 'auto',
            category: item.category || 'Mood',
            description: item.description,
            isReal: true,
            providerSource: 'grokpi_real'
          });
        } else {
          // Gambar placeholder fallback premium jika gagal ter-generate
          results.push({
            id: `ref-auto-${Date.now()}-${i}`,
            title: item.title,
            imageUrl: `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60`,
            type: 'auto',
            category: item.category || 'Mood',
            description: `${item.description} (Visual rendering fallback)`,
            isReal: false,
            providerSource: 'fallback_placeholder'
          });
        }

        // Jeda pendinginan wajib di akhir setiap iterasi (sukses maupun gagal)
        await new Promise(r => setTimeout(r, 2000));
      }
      const successRefs = results.filter(r => r && r.imageUrl);
      const warnings = [];

      if (successRefs.length < itemsToGenerate.length) {
        warnings.push(`${itemsToGenerate.length - successRefs.length} referensi gagal dibuat gambarnya.`);
      }

      // Provider evidence tracking
      const realCount = results.filter(r => r.isReal === true).length;
      const fallbackCount = results.filter(r => r.isReal === false).length;
      const totalRequested = itemsToGenerate.length;

      let responseStatus;
      if (successRefs.length === 0 && fallbackCount === 0) {
        responseStatus = 'error';
      } else if (realCount === totalRequested) {
        responseStatus = 'success';
      } else if (realCount > 0 && fallbackCount > 0) {
        responseStatus = 'partial_with_fallback';
      } else {
        responseStatus = 'fallback_only';
      }

      logToBackendFile(`[ReferencesAuto] generatedCount=${successRefs.length}`);
      logToBackendFile(`[ReferencesAuto] providerEvidence: realCount=${realCount} fallbackCount=${fallbackCount}`);
      logToBackendFile(`[ReferencesAuto] responseStatus=${responseStatus}`);
      logToDesktopMainFile(`[ReferencesAuto] generatedCount=${successRefs.length} responseStatus=${responseStatus}`);

      return {
        status: responseStatus,
        references: successRefs,
        warnings,
        providerEvidence: { realCount, fallbackCount, totalRequested },
        errorMessage: successRefs.length === 0 ? 'Semua gambar referensi gagal dibuat.' : null
      };
    } catch (error) {
      console.error('[Auto References] Error:', error.message);
      
      const statusCode = error.statusCode || 500;
      logToBackendFile(`[ReferencesAuto] responseStatus=error error=${error.message} httpStatus=${statusCode}`);
      logToDesktopMainFile(`[ReferencesAuto] responseStatus=error error=${error.message} httpStatus=${statusCode}`);
      
      return {
        status: 'error',
        references: [],
        warnings: [],
        errorMessage: error.message,
        httpStatus: statusCode
      };
    }
  },

  /**
   * Save an uploaded manual project or scene reference
   */
  saveManualReference: async (file, category, baseUrl) => {
    if (!file) {
      throw new AppError('File upload tidak ditemukan.', 400);
    }

    const title = path.basename(file.originalname, path.extname(file.originalname));
    const imageUrl = `${baseUrl}/uploads/${file.filename}`;

    return {
      id: `ref-manual-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      title: title || 'Gambar Referensi',
      imageUrl,
      type: 'manual',
      category: category || 'Style',
      description: 'Gambar referensi manual yang diunggah oleh pengguna.'
    };
  },

  /**
   * Replace reference file
   */
  replaceReference: async (refId, file, baseUrl) => {
    if (!file) {
      throw new AppError('File pengganti tidak ditemukan.', 400);
    }

    const title = path.basename(file.originalname, path.extname(file.originalname));
    const imageUrl = `${baseUrl}/uploads/${file.filename}`;

    return {
      id: refId,
      title: title || 'Gambar Referensi Baru',
      imageUrl,
      type: 'manual',
      category: 'Style',
      description: 'Gambar referensi pengganti yang diunggah oleh pengguna.'
    };
  }
};
