import fs from 'fs';
import path from 'path';
import { getRuntimePaths } from './runtimePaths.js';

/**
 * Menulis log ke file logs/backend.log di direktori runtime.
 * @param {string} msg - Pesan log
 */
export function logToBackendFile(msg) {
  try {
    const logsDir = getRuntimePaths().logsDir;
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'backend.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`, 'utf8');
    console.log(`[Backend] ${msg}`);
  } catch (err) {
    console.error('[Logger] Gagal menulis ke backend.log:', err.message);
  }
}

/**
 * Menulis log ke file logs/desktop-main.log di direktori runtime.
 * @param {string} msg - Pesan log
 */
export function logToDesktopMainFile(msg) {
  try {
    const logsDir = getRuntimePaths().logsDir;
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'desktop-main.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] [BackendMain] ${msg}\n`, 'utf8');
    console.log(`[DesktopMainLog] ${msg}`);
  } catch (err) {
    console.error('[Logger] Gagal menulis ke desktop-main.log:', err.message);
  }
}

export default { logToBackendFile, logToDesktopMainFile };
