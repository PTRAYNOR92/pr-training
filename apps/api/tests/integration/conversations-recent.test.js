import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';

/**
 * DB-003 Acceptance Criteria (route side):
 * - GET /api/conversations/recent — auth required, scoped to the JWT uid.
 * - Default limit 20, ?limit=N respected up to a server cap of 50.
 * - The route delegates to listRecentMessages and returns { messages: [...] }.
 */

const { createApp } = await import('../../src/app.js');
const { createJwtValidatorMiddleware } = await import('../../src/middleware/jwtValidator.js');
const { createConversationsRouter } = await import('../../src/routes/conversations.js');

describe('DB-003: GET /api/conversations/recent', () => {
  const PROJECT_ID = 'test-project';
  let app;
  let validKey;
  let listRecentMessages;

  beforeAll(async () => {
    validKey = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(validKey.publicKey);
    publicJwk.kid = 'test-key-id';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    const jwks = createLocalJWKSet({ keys: [publicJwk] });

    const jwtValidator = createJwtValidatorMiddleware({ jwks, projectId: PROJECT_ID });
    listRecentMessages = vi.fn();

    const conversationsRouter = createConversationsRouter({ listRecentMessages });

    app = createApp({
      jwtValidator,
      protectedRoutes: [{ path: '/api/conversations', router: conversationsRouter }],
    });
  });

  beforeEach(() => {
    listRecentMessages.mockReset();
  });

  async function tokenFor(uid = 'alice') {
    return new SignJWT({ email: `${uid}@test.com` })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
      .setSubject(uid)
      .setAudience(PROJECT_ID)
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(validKey.privateKey);
  }

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/conversations/recent');
    expect(res.status).toBe(401);
  });

  it('returns the messages list for the authenticated uid (default limit 20)', async () => {
    listRecentMessages.mockResolvedValueOnce([{ id: 'm-1', message: 'hi', role: 'user' }]);

    const token = await tokenFor('alice');
    const res = await request(app)
      .get('/api/conversations/recent')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ messages: [{ id: 'm-1', message: 'hi', role: 'user' }] });
    expect(listRecentMessages).toHaveBeenCalledWith('alice', 20);
  });

  it('passes ?limit through to the service', async () => {
    listRecentMessages.mockResolvedValueOnce([]);

    const token = await tokenFor('alice');
    await request(app)
      .get('/api/conversations/recent?limit=35')
      .set('Authorization', `Bearer ${token}`);

    expect(listRecentMessages).toHaveBeenCalledWith('alice', 35);
  });

  it('rejects non-numeric ?limit with 400 (no silent fallback)', async () => {
    const token = await tokenFor('alice');
    const res = await request(app)
      .get('/api/conversations/recent?limit=banana')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(listRecentMessages).not.toHaveBeenCalled();
  });

  it('always scopes to the JWT uid, ignoring any client-supplied uid', async () => {
    listRecentMessages.mockResolvedValueOnce([]);

    const token = await tokenFor('alice');
    await request(app)
      .get('/api/conversations/recent?userId=bob')
      .set('Authorization', `Bearer ${token}`);

    // Service was called with the JWT subject, not the query param.
    expect(listRecentMessages).toHaveBeenCalledWith('alice', 20);
  });

  it('surfaces a service failure as 5xx rather than leaking details', async () => {
    listRecentMessages.mockRejectedValueOnce(new Error('firestore down'));

    const token = await tokenFor('alice');
    const res = await request(app)
      .get('/api/conversations/recent')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(JSON.stringify(res.body)).not.toMatch(/firestore down/);
  });
});
