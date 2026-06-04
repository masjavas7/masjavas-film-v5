import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initRuntimePaths } from '../../server/utils/runtimePaths.js';
import { logToBackendFile, logToDesktopMainFile } from '../../server/utils/logger.js';

const testDir = path.join(os.tmpdir(), `masjavas-log-${Date.now()}`);

describe('logger', () => {
  beforeAll(() => {
    initRuntimePaths(testDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('writes backend and desktop log files', () => {
    logToBackendFile('backend test line');
    logToDesktopMainFile('desktop test line');
    const backendLog = path.join(testDir, 'logs', 'backend.log');
    const desktopLog = path.join(testDir, 'logs', 'desktop-main.log');
    expect(fs.readFileSync(backendLog, 'utf8')).toContain('backend test line');
    expect(fs.readFileSync(desktopLog, 'utf8')).toContain('desktop test line');
  });

  it('handles write failures without throwing', () => {
    vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {
      throw new Error('disk full');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => logToBackendFile('fail')).not.toThrow();
    expect(() => logToDesktopMainFile('fail')).not.toThrow();
    vi.restoreAllMocks();
  });
});