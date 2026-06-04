import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

const app = createApp({ port: 3998 });

describe('AI API', () => {
  it('GET /api/ai/recommendations', async () => {
    const res = await request(app).get('/api/ai/recommendations?limit=2');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  it('POST /api/ai/chat', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'rekomendasi proyek' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
  });

  it('GET /api/metrics', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body.uptimeSec).toBeGreaterThanOrEqual(0);
  });
});