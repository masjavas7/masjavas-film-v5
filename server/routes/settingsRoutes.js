import { Router } from 'express';
import { settingsService } from '../services/settingsService.js';

const router = Router();

/**
 * GET /api/settings
 * Mendapatkan konfigurasi ter-masking untuk antarmuka pengguna (Settings screen)
 */
router.get('/settings', (req, res, next) => {
  try {
    const settings = settingsService.getSettings();
    const hasKey = !!settings.apiKey;
    const hasGeminiKey = !!settings.geminiApiKey;
    
    // Mask key
    let apiKeyMasked = '';
    if (hasKey) {
      const key = settings.apiKey;
      apiKeyMasked = key.length <= 8 ? '••••••••' : `${key.slice(0, 3)}••••••••${key.slice(-4)}`;
    }
    
    let geminiApiKeyMasked = '';
    if (hasGeminiKey) {
      const key = settings.geminiApiKey;
      geminiApiKeyMasked = key.length <= 8 ? '••••••••' : `${key.slice(0, 3)}••••••••${key.slice(-4)}`;
    }

    res.json({
      hasApiKey: hasKey,
      apiKeyMasked,
      apiBaseUrl: settings.apiBaseUrl,
      hasGeminiApiKey: hasGeminiKey,
      geminiApiKeyMasked,
      geminiBaseUrl: settings.geminiBaseUrl || 'https://generativelanguage.googleapis.com',
      storyboardDelaySec: settings.storyboardDelaySec !== undefined ? settings.storyboardDelaySec : 10
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings
 * Menyimpan pengaturan API key dan base URL baru
 */
router.post('/settings', (req, res, next) => {
  try {
    const { apiKey, apiBaseUrl, geminiApiKey, geminiBaseUrl, storyboardDelaySec } = req.body;
    
    const updates = {};
    if (typeof apiKey === 'string') {
      if (!apiKey.includes('••••••••')) {
        updates.apiKey = apiKey;
      }
    }
    if (typeof apiBaseUrl === 'string') {
      updates.apiBaseUrl = apiBaseUrl;
    }
    if (typeof geminiApiKey === 'string') {
      if (!geminiApiKey.includes('••••••••')) {
        updates.geminiApiKey = geminiApiKey;
      }
    }
    if (typeof geminiBaseUrl === 'string') {
      updates.geminiBaseUrl = geminiBaseUrl;
    }
    if (storyboardDelaySec !== undefined) {
      updates.storyboardDelaySec = Number(storyboardDelaySec);
    }

    const result = settingsService.updateSettings(updates);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings/test-grokpi
 * Menguji koneksi kredensial GrokPI
 */
router.post('/settings/test-grokpi', async (req, res, next) => {
  try {
    const settings = settingsService.getSettings();
    let { apiKey, apiBaseUrl } = req.body;

    if (apiKey && apiKey.includes('••••••••')) {
      apiKey = settings.apiKey;
    }
    if (!apiKey) {
      apiKey = settings.apiKey;
    }
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API Key tidak boleh kosong. Silakan masukkan API Key di Pengaturan.' });
    }

    let baseUrl = (apiBaseUrl || settings.apiBaseUrl || 'https://www.grokpi.masjavas.my.id/v1').replace(/\/$/, '');
    if (baseUrl.endsWith('/v1')) {
      baseUrl = baseUrl.slice(0, -3);
    }
    const url = `${baseUrl}/v1/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-4.1-expert',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        res.json({ success: true, message: 'Koneksi GrokPI Berhasil! API Key aktif.' });
      } else {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || `HTTP ${response.status}`;
        res.status(response.status).json({ success: false, message: `Koneksi Gagal: ${errMsg}` });
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      res.status(502).json({ success: false, message: `Gagal menghubungi AI provider: ${fetchErr.message}` });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings/test-gemini
 * Menguji koneksi kredensial Gemini / Google AI Studio Speech
 */
router.post('/settings/test-gemini', async (req, res, next) => {
  try {
    const settings = settingsService.getSettings();
    let { geminiApiKey, geminiBaseUrl } = req.body;

    if (geminiApiKey && geminiApiKey.includes('••••••••')) {
      geminiApiKey = settings.geminiApiKey;
    }
    if (!geminiApiKey) {
      geminiApiKey = settings.geminiApiKey;
    }
    if (!geminiApiKey) {
      return res.status(400).json({ success: false, message: 'Gemini API Key tidak boleh kosong. Silakan masukkan API Key di Pengaturan.' });
    }

    let domain = (geminiBaseUrl || settings.geminiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
    if (domain.includes('googleapis.com')) {
      domain = 'https://generativelanguage.googleapis.com';
    }

    const url = `${domain}/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        res.json({ success: true, message: 'Koneksi Gemini Berhasil! API Key aktif.' });
      } else {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || `HTTP ${response.status}`;
        res.status(response.status).json({ success: false, message: `Koneksi Gagal: ${errMsg}` });
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      res.status(502).json({ success: false, message: `Gagal menghubungi Google AI Studio: ${fetchErr.message}` });
    }
  } catch (error) {
    next(error);
  }
});
export default router;
