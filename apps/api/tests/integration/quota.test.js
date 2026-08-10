import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Router } from 'express';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';

/**
 * AI-005 Acceptance Criteria:
 * - Per-user daily token limit enforced.
 * - Configurable via DAILY_TOKEN_LIMIT_PER_USER (env) — stored per user in
 *   Firestore `usage_daily/{uid}_{YYYY-MM-DD}`.
 * - API returns 429 on breach.
 *
 * quotaChecker imports getDailyUsage from services/quotaService.js, which
 * talks to Firestore. We mock the service so tests run without Firestore.
 */
vi.mock('../../src/services/quotaService.js', () => ({
  getDailyUsage: vi.fn(),
  incrementDailyUsage: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { createJwtValidatorMiddleware } = await import('../../src/middleware/jwtValidator.js');
const { quotaChecker } = await import('../../src/middleware/quotaChecker.js');
const { config } = await import('../../src/config/env.js');
const { getDailyUsage } = await import('../../src/services/quotaService.js');

describe('AI-005: daily token quota enforcement', () => {
  const PROJECT_ID = 'test-project';
  let app;
  let validKey;
  const LIMIT = config.quotas.dailyTokensPerUser;

  beforeAll(async () => {
    validKey = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(validKey.publicKey);
    publicJwk.kid = 'test-key-id';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    const jwks = createLocalJWKSet({ keys: [publicJwk] });

    const jwtValidator = createJwtValidatorMiddleware({ jwks, projectId: PROJECT_ID });

    // Minimal stub route that echoes req.quota so we can verify it was set.
    const stubRouter = Router();
    stubRouter.get('/', (req, res) => res.json({ ok: true, quota: req.quota }));

    app = createApp({
      jwtValidator,
      quotaChecker,
      protectedRoutes: [{ path: '/api/chat', router: stubRouter }],
    });
  });

  async function validToken(uid = 'user123') {
    return new SignJWT({ email: `${uid}@test.com` })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
      .setSubject(uid)
      .setAudience(PROJECT_ID)
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(validKey.privateKey);
  }

  it('passes through and sets req.quota when usage is below the limit', async () => {
    getDailyUsage.mockResolvedValueOnce(LIMIT - 1);
    const token = await validToken();

    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.quota).toEqual({ used: LIMIT - 1, limit: LIMIT });
  });

  it('passes through at usage = 0 (fresh day)', async () => {
    getDailyUsage.mockResolvedValueOnce(0);
    const token = await validToken();

    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('returns 429 when usage equals the limit (breach threshold is inclusive)', async () => {
    getDailyUsage.mockResolvedValueOnce(LIMIT);
    const token = await validToken();

    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/quota/i);
    expect(res.body.used).toBe(LIMIT);
    expect(res.body.limit).toBe(LIMIT);
  });

  it('returns 429 when usage exceeds the limit', async () => {
    getDailyUsage.mockResolvedValueOnce(LIMIT + 50_000);
    const token = await validToken();

    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(429);
    expect(res.body.used).toBe(LIMIT + 50_000);
  });

  it('queries the quota service with the authenticated uid from the JWT', async () => {
    getDailyUsage.mockResolvedValueOnce(0);
    const token = await validToken('user-abc');

    await request(app).get('/api/chat').set('Authorization', `Bearer ${token}`);

    expect(getDailyUsage).toHaveBeenLastCalledWith('user-abc');
  });

  it('surfaces a failing quota lookup as 5xx, not as silent pass-through', async () => {
    getDailyUsage.mockRejectedValueOnce(new Error('firestore unavailable'));
    const token = await validToken();

    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
