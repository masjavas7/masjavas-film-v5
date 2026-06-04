import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { localOnly } from '../../server/middleware/localOnly.js';

describe('localOnly', () => {
  it('allows loopback', async () => {
    const app = express();
    app.get('/d', localOnly, (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/d');
    expect(res.status).toBe(200);
  });

  it('blocks remote clients', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.get('/d', localOnly, (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/d').set('X-Forwarded-For', '203.0.113.10');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('localhost');
  });
});