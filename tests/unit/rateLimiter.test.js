import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { rateLimiter, resetRateLimitBuckets } from '../../server/middleware/rateLimiter.js';

describe('rateLimiter', () => {
  beforeEach(() => resetRateLimitBuckets());

  it('allows requests under limit', async () => {
    const app = express();
    app.get('/t', rateLimiter({ max: 5, windowMs: 60_000 }), (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/t');
    expect(res.status).toBe(200);
  });

  it('blocks when exceeded', async () => {
    const app = express();
    app.get('/t', rateLimiter({ max: 2, windowMs: 60_000 }), (req, res) => res.json({ ok: true }));
    await request(app).get('/t');
    await request(app).get('/t');
    const res = await request(app).get('/t');
    expect(res.status).toBe(429);
  });
});