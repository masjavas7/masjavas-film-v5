/**
 * ffmpegService.js
 * Wrapper untuk FFmpeg CLI yang menangani:
 * - Deteksi ketersediaan FFmpeg
 * - Transcode video per scene ke project ratio target
 * - Fit with blur background (ratio mismatch handling)
 * - Crop center (ratio mismatch handling)
 * - Letterbox / black bars (ratio mismatch handling)
 * - Concatenate multiple scene videos
 * - Normalize audio (loudnorm)
 * - Mux subtitle SRT ke MP4
 */

import { exec, execSync, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpegResolver.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Run FFmpeg with array arguments to avoid shell quoting issues on Windows.
 * @param {string[]} args - Array of FFmpeg arguments
 * @param {number} timeoutMs
 * @param {object} options - Optional process execution options
 */
async function runFfmpeg(args, timeoutMs = 300000, options = {}) {
  const ffmpegPath = getFfmpegPath();
  return execFileAsync(ffmpegPath, args, { 
    timeout: timeoutMs, 
    maxBuffer: 10 * 1024 * 1024,
    ...options
  });
}


/**
 * Resolusi target berdasarkan aspect ratio + preset
 */
const RESOLUTION_MAP = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1':  { width: 1080, height: 1080 },
  '21:9': { width: 2560, height: 1080 }
};

/**
 * Cek apakah FFmpeg tersedia di PATH sistem.
 * @returns {{ available: boolean, version: string|null }}
 */
