import fs from 'fs';
import path from 'path';
import { getRuntimePaths } from './runtimePaths.js';

const MAX_RECENT = 50;
const recentErrors = [];

export function trackError(err, context = {}) {
  const entry = {
    message: err?.message || String(err),
    stack: err?.stack,
    ...context,
    timestamp: new Date().toISOString()
  };

  recentErrors.unshift(entry);
  if (recentErrors.length > MAX_RECENT) recentErrors.pop();

  try {
    const logDir = getRuntimePaths().logsDir;
    const logFile = path.join(logDir, 'errors.log');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    console.error('[ErrorTracker]', entry.message);
  }
}

export function getRecentErrors(limit = 20) {
  return recentErrors.slice(0, limit);
}

export function getErrorStats() {
  return {
    totalBuffered: recentErrors.length,
    lastErrorAt: recentErrors[0]?.timestamp || null
  };
}