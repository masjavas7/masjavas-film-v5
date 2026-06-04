import { describe, it, expect, vi } from 'vitest';
import securityHeaders from '../../server/middleware/securityHeaders.js';

describe('securityHeaders', () => {
  it('sets baseline headers and calls next', () => {
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k] = v; } };
    const next = vi.fn();
    securityHeaders({}, res, next);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(next).toHaveBeenCalled();
  });

  it('adds HSTS in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k] = v; } };
    securityHeaders({}, res, vi.fn());
    expect(headers['Strict-Transport-Security']).toContain('max-age');
    process.env.NODE_ENV = prev;
  });
});