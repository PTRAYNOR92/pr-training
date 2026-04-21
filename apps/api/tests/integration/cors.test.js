import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * API-006 Acceptance Criteria:
 * - CORS allowlist restricted to the production frontend domain.
 * - Cross-origin requests from allowed origin succeed with the proper
 *   Access-Control-Allow-Origin header.
 * - Requests from disallowed origins are rejected (no ACAO header).
 * - Server-to-server calls (no Origin header) pass through.
 * - Only GET and POST are advertised on preflight; only Content-Type and
 *   Authorization headers are allowed.
 *
 * Env is set BEFORE env.js is imported so config.cors.allowedOrigins picks
 * up the test allowlist.
 */
const ALLOWED = 'https://training-pro.example.com';
const ALSO_ALLOWED = 'http://localhost:5173';
const DISALLOWED = 'https://evil.example.com';

process.env.CORS_ALLOWED_ORIGINS = `${ALLOWED},${ALSO_ALLOWED}`;

const { createApp } = await import('../../src/app.js');

describe('API-006: CORS allowlist', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('allows a request from an allow-listed origin and echoes it in ACAO', async () => {
    const res = await request(app).get('/api/health').set('Origin', ALLOWED);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('allows the localhost dev origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', ALSO_ALLOWED);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALSO_ALLOWED);
  });

  it('rejects a request from a disallowed origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', DISALLOWED);
    // cors invokes next(err) → errorHandler → 500. The critical assertion is
    // that no ACAO header is emitted, which is what actually protects the
    // browser from reading the response.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('allows requests with no Origin header (server-to-server)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('preflight advertises only GET and POST', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(res.status).toBe(204);
    const methods = (res.headers['access-control-allow-methods'] || '').split(',').map((s) => s.trim());
    expect(methods).toEqual(expect.arrayContaining(['GET', 'POST']));
    expect(methods).not.toContain('DELETE');
    expect(methods).not.toContain('PUT');
    expect(methods).not.toContain('PATCH');
  });

  it('preflight advertises only Content-Type and Authorization headers', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    const headers = (res.headers['access-control-allow-headers'] || '')
      .split(',')
      .map((s) => s.trim().toLowerCase());
    expect(headers).toEqual(expect.arrayContaining(['content-type', 'authorization']));
    expect(headers).not.toContain('x-admin-key');
  });

  it('preflight from a disallowed origin does not emit ACAO', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', DISALLOWED)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not include credentials flag (public API, no cookies)', async () => {
    const res = await request(app).get('/api/health').set('Origin', ALLOWED);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
