import fs from 'fs';
import path from 'path';
import { settingsService } from './settingsService.js';
import { AppError } from '../utils/safeError.js';
import { logToBackendFile } from '../utils/logger.js';

export const AVAILABLE_VOICES = [
  {
    voiceName: 'Charon',
    gender: 'Laki-laki',
    style: 'Tegas',
    suitableFor: 'Kisah sejarah, narasi heroik, petualangan',
    description: 'Charon — laki-laki, dalam, tegas, cocok untuk sejarah dan narasi heroik.'
  },
  {
    voiceName: 'Aoede',
    gender: 'Perempuan',
    style: 'Lembut',
    suitableFor: 'Legenda, dongeng, drama emosional',
    description: 'Aoede — perempuan, lembut dan ekspresif, cocok untuk legenda dan drama emosional.'
  },
  {
    voiceName: 'Zephyr',
    gender: 'Netral',
    style: 'Sinematik',
    suitableFor: 'Drama emosional, monolog, dokumenter',
    description: 'Zephyr — netral, tenang, mengalir, cocok untuk drama emosional dan monolog.'
  },
  {
    voiceName: 'Kore',
    gender: 'Perempuan',
    style: 'Hangat',
    suitableFor: 'Motivasi, edukasi, tutorial',
    description: 'Kore — perempuan, hangat dan berenergi, cocok untuk motivasi dan edukasi.'
  },
  {
    voiceName: 'Fenrir',
    gender: 'Laki-laki',
    style: 'Misterius',
    suitableFor: 'Horor, thriller, misteri',
    description: 'Fenrir — laki-laki, berat, berbisik, cocok untuk horor dan cerita misterius.'
  },
  {
    voiceName: 'Puck',
    gender: 'Netral',
    style: 'Hangat/Ekspresif',
    suitableFor: 'Edukasi, petualangan, konten anak',
    description: 'Puck — netral, ceria dan bersahabat, cocok untuk edukasi dan video petualangan.'
  },
  {
    voiceName: 'Leda',
    gender: 'Perempuan',
    style: 'Dramatis',
    suitableFor: 'Drama emosional, narasi, puisi',
    description: 'Leda — perempuan, berwibawa dan penuh penghayatan, cocok untuk drama emosional.'
  },
  {
    voiceName: 'Orus',
    gender: 'Laki-laki',
    style: 'Heroik',
    suitableFor: 'Aksi, petualangan megah, epik',
    description: 'Orus — laki-laki, gagah, bertenaga, cocok untuk aksi dan petualangan megah.'
  }
];

