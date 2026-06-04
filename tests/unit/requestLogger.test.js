import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initRuntimePaths } from '../../server/utils/runtimePaths.js';
import requestLogger from '../../server/middleware/requestLogger.js';

const testDir = path.join(os.tmpdir(), `masjavas-reqlog-${Date.now()}`);

describe('requestLogger', () => {
  beforeAll(() => {
    initRuntimePaths(testDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('logs request finish, slow paths, and access file', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const prev = process.env.LOG_ACCESS;
    process.env.LOG_ACCESS = 'true';
    const next = vi.fn();
    const req = { method: 'GET', originalUrl: '/api/health', ip: '127.0.0.1' };
    const handlers = {};
    const res = {
      statusCode: 500,
      on: (event, fn) => { handlers[event] = fn; }
    };
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
    handlers.finish?.();
    const accessLog = path.join(testDir, 'logs', 'access.log');
    expect(fs.existsSync(accessLog)).toBe(true);
    process.env.LOG_ACCESS = prev;
  });
});