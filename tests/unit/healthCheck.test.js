import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import { buildHealthPayload, checkDatabaseConnection } from '../../server/utils/healthCheck.js';

describe('healthCheck', () => {
  it('reports database connected when projects dir exists', () => {
    expect(checkDatabaseConnection()).toBe('connected');
  });

  it('builds standard health payload', () => {
    const payload = buildHealthPayload({ mode: 'test' });
    expect(payload.status).toBe('ok');
    expect(payload.database).toBe('connected');
    expect(payload.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(payload.mode).toBe('test');
    expect(payload.timestamp).toBeTruthy();
  });

  it('reports degraded when storage is unavailable', () => {
    vi.spyOn(fs, 'accessSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(checkDatabaseConnection()).toBe('disconnected');
    const payload = buildHealthPayload();
    expect(payload.status).toBe('degraded');
    vi.restoreAllMocks();
  });
});