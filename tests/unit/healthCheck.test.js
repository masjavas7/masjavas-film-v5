import { describe, it, expect } from 'vitest';
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
});