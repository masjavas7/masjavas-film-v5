import path from 'path';

/**
 * Mendapatkan jalur eksekusi ffmpeg.
 * @returns {string}
 */
export function getFfmpegPath() {
  if (process.env.MASJAVAS_FFMPEG_PATH) {
    return process.env.MASJAVAS_FFMPEG_PATH;
  }
  if (process.env.MASJAVAS_DESKTOP_PACKAGED === 'true') {
    // process.resourcesPath ditunjuk oleh Electron ke folder asalnya setelah terinstal
    return path.join(process.resourcesPath, 'ffmpeg', 'win32', 'ffmpeg.exe');
  }
  return 'ffmpeg';
}

/**
 * Mendapatkan jalur eksekusi ffprobe.
 * @returns {string}
 */
export function getFfprobePath() {
  if (process.env.MASJAVAS_FFPROBE_PATH) {
    return process.env.MASJAVAS_FFPROBE_PATH;
  }
  if (process.env.MASJAVAS_DESKTOP_PACKAGED === 'true') {
    return path.join(process.resourcesPath, 'ffmpeg', 'win32', 'ffprobe.exe');
  }
  return 'ffprobe';
}

export default { getFfmpegPath, getFfprobePath };
