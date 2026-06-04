import { describe, it, expect } from 'vitest';
import { AppError, sanitizeError } from '../../server/utils/safeError.js';

describe('safeError', () => {
  it('returns AppError message and status', () => {
    const err = new AppError('Not found', 404);
    const out = sanitizeError(err);
    expect(out.statusCode).toBe(404);
    expect(out.message).toBe('Not found');
  });

  it('masks unknown errors', () => {
    const out = sanitizeError(new Error('secret db connection failed'));
    expect(out.statusCode).toBe(500);
    expect(out.message).not.toContain('secret');
  });
});