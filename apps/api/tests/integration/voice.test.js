import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';
import { createApp } from '../../src/app.js';
import { createJwtValidatorMiddleware } from '../../src/middleware/jwtValidator.js';
import { createVoiceRouter } from '../../src/routes/voice.js';

/**
 * API-007 Acceptance Criteria:
 * - POST /api/voice returns synthesized audio bytes (audio/mpeg).
 * - 400 when text body is missing / non-string.
 * - 401 when JWT is missing (enforced by the protected pipeline).
 * - The voice provider receives { text, voiceId, userId } from the request.
 *
 * Uses the REAL jwt middleware (local JWKS) + a stub voice provider so
 * the route code path is exercised end-to-end without calling ElevenLabs.
 */
describe('API-007: POST /api/voice', () => {
  const PROJECT_ID = 'test-project';
  let app;
  let validKey;
  let stubSynthesize;

  beforeAll(async () => {
    validKey = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(validKey.publicKey);
    publicJwk.kid = 'test-key-id';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    const jwks = createLocalJWKSet({ keys: [publicJwk] });

    const jwtValidator = createJwtValidatorMiddleware({ jwks, projectId: PROJECT_ID });

    stubSynthesize = vi.fn(async ({ text }) => Buffer.from(`audio:${text}`, 'utf8'));
    const voiceProvider = { name: 'stub-voice', synthesize: stubSynthesize };

    app = createApp({
      jwtValidator,
      protectedRoutes: [{ path: '/api/voice', router: createVoiceRouter({ voiceProvider }) }],
    });
  });

  async function validToken() {
    return new SignJWT({ email: 'test@test.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
      .setSubject('user123')
      .setAudience(PROJECT_ID)
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(validKey.privateKey);
  }

  it('returns 401 when no JWT is provided', async () => {
    const res = await request(app).post('/api/voice').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with audio/mpeg bytes when text is valid', async () => {
    const token = await validToken();
    const res = await request(app)
      .post('/api/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'hello world', voiceId: 'voice-42' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/audio\/mpeg/);
    expect(res.body.toString('utf8')).toBe('audio:hello world');
  });

  it('passes text, voiceId, and userId through to the provider', async () => {
    stubSynthesize.mockClear();
    const token = await validToken();
    await request(app)
      .post('/api/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'pass-through', voiceId: 'voice-99' });

    expect(stubSynthesize).toHaveBeenCalledWith({
      text: 'pass-through',
      voiceId: 'voice-99',
      userId: 'user123',
    });
  });

  it('returns 400 when text is missing', async () => {
    const token = await validToken();
    const res = await request(app)
      .post('/api/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ voiceId: 'voice-42' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text/i);
  });

  it('returns 400 when text is not a string', async () => {
    const token = await validToken();
    const res = await request(app)
      .post('/api/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 42 });

    expect(res.status).toBe(400);
  });

  it('surfaces provider errors as 5xx, not as 200 with empty body', async () => {
    stubSynthesize.mockRejectedValueOnce(new Error('upstream ElevenLabs 502'));
    const token = await validToken();
    const res = await request(app)
      .post('/api/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'boom' });

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
