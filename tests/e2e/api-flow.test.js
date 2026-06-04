import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

const app = createApp({ port: 3997 });

describe('E2E API flow', () => {
  it('health → settings → ai chat pipeline', async () => {
    const health = await request(app).get('/health');
    expect(health.body.status).toBe('ok');
    expect(health.body.database).toBe('connected');
    expect(health.body.version).toMatch(/\d+\.\d+\.\d+/);

    const settings = await request(app).get('/api/settings');
    expect(settings.status).toBe(200);

    const chat = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'cari test' });
    expect(chat.status).toBe(200);
    expect(chat.body.success).toBe(true);
  });
});