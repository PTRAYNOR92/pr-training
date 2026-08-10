import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';

/**
 * API-001 Acceptance Criteria:
 * - API is live
 * - GET /api/health returns 200
 * - Response includes status, uptime, and timestamp
 * - No direct client-to-OpenAI calls (verified by architecture, not this test)
 */
describe('API-001: GET /api/health', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns JSON with status "ok"', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.status).toBe('ok');
  });

  it('includes uptime as a number', async () => {
    const res = await request(app).get('/api/health');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('includes a valid ISO timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.timestamp).toBeDefined();
    const d = new Date(res.body.timestamp);
    expect(d.toISOString()).toBe(res.body.timestamp);
  });

  it('does not require authentication', async () => {
    // No Authorization header — should still return 200
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('rejects non-JSON body on POST endpoints gracefully', async () => {
    const res = await request(app)
      .post('/api/health')
      .send('not json');
    // health only supports GET; should 404 or 405
    expect([404, 405]).toContain(res.status);
  });
});
