import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { createJwtValidatorMiddleware } from '../../src/middleware/jwtValidator.js';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';

/**
 * API-002 Acceptance Criteria:
 * - Requests with valid JWT return 200 (pass through to handler)
 * - Requests with no/invalid JWT return 401
 *
 * Maps to Test Plan: SEC-001..SEC-005
 *
 * Uses the REAL createJwtValidatorMiddleware with a local JWKS
 * (no network calls, but exercises the actual production code path).
 */
describe('API-002: JWT validation middleware', () => {
  let app;
  let validKey;
  let wrongKey;
  const PROJECT_ID = 'test-project';

  beforeAll(async () => {
    validKey = await generateKeyPair('RS256');
    wrongKey = await generateKeyPair('RS256');

    // Build local JWKS from our test key
    const publicJwk = await exportJWK(validKey.publicKey);
    publicJwk.kid = 'test-key-id';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    const jwks = createLocalJWKSet({ keys: [publicJwk] });

    // Wire the REAL middleware factory with our test JWKS
    const jwtValidator = createJwtValidatorMiddleware({ jwks, projectId: PROJECT_ID });

    app = createApp({ jwtValidator });
  });

  // --- SEC-001: No Authorization header → 401 ---
  it('SEC-001: rejects request with no Authorization header', async () => {
    const res = await request(app).post('/api/chat').send({ prompt: 'hello' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // --- SEC-002: Expired JWT → 401 ---
  it('SEC-002: rejects expired JWT', async () => {
    const token = await makeJWT(validKey.privateKey, {
      sub: 'user123',
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'hello' });

    expect(res.status).toBe(401);
  });

  // --- SEC-003: JWT signed by wrong key → 401 ---
  it('SEC-003: rejects JWT signed with wrong key', async () => {
    const token = await makeJWT(wrongKey.privateKey, {
      sub: 'user123',
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'hello' });

    expect(res.status).toBe(401);
  });

  // --- SEC-004: JWT from wrong Firebase project (wrong audience) → 401 ---
  it('SEC-004: rejects JWT with wrong audience', async () => {
    const token = await makeJWT(validKey.privateKey, {
      sub: 'user123',
      aud: 'wrong-project-id',
      iss: `https://securetoken.google.com/wrong-project-id`,
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'hello' });

    expect(res.status).toBe(401);
  });

  // --- SEC-005: Structurally invalid JWT (random string) → 401, no stack trace ---
  it('SEC-005: rejects random string as JWT, no stack trace in response', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer totallynotavalidtoken123')
      .send({ prompt: 'hello' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    // Must not leak stack traces
    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/at\s+\w+\s+\(/);
  });

  // --- Positive case: valid JWT → passes through middleware ---
  it('allows request with valid JWT to reach the route handler', async () => {
    const token = await makeJWT(validKey.privateKey, {
      sub: 'user123',
      email: 'test@example.com',
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'hello' });

    // Should NOT be 401 — it passed auth.
    // May be 404 (route not mounted yet) or other — but not 401.
    expect(res.status).not.toBe(401);
  });

  // --- Missing Bearer scheme ---
  it('rejects Authorization header without Bearer scheme', async () => {
    const token = await makeJWT(validKey.privateKey, {
      sub: 'user123',
      aud: PROJECT_ID,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Basic ${token}`)
      .send({ prompt: 'hello' });

    expect(res.status).toBe(401);
  });
});

// --- Helpers ---

async function makeJWT(privateKey, claims) {
  const now = Math.floor(Date.now() / 1000);
  const builder = new SignJWT({ email: claims.email || 'test@test.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setSubject(claims.sub || 'user123')
    .setAudience(claims.aud)
    .setIssuer(claims.iss)
    .setIssuedAt(now);

  if (claims.exp) {
    builder.setExpirationTime(claims.exp);
  } else {
    builder.setExpirationTime('1h');
  }

  return builder.sign(privateKey);
}
