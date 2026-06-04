import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getRuntimePaths } from '../utils/runtimePaths.js';
import { settingsService } from '../services/settingsService.js';
import { ffmpegService } from '../services/ffmpegService.js';
import { localOnly } from '../middleware/localOnly.js';

const router = Router();
router.use(localOnly);

function checkWritable(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const tempFile = path.join(dirPath, `.write-test-${Date.now()}`);
    fs.writeFileSync(tempFile, 'test', 'utf8');
    fs.unlinkSync(tempFile);
    return true;
  } catch (err) {
    console.error(`[Debug Route] Path is not writable: ${dirPath}`, err.message);
    return false;
  }
}

function checkSettingsReadable() {
  try {
    const paths = getRuntimePaths();
    const configPath = path.join(paths.userDataDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      // It's readable even if it doesn't exist (because we can create it or read fallback)
      return true;
    }
    fs.accessSync(configPath, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * GET /api/debug/runtime
 * Return secure runtime environment diagnostics
 */
router.get('/debug/runtime', (req, res) => {
  try {
    const paths = getRuntimePaths();
    const settings = settingsService.getSettings();
    const ffmpegStatus = ffmpegService.checkAvailability();
    
    const isDesktop = process.env.MASJAVAS_DESKTOP_PACKAGED === 'true' || !!process.versions.electron;

    res.json({
      mode: isDesktop ? "desktop" : "dev",
      apiBaseUrl: `${req.protocol}://${req.get('host')}`,
      userDataPath: paths.userDataDir,
      projectsDir: paths.projectsDir,
      uploadsDir: paths.uploadsDir,
      exportsDir: paths.exportsDir,
      hasGrokpiKey: !!settings.apiKey,
      grokpiBaseUrl: settings.apiBaseUrl,
      ffmpegAvailable: ffmpegStatus.available
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/debug/health/full
 * Thorough checks on file system, settings and tools
 */
router.get('/debug/health/full', (req, res) => {
  try {
    const paths = getRuntimePaths();
    const settings = settingsService.getSettings();
    const ffmpegStatus = ffmpegService.checkAvailability();

    const projectWritable = checkWritable(paths.projectsDir);
    const uploadsWritable = checkWritable(paths.uploadsDir);
    const exportsWritable = checkWritable(paths.exportsDir);
    const settingsReadable = checkSettingsReadable();

    res.json({
      status: (projectWritable && uploadsWritable && exportsWritable && settingsReadable) ? "healthy" : "degraded",
      projectStorageWritable: projectWritable,
      uploadsWritable: uploadsWritable,
      exportsWritable: exportsWritable,
      settingsReadable: settingsReadable,
      grokpiKeyConfigured: !!settings.apiKey,
      ffmpegAvailable: ffmpegStatus.available,
      ffmpegVersion: ffmpegStatus.version
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/debug/open-logs
 * Open logs folder in file explorer
 */
router.post('/debug/open-logs', async (req, res) => {
  try {
    const paths = getRuntimePaths();
    const logDir = path.join(paths.userDataDir, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const { execFile } = await import('child_process');
    const resolvedLogDir = path.resolve(logDir);
    const resolvedUserData = path.resolve(paths.userDataDir);
    if (!resolvedLogDir.startsWith(resolvedUserData)) {
      return res.status(400).json({ error: 'Lokasi log tidak valid.' });
    }

    if (process.platform === 'win32') {
      execFile('explorer.exe', [resolvedLogDir]);
    } else if (process.platform === 'darwin') {
      execFile('open', [resolvedLogDir]);
    } else {
      execFile('xdg-open', [resolvedLogDir]);
    }

    res.json({ success: true, logDir });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
