import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

const app = createApp({ port: 3999 });

describe('GET /health', () => {
  it('returns ok status with database and version', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.version).toBeTruthy();
    expect(res.body.service).toBe('masjavas-film-v5');
  });

  it('api/health matches contract', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('database', 'connected');
    expect(res.body).toHaveProperty('version');
  });
});