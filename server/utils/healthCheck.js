import fs from 'fs';
import { getRuntimePaths } from './runtimePaths.js';
import { getAppVersion } from './version.js';

/**
 * Verifies JSON project storage (file-based "database") is reachable.
 */
export function checkDatabaseConnection() {
  try {
    const { projectsDir } = getRuntimePaths();
    fs.accessSync(projectsDir, fs.constants.R_OK | fs.constants.W_OK);
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

export function buildHealthPayload(extra = {}) {
  const database = checkDatabaseConnection();
  const status = database === 'connected' ? 'ok' : 'degraded';

  return {
    status,
    database,
    version: getAppVersion(),
    service: 'masjavas-film-v5',
    timestamp: new Date().toISOString(),
    ...extra
  };
}