import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * AUTH-003 Acceptance Criteria:
 * - Expired or missing token triggers redirect to /login.
 * - No unauthenticated API calls proceed.
 *
 * Tested here by stubbing getBearerToken + fetch + logout:
 *  1. When getBearerToken resolves to null, apiFetch MUST NOT call fetch,
 *     MUST call logout (which redirects), and MUST throw.
 *  2. When the server replies 401 (expired token), apiFetch MUST call
 *     logout and throw — fetch is allowed (we did not know the token was
 *     expired until the server told us).
 *  3. Non-auth errors (e.g. 403, 500) MUST NOT trigger logout.
 */
vi.mock('../../src/auth.js', () => ({
  getBearerToken: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

import { apiFetch } from '../../src/api.js';
import { getBearerToken, logout } from '../../src/auth.js';

function mockFetchResponse(status, body = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('AUTH-003: redirect to /login on missing or expired token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fire the request when no token is available, and redirects', async () => {
    getBearerToken.mockResolvedValue(null);
    vi.stubGlobal('fetch', vi.fn());

    await expect(apiFetch('/chat', { method: 'POST', body: { prompt: 'hi' } }))
      .rejects.toThrow();

    expect(fetch).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('calls logout and throws on 401 (expired / invalid token)', async () => {
    getBearerToken.mockResolvedValue('tok-expired');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(401, { error: 'expired' })));

    await expect(apiFetch('/chat', { method: 'POST', body: { prompt: 'hi' } }))
      .rejects.toThrow(/session expired/i);

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does NOT call logout on 403 (authenticated but unauthorized)', async () => {
    getBearerToken.mockResolvedValue('tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(403, { error: 'forbidden' })));

    await expect(apiFetch('/admin')).rejects.toThrow(/403/);
    expect(logout).not.toHaveBeenCalled();
  });

  it('does NOT call logout on 500 (server error)', async () => {
    getBearerToken.mockResolvedValue('tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(500, { error: 'boom' })));

    await expect(apiFetch('/chat')).rejects.toThrow(/500/);
    expect(logout).not.toHaveBeenCalled();
  });

  it('does NOT call logout on 2xx', async () => {
    getBearerToken.mockResolvedValue('tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(200, { ok: true })));

    const res = await apiFetch('/health');
    expect(res.status).toBe(200);
    expect(logout).not.toHaveBeenCalled();
  });
});
