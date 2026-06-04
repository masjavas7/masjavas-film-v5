/**
 * subtitleService.js
 * Menghasilkan file subtitle SRT dari narasi tiap scene.
 * Format waktu SRT: HH:MM:SS,mmm --> HH:MM:SS,mmm
 */

import fs from 'fs';
import path from 'path';

/**
 * Format detik ke format waktu SRT: HH:MM:SS,mmm
 * @param {number} secs
 * @returns {string}
 */
function formatSrtTime(secs) {
  const totalMs = Math.round(secs * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSec % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format detik ke format waktu ASS: H:MM:SS.cs
 * @param {number} secs
 * @returns {string}
 */
function formatAssTime(secs) {
  const totalMs = Math.round(secs * 1000);
  const cs = Math.floor((totalMs % 1000) / 10);
  const totalSec = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSec / 3600).toString();
  const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSec % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}.${cs.toString().padStart(2, '0')}`;
}

export const subtitleService = {
  /**
   * Generate ASS content dari array scene narrations (Netflix Premium Style).
   * @param {Array<{ sceneId: string, narration: string, durationSec: number }>} sceneNarrations
   * @returns {string} ASS file content
   */
  generateAss: (sceneNarrations) => {
    let assContent = `[Script Info]
Title: Netflix Style Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Netflix,Arial,44,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,20,20,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let currentTime = 0;
    sceneNarrations.forEach((item, index) => {
      const startSec = currentTime;
      const endSec = currentTime + (item.durationSec || 10);
      const narration = item.narration || `Adegan ${index + 1}`;

      // Break narration into lines of max 60 chars (safer Netflix sizing)
      const lines = [];
      const words = narration.split(' ');
      let line = '';
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 60 && line.length > 0) {
          lines.push(line.trim());
          line = word;
        } else {
          line = line ? line + ' ' + word : word;
        }
      }
      if (line.trim()) lines.push(line.trim());

      // Max 2 lines for high aesthetic Netflix look
      const text = lines.slice(0, 2).join('\\N');

      const startStr = formatAssTime(startSec);
      const endStr = formatAssTime(endSec);

      assContent += `Dialogue: 0,${startStr},${endStr},Netflix,,0,0,0,,${text}\n`;

      currentTime = endSec;
    });

    return assContent;
  },

  /**
   * Generate ASS file dan simpan ke disk.
   * @param {Array<{ sceneId: string, narration: string, durationSec: number }>} sceneNarrations
   * @param {string} outputPath - Path file output .ass
   * @returns {string} Path file yang disimpan
   */
  generateAssFile: (sceneNarrations, outputPath) => {
    const content = subtitleService.generateAss(sceneNarrations);
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[SubtitleService] ASS file written: ${outputPath} (${sceneNarrations.length} entries)`);
    return outputPath;
  },

  /**
   * Generate SRT content dari array scene narrations.
   * @param {Array<{ sceneId: string, narration: string, durationSec: number }>} sceneNarrations
   * @returns {string} SRT file content
   */
  generateSrt: (sceneNarrations) => {
    let srtContent = '';
    let currentTime = 0;

    sceneNarrations.forEach((item, index) => {
      const startSec = currentTime;
      const endSec = currentTime + (item.durationSec || 10);
      const narration = item.narration || `Adegan ${index + 1}`;

      // Break narration into lines of max 80 chars
      const lines = [];
      const words = narration.split(' ');
      let line = '';
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 80 && line.length > 0) {
          lines.push(line.trim());
          line = word;
        } else {
          line = line ? line + ' ' + word : word;
        }
      }
      if (line.trim()) lines.push(line.trim());

      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n`;
      srtContent += lines.slice(0, 3).join('\n') + '\n'; // max 3 baris per cue
      srtContent += '\n';

      currentTime = endSec;
    });

    return srtContent.trim() + '\n';
  },

  /**
   * Generate SRT file dan simpan ke disk.
   * @param {Array<{ sceneId: string, narration: string, durationSec: number }>} sceneNarrations
   * @param {string} outputPath - Path file output .srt
   * @returns {string} Path file yang disimpan
   */
  generateSrtFile: (sceneNarrations, outputPath) => {
    const content = subtitleService.generateSrt(sceneNarrations);
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[SubtitleService] SRT file written: ${outputPath} (${sceneNarrations.length} entries)`);
    return outputPath;
  },

  /**
   * Generate WebVTT content dari narasi scenes.
   * @param {Array<{ narration: string, durationSec: number }>} sceneNarrations
   * @returns {string} VTT content
   */
  generateVtt: (sceneNarrations) => {
    let vttContent = 'WEBVTT\n\n';
    let currentTime = 0;

    sceneNarrations.forEach((item, index) => {
      const startSec = currentTime;
      const endSec = currentTime + (item.durationSec || 10);
      const narration = item.narration || `Scene ${index + 1}`;

      const formatVttTime = (secs) => {
        const ms = Math.round((secs % 1) * 1000).toString().padStart(3, '0');
        const totalSec = Math.floor(secs);
        const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSec % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}.${ms}`;
      };

      vttContent += `${index + 1}\n`;
      vttContent += `${formatVttTime(startSec)} --> ${formatVttTime(endSec)}\n`;
      vttContent += `${narration}\n\n`;

      currentTime = endSec;
    });

    return vttContent;
  }
};

export default subtitleService;
