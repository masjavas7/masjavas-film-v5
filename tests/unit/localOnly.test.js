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
});