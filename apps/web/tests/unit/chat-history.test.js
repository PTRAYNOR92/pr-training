import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * DB-003 Acceptance Criteria (frontend):
 * - Chat history loaded from Firestore on login.
 * - Last 20 messages displayed.
 *
 * loadHistory() calls apiFetch('/conversations/recent') (which the API returns
 * newest-first), reverses to chronological order, and renders each message
 * into #chat-messages with role-tagged classes so the existing styling picks
 * them up. The function is idempotent — calling it again replaces, not stacks.
 */

vi.mock('../../src/api.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../src/api.js';
import { loadHistory } from '../../src/chat.js';

function makeContainer() {
  document.body.innerHTML = '<div id="chat-messages"></div>';
  return document.getElementById('chat-messages');
}

describe('DB-003: loadHistory renders recent messages chronologically', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fetches /conversations/recent and renders messages oldest-first', async () => {
    const container = makeContainer();
    apiFetch.mockResolvedValueOnce({
      json: async () => ({
        messages: [
          // API returns newest-first; loadHistory reverses for display.
          { id: 'm-3', role: 'assistant', message: 'newest', timestamp: '2026-04-27T10:00:02Z' },
          { id: 'm-2', role: 'user', message: 'middle', timestamp: '2026-04-27T10:00:01Z' },
          { id: 'm-1', role: 'assistant', message: 'oldest', timestamp: '2026-04-27T10:00:00Z' },
        ],
      }),
    });

    await loadHistory();

    const rendered = container.querySelectorAll('.message');
    expect(rendered).toHaveLength(3);
    expect(rendered[0].textContent).toContain('oldest');
    expect(rendered[1].textContent).toContain('middle');
    expect(rendered[2].textContent).toContain('newest');
  });

  it('tags assistant turns with .interviewer (matches existing chat styling)', async () => {
    const container = makeContainer();
    apiFetch.mockResolvedValueOnce({
      json: async () => ({
        messages: [
          { id: 'm-2', role: 'assistant', message: 'hello', timestamp: '2026-04-27T10:00:01Z' },
          { id: 'm-1', role: 'user', message: 'hi', timestamp: '2026-04-27T10:00:00Z' },
        ],
      }),
    });

    await loadHistory();

    const userMsg = container.querySelector('.message.user');
    const assistantMsg = container.querySelector('.message.interviewer');
    expect(userMsg).not.toBeNull();
    expect(userMsg.textContent).toContain('hi');
    expect(assistantMsg).not.toBeNull();
    expect(assistantMsg.textContent).toContain('hello');
  });

  it('escapes HTML in message content (no XSS via history)', async () => {
    const container = makeContainer();
    apiFetch.mockResolvedValueOnce({
      json: async () => ({
        messages: [
          { id: 'm-1', role: 'user', message: '<img src=x onerror=alert(1)>', timestamp: '2026-04-27T10:00:00Z' },
        ],
      }),
    });

    await loadHistory();

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img');
  });

  it('replaces prior content rather than stacking on subsequent calls', async () => {
    const container = makeContainer();
    apiFetch.mockResolvedValue({
      json: async () => ({
        messages: [
          { id: 'm-1', role: 'user', message: 'one', timestamp: '2026-04-27T10:00:00Z' },
        ],
      }),
    });

    await loadHistory();
    await loadHistory();

    expect(container.querySelectorAll('.message')).toHaveLength(1);
  });

  it('no-ops gracefully when #chat-messages is not in the DOM', async () => {
    document.body.innerHTML = ''; // no container
    apiFetch.mockResolvedValueOnce({
      json: async () => ({ messages: [] }),
    });

    // Must not throw — pages without the chat panel (e.g. login) just skip.
    await expect(loadHistory()).resolves.toBeUndefined();
  });

  it('renders nothing extra when the API returns an empty list', async () => {
    const container = makeContainer();
    apiFetch.mockResolvedValueOnce({ json: async () => ({ messages: [] }) });

    await loadHistory();

    expect(container.querySelectorAll('.message')).toHaveLength(0);
  });
});
