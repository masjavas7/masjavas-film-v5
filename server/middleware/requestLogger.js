import fs from 'fs';
import path from 'path';
import { getRuntimePaths } from '../utils/runtimePaths.js';

function appendAccessLog(line) {
  try {
    const logDir = getRuntimePaths().logsDir;
    const logFile = path.join(logDir, 'access.log');
    fs.appendFileSync(logFile, line + '\n', 'utf8');
  } catch {
    // Non-fatal: logging must not break requests
  }
}

/**
 * Lightweight request logging + slow-request warning.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (ms > 2000 || res.statusCode >= 500) {
      console.warn('[SLOW_OR_ERROR]', line);
    }
    if (process.env.LOG_ACCESS === 'true') {
      appendAccessLog(line);
    }
  });

  next();
}

export default requestLogger;