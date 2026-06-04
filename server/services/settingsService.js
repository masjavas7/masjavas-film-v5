import fs from 'fs';
import path from 'path';
import { getRuntimePaths } from '../utils/runtimePaths.js';
import { config } from '../config/env.js';

function getConfigFilePath() {
  const paths = getRuntimePaths();
  return path.join(paths.userDataDir, 'config.json');
}

export const settingsService = {
  /**
   * Mendapatkan pengaturan pengguna saat ini.
   * @returns {object} { apiKey: string, apiBaseUrl: string, geminiApiKey: string, geminiBaseUrl: string }
   */
  getSettings: () => {
    const configPath = getConfigFilePath();
    let loadedSettings = { apiKey: '', apiBaseUrl: '', geminiApiKey: '', geminiBaseUrl: '', storyboardDelaySec: 10 };

    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        loadedSettings = {
          apiKey: parsed.apiKey || '',
          apiBaseUrl: parsed.apiBaseUrl || '',
          geminiApiKey: parsed.geminiApiKey || '',
          geminiBaseUrl: parsed.geminiBaseUrl || '',
          storyboardDelaySec: parsed.storyboardDelaySec !== undefined ? Number(parsed.storyboardDelaySec) : 10
        };
      } catch (err) {
        console.warn('[SettingsService] Gagal membaca config.json:', err.message);
      }
    }

    // Gunakan fallback dari process.env / config.js jika kosong
    return {
      apiKey: loadedSettings.apiKey || config.GROKPI_API_KEY || '',
      apiBaseUrl: loadedSettings.apiBaseUrl || config.GROKPI_BASE_URL || 'https://www.grokpi.masjavas.my.id/v1',
      geminiApiKey: loadedSettings.geminiApiKey || process.env.GEMINI_API_KEY || '',
      geminiBaseUrl: loadedSettings.geminiBaseUrl || 'https://generativelanguage.googleapis.com',
      storyboardDelaySec: loadedSettings.storyboardDelaySec !== undefined ? loadedSettings.storyboardDelaySec : 10
    };
  },

  /**
   * Memperbarui pengaturan pengguna.
   * @param {object} updates { apiKey?: string, apiBaseUrl?: string, geminiApiKey?: string, geminiBaseUrl?: string, storyboardDelaySec?: number }
   */
  updateSettings: (updates) => {
    const current = settingsService.getSettings();
    const configPath = getConfigFilePath();

    const newSettings = {
      apiKey: typeof updates.apiKey === 'string' ? updates.apiKey.trim() : current.apiKey,
      apiBaseUrl: typeof updates.apiBaseUrl === 'string' ? updates.apiBaseUrl.trim() : current.apiBaseUrl,
      geminiApiKey: typeof updates.geminiApiKey === 'string' ? updates.geminiApiKey.trim() : current.geminiApiKey,
      geminiBaseUrl: typeof updates.geminiBaseUrl === 'string' ? updates.geminiBaseUrl.trim() : current.geminiBaseUrl,
      storyboardDelaySec: updates.storyboardDelaySec !== undefined ? Math.max(5, Math.min(30, Number(updates.storyboardDelaySec))) : current.storyboardDelaySec
    };

    try {
      fs.writeFileSync(configPath, JSON.stringify(newSettings, null, 2), 'utf8');
      console.log('[SettingsService] Pengaturan disimpan ke:', configPath);
      return { success: true };
    } catch (err) {
      console.error('[SettingsService] Gagal menyimpan config.json:', err);
      throw new Error(`Gagal menyimpan pengaturan: ${err.message}`);
    }
  }
};

export default settingsService;
