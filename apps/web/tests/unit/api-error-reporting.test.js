import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * FE-005 Acceptance Criteria (apiFetch integration):
 * - apiFetch surfaces failures via the errors module:
 *     - by default, as a toast,
 *     - when the caller passes { target }, as an inline error in that element.
 * - The raw error is always console.errored.
 * - 401 still triggers logout (AUTH-003 contract preserved).
 */

vi.mock('../../src/auth.js', () => ({
  getBearerToken: vi.fn(),
  logout: vi.fn(),
}));

import { apiFetch } from '../../src/api.js';
import { getBearerToken, logout } from '../../src/auth.js';

function jsonResponse(status, body = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('FE-005: apiFetch surfaces errors via errors module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getBearerToken.mockResolvedValue('tok');
    logout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a toast when fetch rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiFetch('/chat', { method: 'POST', body: { prompt: 'hi' } }))
      .rejects.toThrow();

    const toast = document.querySelector('[data-toast]');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toMatch(/connection|network|offline/i);
    expect(console.error).toHaveBeenCalled();
  });

  it('shows an inline error in the target when caller scopes the error', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { error: 'boom' })));

    await expect(
      apiFetch('/chat', { method: 'POST', body: { prompt: 'hi' }, errorTarget: target }),
    ).rejects.toThrow(/500/);

    expect(target.querySelector('[data-inline-error]')).not.toBeNull();
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('does not surface a toast on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })));

    const res = await apiFetch('/health');
    expect(res.status).toBe(200);
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('still throws so callers can react in addition to the surfaced UI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, { error: 'down' })));

    await expect(apiFetch('/chat')).rejects.toThrow(/503/);
  });
});