export const ttsService = {
  /**
   * AI Casting Director: Menganalisis tema, emosi, narasi, dan dialog adegan
   * untuk memilih pengisi suara (model voice) Gemini TTS yang paling cocok.
   * @param {object} sceneData - Data scene { narration, dialogue, emotionDirection, audioDirection }
   * @param {object} projectSettings - Pengaturan proyek { tone, style }
   * @returns {string} Model voice (nama model lengkap untuk Gemini TTS proxy)
   */
  castVoice: (sceneData = {}, projectSettings = {}) => {
    const emotion = (sceneData.emotionDirection?.primaryEmotion || sceneData.emotion || 'tense').toLowerCase();
    const narrationText = (sceneData.narration || '').toLowerCase();
    const dialogueText = (sceneData.dialogue || '').toLowerCase();
    const tone = (projectSettings.tone || '').toLowerCase();
    
    // 1. Tentukan gender berdasarkan isi narasi/dialog secara cerdas (Heuristik karakter)
    let gender = 'male'; // default male narrator untuk nuansa sinematik epik
    
    const femaleKeywords = ['roro', 'jonggrang', 'wanita', 'gadis', 'ibu', 'perempuan', 'putri', 'she', 'her', 'female', 'woman', 'girl', 'queen', 'ratu'];
    const maleKeywords = ['bandung', 'bondowoso', 'rio', 'karsa', 'pria', 'lelaki', 'bapak', 'putra', 'he', 'him', 'male', 'man', 'boy', 'king', 'raja'];
    
    let femaleScore = 0;
    let maleScore = 0;
    
    femaleKeywords.forEach(k => {
      if (narrationText.includes(k)) femaleScore += 1;
      if (dialogueText.includes(k)) femaleScore += 2;
    });
    
    maleKeywords.forEach(k => {
      if (narrationText.includes(k)) maleScore += 1;
      if (dialogueText.includes(k)) maleScore += 2;
    });
    
    // Jika tema cerita sangat mengarah ke perempuan, ganti gender ke female
    if (femaleScore > maleScore) {
      gender = 'female';
    }
    
    console.log(`[AICastingDirector] Caster Gender Score: female=${femaleScore}, male=${maleScore} -> selectedGender=${gender.toUpperCase()}`);

    // 2. Pilih suara berdasarkan kombinasi gender + emosi/tone
    let selectedVoice = 'Zephyr'; // fallback female
    if (gender === 'male') {
      selectedVoice = 'Charon'; // fallback male
    }
    
    if (gender === 'male') {
      switch (emotion) {
        case 'angry':
        case 'shocked':
          // Suara bertenaga, dramatis, mantap
          selectedVoice = 'Enceladus'; 
          break;
        case 'fearful':
        case 'tense':
          // Suara tegang, beresonansi tinggi, penuh subteks
          selectedVoice = 'Iapetus';
          break;
        case 'sad':
        case 'melancholic':
          // Suara tenang, halus, emosional
          selectedVoice = 'Algenib';
          break;
        case 'hopeful':
        case 'relieved':
        case 'calm':
          // Suara hangat, bersahabat, optimis
          selectedVoice = 'Fenrir';
          break;
        case 'determined':
          // Suara berat, berwibawa, mantap
          selectedVoice = 'Zubenelgenubi';
          break;
        default:
          // Default male narrator epik sinematik
          selectedVoice = 'Charon';
          break;
      }
      
      // Khusus untuk nuansa premium yang sangat epik / legendaris
      if (tone.includes('sinematik') || tone.includes('epic') || tone.includes('dramatis')) {
        if (emotion === 'determined' || emotion === 'calm') {
          selectedVoice = 'Zubenelgenubi';
        } else if (emotion === 'tense' || emotion === 'angry') {
          selectedVoice = 'Charon';
        }
      }
    } else {
      // Female voices selection
      switch (emotion) {
        case 'angry':
        case 'shocked':
          // Suara kuat, berenergi, tegas
          selectedVoice = 'Despina';
          break;
        case 'fearful':
        case 'tense':
          // Suara responsif, penuh emosi, terengah
          selectedVoice = 'Callirrhoe';
          break;
        case 'sad':
        case 'melancholic':
          // Suara lembut, emosional, berbisik halus
          selectedVoice = 'Vindemiatrix';
          break;
        case 'hopeful':
        case 'relieved':
        case 'calm':
          // Suara hangat, ramah, bersinar
          selectedVoice = 'Achernar';
          break;
        case 'determined':
          // Suara berwibawa, percaya diri, profesional
          selectedVoice = 'Erinome';
          break;
        default:
          // Default female narrator
          selectedVoice = 'Aoede';
          break;
      }
      
      if (tone.includes('sinematik') || tone.includes('epic') || tone.includes('dramatis')) {
        if (emotion === 'determined') {
          selectedVoice = 'Erinome';
        } else if (emotion === 'calm' || emotion === 'hopeful') {
          selectedVoice = 'Achernar';
        }
      }
    }

    console.log(`[AICastingDirector] Casting Scene: Emotion=${emotion.toUpperCase()} Tone=${tone} -> Voice Casted: ${selectedVoice}`);
    return `gemini/gemini-2.5-flash-preview-tts/${selectedVoice}`;
  },

  /**
   * Project-level AI Casting Director: Menganalisis keseluruhan proyek (tema, gaya, nada, genre)
   * untuk memilih SATU pengisi suara yang konsisten untuk seluruh proyek.
   * Ini memastikan narasi memiliki suara yang terkunci (voice locking) di semua adegan.
   * @param {object} projectData - Data proyek lengkap { scenes, settings, title, ... }
   * @returns {{ modelName: string, voiceName: string, castReason: string }}
   */
  castProjectVoice: (projectData = {}) => {
    const settings = projectData.settings || {};
    const scenes = projectData.scenes || [];
    const projectTitle = (projectData.title || '').toLowerCase();
    const tone = (settings.tone || '').toLowerCase();
    const style = (settings.style || '').toLowerCase();
    const genre = (settings.genre || '').toLowerCase();

    // 1. Tentukan gender berdasarkan narasi scene pertama atau judul proyek
    let gender = 'male'; // default male narrator untuk nuansa sinematik

    const femaleKeywords = ['roro', 'jonggrang', 'wanita', 'gadis', 'ibu', 'perempuan', 'putri', 'she', 'her', 'female', 'woman', 'girl', 'queen', 'ratu'];
    const maleKeywords = ['bandung', 'bondowoso', 'rio', 'karsa', 'pria', 'lelaki', 'bapak', 'putra', 'he', 'him', 'male', 'man', 'boy', 'king', 'raja'];

    // Analisis dari scene pertama
    const firstScene = scenes[0] || {};
    const firstNarration = (firstScene.narration || '').toLowerCase();
    const firstDialogue = (firstScene.dialogue || '').toLowerCase();
    const textPool = `${projectTitle} ${firstNarration} ${firstDialogue}`;

    let femaleScore = 0;
    let maleScore = 0;

    femaleKeywords.forEach(k => {
      if (textPool.includes(k)) femaleScore += 1;
    });

    maleKeywords.forEach(k => {
      if (textPool.includes(k)) maleScore += 1;
    });

    if (femaleScore > maleScore) {
      gender = 'female';
    }

    console.log(`[AICastingDirector:ProjectVoice] Gender Score: female=${femaleScore}, male=${maleScore} -> selectedGender=${gender.toUpperCase()}`);

    // 2. Pilih suara berdasarkan tone/style proyek secara deterministik
    let selectedVoice;
    let castReason;

    const toneAndStyle = `${tone} ${style} ${genre}`;

    if (toneAndStyle.includes('epik') || toneAndStyle.includes('epic')) {
      selectedVoice = gender === 'male' ? 'Charon' : 'Aoede';
      castReason = `Suara epik dipilih karena tone proyek "${tone || style}" bernuansa heroik dan megah.`;
    } else if (toneAndStyle.includes('dramatis') || toneAndStyle.includes('dramatic')) {
      selectedVoice = gender === 'male' ? 'Fenrir' : 'Achernar';
      castReason = `Suara dramatis dipilih karena tone proyek "${tone || style}" membutuhkan kedalaman emosional.`;
    } else if (toneAndStyle.includes('horor') || toneAndStyle.includes('horror')) {
      selectedVoice = gender === 'male' ? 'Iapetus' : 'Callirrhoe';
      castReason = `Suara misterius dipilih karena genre proyek "${genre || tone}" bernuansa gelap dan mencekam.`;
    } else if (toneAndStyle.includes('romantis') || toneAndStyle.includes('romantic')) {
      selectedVoice = gender === 'male' ? 'Algenib' : 'Vindemiatrix';
      castReason = `Suara lembut dipilih karena tone proyek "${tone || style}" membutuhkan kelembutan emosional.`;
    } else if (toneAndStyle.includes('aksi') || toneAndStyle.includes('action')) {
      selectedVoice = gender === 'male' ? 'Zubenelgenubi' : 'Erinome';
      castReason = `Suara berwibawa dan tegas dipilih karena genre proyek "${genre || tone}" penuh aksi dan intensitas.`;
    } else {
      // Default: epik/sinematik
      selectedVoice = gender === 'male' ? 'Charon' : 'Aoede';
      castReason = `Suara sinematik default dipilih untuk proyek dengan tone "${tone || 'umum'}" dan gaya "${style || 'umum'}".`;
    }

    console.log(`[AICastingDirector:ProjectVoice] Project Voice Locked: ${selectedVoice} (${gender}) — ${castReason}`);

    return {
      modelName: 'gemini-2.5-flash-preview-tts',
      voiceName: selectedVoice,
      castReason
    };
  },

  /**
   * Generates Text-to-Speech audio for a scene narration using the Gemini TTS Proxy.
   * @param {string} text - Narration text to speak
   * @param {string} destPath - File path to save the generated MP3
   * @param {string|null} voiceModel - Model voice specific model name
   * @returns {Promise<string>} Destination path if successful
   */
  generateTts: async (text, destPath, voiceModel = null) => {
    if (!text || !text.trim()) {
      throw new AppError('Narasi tidak boleh kosong untuk membuat TTS.', 400);
    }

    const settings = settingsService.getSettings();
    const apiKey = settings.geminiApiKey;
    const baseUrl = (settings.geminiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

    if (!apiKey) {
      throw new AppError(
        'Gemini API Key belum dikonfigurasi. Silakan tambahkan Kredensial Gemini TTS di halaman Pengaturan terlebih dahulu.',
        400
      );
    }

    const selectedModel = voiceModel || 'gemini/gemini-2.5-flash-preview-tts/Zephyr';
    const isDirectGemini = baseUrl.includes('googleapis.com');

    if (isDirectGemini) {
      let modelName = 'gemini-2.5-flash-preview-tts';
      let voiceName = 'Zephyr';

      if (selectedModel.includes('/')) {
        const parts = selectedModel.split('/');
        if (parts.length === 3) {
          modelName = parts[1];
          voiceName = parts[2];
        } else if (parts.length === 2) {
          modelName = parts[0];
          voiceName = parts[1];
        } else {
          voiceName = parts[parts.length - 1];
        }
      } else {
        voiceName = selectedModel;
      }

      if (modelName === 'gemini') {
        modelName = 'gemini-2.5-flash-preview-tts';
      }

      // Normalize baseUrl domain
      let domain = baseUrl;
      if (domain.includes('googleapis.com')) {
        domain = 'https://generativelanguage.googleapis.com';
      }
      
      const url = `${domain}/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      console.log(`[TTSService] Direct Gemini TTS API Request to ${url} (Voice: ${voiceName})`);
      logToBackendFile(`[TTSService] Direct request. Model=${modelName} Voice=${voiceName} Text length=${text.length}`);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: text
              }]
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName
                  }
                }
              }
            }
          })
        });

        if (!response.ok) {
          let errMsg = 'Gagal memanggil Gemini Speech API langsung.';
          try {
            const errJson = await response.json();
            if (errJson && errJson.error) {
              errMsg = errJson.error.message || errMsg;
            }
          } catch (e) {
            // Non-JSON response
          }

          // Handle 429 rate limit specifically
          if (response.status === 429) {
            let retryAfter = 'unknown';
            const retryMatch = errMsg.match(/retry\s+(?:after|in)\s+([\d.]+)s/i);
            if (retryMatch) {
              retryAfter = retryMatch[1];
            }
            logToBackendFile(`[TTSService:429] Rate limited by Gemini API. RetryAfter=${retryAfter}s ErrorMsg=${errMsg}`);
            console.error(`[TTSService:429] Rate limited. Retry after ${retryAfter}s`);
            throw new AppError(`Gemini API rate limit (429): Terlalu banyak request. Coba lagi dalam ${retryAfter} detik. Detail: ${errMsg}`, 429);
          }

          throw new AppError(`Direct Gemini Speech API error (Status ${response.status}): ${errMsg}`, response.status);
        }

        const responseJson = await response.json();
        const mimeType = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;
        const base64Data = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        logToBackendFile(`[TTSAudioWrite] API response received. mimeType=${mimeType || 'unknown'} base64Length=${base64Data?.length || 0}`);
        if (!base64Data) {
          throw new AppError('Tidak ada data audio (inlineData.data) yang dikembalikan oleh Gemini Speech API.', 500);
        }

        // Decode base64 to temp PCM file, transcode using FFmpeg, and delete PCM
        const tempPcmPath = destPath.replace(/\.mp3$/, '') + `_temp_${Date.now()}.pcm`;
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(tempPcmPath, buffer);
          
          const { ffmpegService } = await import('./ffmpegService.js');
          await ffmpegService.transcodePcmToMp3(tempPcmPath, destPath);

          // Validate output file
          if (!fs.existsSync(destPath)) {
            throw new AppError('FFmpeg transcode completed but output file not found.', 500);
          }
          const outputStats = fs.statSync(destPath);
          if (outputStats.size < 1000) {
            throw new AppError(`FFmpeg output file too small (${outputStats.size} bytes).`, 500);
          }
          logToBackendFile(`[TTSService] Validated output: ${destPath} (${(outputStats.size / 1024).toFixed(1)} KB)`);

          console.log(`[TTSService] Direct Gemini TTS speech generated and saved to: ${destPath}`);
          logToBackendFile(`[TTSService] Direct TTS Success. Saved to=${destPath}`);
          return destPath;
        } finally {
          if (fs.existsSync(tempPcmPath)) {
            try {
              fs.unlinkSync(tempPcmPath);
            } catch (unlinkErr) {
              console.warn(`[TTSService] Gagal menghapus file PCM sementara: ${unlinkErr.message}`);
            }
          }
        }
      } catch (err) {
        console.error(`[TTSService] Direct Speech generation failed:`, err.message);
        logToBackendFile(`[TTSService] Direct TTS Failed. Error=${err.message}`);
        if (err instanceof AppError) throw err;
        throw new AppError(`Gagal menghubungi Gemini Speech API langsung di ${domain}. Cek koneksi internet dan API Key Anda.`, 502);
      }
    } else {
      const url = `${baseUrl}/audio/speech`;
      console.log(`[TTSService] Generating speech using ${selectedModel} for text: "${text.substring(0, 60)}..." using ${url}`);
      logToBackendFile(`[TTSService] Requesting TTS. Model=${selectedModel} Text length=${text.length} endpoint=${url}`);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            input: text
          })
        });

        if (!response.ok) {
          let errMsg = 'Terjadi kesalahan pada Gemini TTS Proxy.';
          try {
            const errJson = await response.json();
            if (errJson && errJson.error) {
              errMsg = errJson.error.message || errMsg;
            }
          } catch (e) {
            // Non-JSON response
          }
          throw new AppError(`Gemini TTS API error (Status ${response.status}): ${errMsg}`, response.status);
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(buffer));
        console.log(`[TTSService] Proxy TTS speech saved to: ${destPath} (${Math.round(buffer.byteLength / 1024)} KB)`);
        logToBackendFile(`[TTSService] Proxy TTS Success. Size=${buffer.byteLength} bytes saved to=${destPath}`);
        return destPath;
      } catch (err) {
        console.error(`[TTSService] Speech generation failed:`, err.message);
        logToBackendFile(`[TTSService] Failed. Error=${err.message}`);
        if (err instanceof AppError) throw err;
        throw new AppError(`Gagal menghubungi Gemini TTS proxy di ${baseUrl}. Cek apakah proxy 9Router aktif.`, 502);
      }
    }
  }
};

export default ttsService;
