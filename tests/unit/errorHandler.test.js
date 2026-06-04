import { describe, it, expect, vi, beforeEach } from 'vitest';
import errorHandler from '../../server/middleware/errorHandler.js';
import { AppError } from '../../server/utils/safeError.js';

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('maps AppError to JSON response', () => {
    const req = { method: 'POST', originalUrl: '/api/test' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    errorHandler(new AppError('Invalid payload', 400), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid payload' });
  });

  it('sanitizes unknown errors as 500', () => {
    const req = { method: 'GET', originalUrl: '/health' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    errorHandler(new Error('secret stack'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
  });
});