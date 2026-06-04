import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initRuntimePaths } from '../../server/utils/runtimePaths.js';
import { trackError, getRecentErrors, getErrorStats } from '../../server/utils/errorTracker.js';

const testDir = path.join(os.tmpdir(), `masjavas-err-${Date.now()}`);

describe('errorTracker', () => {
  beforeAll(() => {
    initRuntimePaths(testDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('buffers and persists errors', () => {
    trackError(new Error('unit test failure'), { route: '/test' });
    const recent = getRecentErrors(5);
    expect(recent[0].message).toContain('unit test failure');
    const stats = getErrorStats();
    expect(stats.totalBuffered).toBeGreaterThan(0);
    expect(stats.lastErrorAt).toBeTruthy();
    const logFile = path.join(testDir, 'logs', 'errors.log');
    expect(fs.existsSync(logFile)).toBe(true);
  });
});