export const ffmpegService = {

  checkAvailability: () => {
    try {
      const ffmpegPath = getFfmpegPath();
      // Bungkus path dalam kutip ganda jika terdapat spasi di path windows
      const result = execSync(`"${ffmpegPath}" -version 2>&1`, { encoding: 'utf8', timeout: 5000 });
      const versionMatch = result.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      console.log(`[FFmpegService] FFmpeg available: v${version}`);
      return { available: true, version };
    } catch (err) {
      console.warn('[FFmpegService] FFmpeg not found in PATH:', err.message);
      return { available: false, version: null };
    }
  },

  /**
   * Mendapatkan resolusi target berdasarkan aspect ratio.
   * @param {string} aspectRatio - "16:9" | "9:16" | "1:1"
   * @returns {{ width: number, height: number }}
   */
  getTargetResolution: (aspectRatio) => {
    return RESOLUTION_MAP[aspectRatio] || RESOLUTION_MAP['16:9'];
  },

  /**
   * Transcode satu video ke project ratio target dengan strategi penanganan mismatch.
   * @param {string} inputPath - Path file video input
   * @param {string} outputPath - Path file video output
   * @param {string} targetRatio - "16:9" | "9:16" | "1:1"
   * @param {string} strategy - "fit_blur" | "crop_center" | "letterbox"
   * @returns {Promise<void>}
   */
  transcodeScene: async (inputPath, outputPath, targetRatio, strategy = 'fit_blur') => {
    const { width, height } = ffmpegService.getTargetResolution(targetRatio);

    let args;

    switch (strategy) {
      case 'crop_center': {
        const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
        args = ['-y', '-i', inputPath, '-vf', vf,
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', outputPath];
        break;
      }
      case 'letterbox': {
        const vf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
        args = ['-y', '-i', inputPath, '-vf', vf,
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', outputPath];
        break;
      }
      case 'fit_blur':
      default: {
        // Fit with blur background: complex filter graph
        const lavfi = [
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=20:10[bg]`,
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg]`,
          `[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
        ].join(';');
        args = ['-y', '-i', inputPath, '-lavfi', lavfi,
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', outputPath];
        break;
      }
    }

    console.log(`[FFmpegService] Transcoding scene: ${path.basename(inputPath)} → ${path.basename(outputPath)} [${strategy}]`);
    
    try {
      await runFfmpeg(args, 300000);
      console.log(`[FFmpegService] Transcode complete: ${path.basename(outputPath)}`);
    } catch (err) {
      throw new Error(`FFmpeg transcode failed for ${path.basename(inputPath)}: ${err.message?.slice(0, 500)}`);
    }
  },

  /**
   * Concatenate multiple transcoded scene videos menjadi satu video.
   * @param {string[]} scenePaths - Array path scene MP4 yang sudah di-transcode
   * @param {string} outputPath - Path output video final
   * @returns {Promise<void>}
   */
  concatenateScenes: async (scenePaths, outputPath) => {
    if (!scenePaths || scenePaths.length === 0) {
      throw new Error('No scene paths provided for concatenation');
    }

    if (scenePaths.length === 1) {
      fs.copyFileSync(scenePaths[0], outputPath);
      console.log(`[FFmpegService] Single scene, copied directly: ${outputPath}`);
      return;
    }

    // Buat concat demuxer file list
    const concatListPath = outputPath.replace('.mp4', '_concat_list.txt');
    const concatContent = scenePaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent, 'utf8');

    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      outputPath
    ];

    console.log(`[FFmpegService] Concatenating ${scenePaths.length} scenes...`);

    try {
      await runFfmpeg(args, 600000); // 10 min timeout
      console.log(`[FFmpegService] Concatenation complete: ${outputPath}`);
    } catch (err) {
      throw new Error(`FFmpeg concat failed: ${err.message}`);
    } finally {
      // Cleanup concat list file
      if (fs.existsSync(concatListPath)) {
        fs.unlinkSync(concatListPath);
      }
    }
  },

  /**
   * Normalize audio dengan loudnorm filter dan hardcode (burn-in) subtitle SRT ke video.
   * @param {string} inputPath - Path video concatenated
   * @param {string} subtitlePath - Path file SRT
   * @param {string} outputPath - Path output final.mp4
   * @param {boolean} includeSubtitle - apakah subtitle dibakar (hardcode) ke video
   * @param {string} cwd - Current working directory (untuk resolusi srt tanpa path escaping)
   * @returns {Promise<void>}
   */
  normalizeAndMux: async (inputPath, subtitlePath, outputPath, includeSubtitle = false, cwd = null) => {
    let args;

    if (includeSubtitle && fs.existsSync(subtitlePath)) {
      // Bakar (hardcode/burn-in) subtitle ke dalam frame video menggunakan video filter subtitles
      // Menggunakan relative path jika cwd diberikan untuk menghindari Windows path escaping issues
      const subtitleFilename = cwd ? path.basename(subtitlePath) : subtitlePath;
      
      console.log(`[FFmpegService] Subtitles will be burnt into the video stream using: ${subtitleFilename}`);

      args = [
        '-y',
        '-i', inputPath,
        '-af', 'loudnorm',
        '-vf', `subtitles=${subtitleFilename}`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-async', '1',
        outputPath
      ];
    } else {
      // Audio normalize saja dengan stream copy video (sangat cepat) tanpa subtitle
      args = [
        '-y',
        '-i', inputPath,
        '-af', 'loudnorm',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-async', '1',
        outputPath
      ];
    }

    console.log(`[FFmpegService] Normalizing audio${includeSubtitle ? ' + burning subtitles (re-encoding)' : ' (stream copy)'}...`);

    try {
      await runFfmpeg(args, 300000, cwd ? { cwd } : {});
      console.log(`[FFmpegService] Audio normalization and subtitle processing complete: ${outputPath}`);
    } catch (err) {
      // Fallback: jika loudnorm atau subtitle burning gagal, copy saja tanpa normalize/subtitle
      console.warn(`[FFmpegService] normalizeAndMux failed, falling back to copy: ${err.message}`);
      try {
        fs.copyFileSync(inputPath, outputPath);
      } catch (copyErr) {
        throw new Error(`Fallback copy failed: ${copyErr.message}`);
      }
    }
  },


  /**
   * Cek apakah file video memiliki stream audio.
   * @param {string} videoPath
   * @returns {Promise<boolean>}
   */
  hasAudioStream: async (videoPath) => {
    try {
      const ffprobePath = getFfprobePath();
      const args = [
        '-v', 'error',
        '-select_streams', 'a',
        '-show_entries', 'stream=codec_type',
        '-of', 'csv=p=0',
        videoPath
      ];
      const { stdout } = await execFileAsync(ffprobePath, args, { timeout: 30000 });
      return stdout.trim().includes('audio');
    } catch (err) {
      console.warn(`[FFmpegService] hasAudioStream failed for ${path.basename(videoPath)}, assuming false:`, err.message);
      return false;
    }
  },

  /**
   * Mux audio narasi TTS dan video adegan secara harmoni.
   * - Delay TTS tepat 2.0 detik.
   * - Duck volume audio latar (SFX video) ke 0.35.
   * - Mixing menggunakan amix filter.
   * - Gunakan stream copy video untuk zero video quality loss.
   * @param {string} videoPath
   * @param {string} ttsPath
   * @param {string} outputPath
   * @returns {Promise<void>}
   */
  mixTtsAudio: async (videoPath, ttsPath, outputPath) => {
    const hasAudio = await ffmpegService.hasAudioStream(videoPath);
    let args;

    if (hasAudio) {
      // Delay both channels for stereo or mono. e.g. adelay=2000|2000
      const filter = `[0:a]volume=0.35[bg];[1:a]adelay=2000|2000[fg];[bg][fg]amix=inputs=2:duration=first:dropout_transition=2[out]`;
      args = [
        '-y',
        '-i', videoPath,
        '-i', ttsPath,
        '-filter_complex', filter,
        '-map', '0:v',
        '-map', '[out]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        outputPath
      ];
    } else {
      const filter = `[1:a]adelay=2000|2000[out]`;
      args = [
        '-y',
        '-i', videoPath,
        '-i', ttsPath,
        '-filter_complex', filter,
        '-map', '0:v',
        '-map', '[out]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-shortest',
        outputPath
      ];
    }

    console.log(`[FFmpegService] Mixing TTS narration onto video: ${path.basename(videoPath)} (Has audio: ${hasAudio})`);
    try {
      await runFfmpeg(args, 180000);
      console.log(`[FFmpegService] Mixed audio complete: ${path.basename(outputPath)}`);
    } catch (err) {
      throw new Error(`FFmpeg audio mix failed for scene: ${err.message?.slice(0, 500)}`);
    }
  },

  /**
   * Download video dari URL ke file lokal.
   * @param {string} url - URL video
   * @param {string} destPath - Path tujuan
   * @returns {Promise<void>}
   */
  downloadVideo: async (url, destPath) => {
    console.log(`[FFmpegService] Downloading video from: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      console.log(`[FFmpegService] Downloaded to: ${destPath} (${Math.round(buffer.byteLength / 1024)}KB)`);
    } catch (err) {
      throw new Error(`Failed to download video from ${url}: ${err.message}`);
    }
  },

  /**
   * Get duration of an audio/video file in seconds using ffprobe.
   * @param {string} filePath - Path to audio/video file
   * @returns {Promise<number>} Duration in seconds, or 0 if failed
   */
  getAudioDuration: async (filePath) => {
    try {
      const ffprobePath = getFfprobePath();
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ];
      const { stdout } = await execFileAsync(ffprobePath, args, { timeout: 10000 });
      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? 0 : parseFloat(duration.toFixed(2));
    } catch (err) {
      console.warn(`[FFmpegService] getAudioDuration failed for ${path.basename(filePath)}:`, err.message);
      return 0;
    }
  },

  /**
   * Transcode raw PCM file (s16le, 24000Hz, mono) to high-fidelity MP3.
   * @param {string} pcmPath - Path to input raw .pcm file
   * @param {string} mp3Path - Path to output .mp3 file
   * @returns {Promise<void>}
   */
  transcodePcmToMp3: async (pcmPath, mp3Path) => {
    const args = [
      '-y',
      '-f', 's16le',
      '-ar', '24000',
      '-ac', '1',
      '-i', pcmPath,
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      mp3Path
    ];
    console.log(`[FFmpegService] Transcoding PCM to MP3: ${path.basename(pcmPath)} → ${path.basename(mp3Path)}`);
    try {
      await runFfmpeg(args, 60000);
      console.log(`[FFmpegService] Transcoding complete: ${path.basename(mp3Path)}`);
    } catch (err) {
      throw new Error(`FFmpeg PCM transcode failed: ${err.message}`);
    }
  }
};

// Patch ffmpegService to expose internal exec for blank video generation via array args
ffmpegService._execCmd = async (args, timeout) => {
  return runFfmpeg(args, timeout);
};

export default ffmpegService;
