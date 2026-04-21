import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * AUTH-002 Acceptance Criteria:
 * - api.js wrapper attaches Bearer token on every API request.
 * - Verified here by stubbing getBearerToken + global fetch and inspecting the
 *   Authorization header fetch was called with.
 *
 * 401-handling behaviour is covered separately by AUTH-003 tests.
 */
vi.mock('../../src/auth.js', () => ({
  getBearerToken: vi.fn(),
  logout: vi.fn(),
}));

import { apiFetch } from '../../src/api.js';
import { getBearerToken } from '../../src/auth.js';

describe('AUTH-002: apiFetch attaches the Firebase JWT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  it('attaches Authorization: Bearer <token> when a token is available', async () => {
    getBearerToken.mockResolvedValue('tok-abc-123');

    await apiFetch('/chat', { method: 'POST', body: { prompt: 'hello' } });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok-abc-123');
  });

  it('prefixes VITE_API_BASE_URL and preserves the path', async () => {
    getBearerToken.mockResolvedValue('tok');

    await apiFetch('/me/usage');

    const [url] = fetch.mock.calls[0];
    expect(url).toBe('http://api.test/me/usage');
  });

  it('sends Content-Type: application/json and JSON-stringifies the body', async () => {
    getBearerToken.mockResolvedValue('tok');

    await apiFetch('/chat', { method: 'POST', body: { prompt: 'hi' } });

    const [, init] = fetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ prompt: 'hi' }));
  });

  it('defaults to GET with no body when method/body are omitted', async () => {
    getBearerToken.mockResolvedValue('tok');

    await apiFetch('/health');

    const [, init] = fetch.mock.calls[0];
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('lets caller override/add headers without dropping Authorization', async () => {
    getBearerToken.mockResolvedValue('tok');

    await apiFetch('/voice', {
      method: 'POST',
      body: { text: 'hi' },
      headers: { 'X-Trace-Id': 'trace-42' },
    });

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['X-Trace-Id']).toBe('trace-42');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });
});
