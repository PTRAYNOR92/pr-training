import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showToast,
  showInlineError,
  clearInlineError,
  reportError,
  friendlyMessage,
} from '../../src/errors.js';

/**
 * FE-005 Acceptance Criteria:
 * - Network errors show user-friendly toast/message.
 * - console.error logged for debugging.
 *
 * The errors module supports two surfaces:
 *  - showToast: global, body-attached banner (default for unscoped failures).
 *  - showInlineError: in-context, attached to a target element passed by the
 *    caller (e.g. the chat panel or voice status line) so the message lands
 *    where the user took the action.
 * reportError() is the central entry point — it always console.errors the
 * raw error and routes the friendly message to the appropriate surface.
 */

describe('FE-005: errors module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('showToast', () => {
    it('appends a toast element to the document body with the message', () => {
      showToast('Something went wrong');
      const toast = document.querySelector('[data-toast]');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Something went wrong');
    });

    it('auto-dismisses after the default duration', () => {
      showToast('temporary');
      expect(document.querySelector('[data-toast]')).not.toBeNull();
      vi.advanceTimersByTime(5000);
      expect(document.querySelector('[data-toast]')).toBeNull();
    });

    it('respects a custom duration', () => {
      showToast('quick', { duration: 1000 });
      vi.advanceTimersByTime(999);
      expect(document.querySelector('[data-toast]')).not.toBeNull();
      vi.advanceTimersByTime(1);
      expect(document.querySelector('[data-toast]')).toBeNull();
    });

    it('escapes HTML in the message (no XSS via toast)', () => {
      showToast('<img src=x onerror=alert(1)>');
      const toast = document.querySelector('[data-toast]');
      expect(toast.querySelector('img')).toBeNull();
      expect(toast.textContent).toContain('<img');
    });
  });

  describe('showInlineError / clearInlineError', () => {
    it('renders the message inside the target element with an error role', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      showInlineError(target, 'Network unreachable');

      const inline = target.querySelector('[data-inline-error]');
      expect(inline).not.toBeNull();
      expect(inline.getAttribute('role')).toBe('alert');
      expect(inline.textContent).toContain('Network unreachable');
    });

    it('replaces a prior inline error rather than stacking', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      showInlineError(target, 'first');
      showInlineError(target, 'second');

      const inlines = target.querySelectorAll('[data-inline-error]');
      expect(inlines).toHaveLength(1);
      expect(inlines[0].textContent).toContain('second');
    });

    it('clearInlineError removes the inline error from the target', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      showInlineError(target, 'oops');
      clearInlineError(target);

      expect(target.querySelector('[data-inline-error]')).toBeNull();
    });
  });

  describe('friendlyMessage', () => {
    it('translates a TypeError (fetch network failure) into a network message', () => {
      const err = new TypeError('Failed to fetch');
      expect(friendlyMessage(err)).toMatch(/connection|network|offline/i);
    });

    it('translates "Session expired" into a session/sign-in prompt', () => {
      const err = new Error('Session expired');
      const msg = friendlyMessage(err);
      expect(msg).toMatch(/session/i);
      expect(msg).toMatch(/sign\s*in/i);
    });

    it('translates 5xx into a server-side message', () => {
      const err = new Error('API 503: gateway');
      expect(friendlyMessage(err)).toMatch(/server|try again/i);
    });

    it('translates 4xx (non-auth) into a request-error message', () => {
      const err = new Error('API 422: bad input');
      expect(friendlyMessage(err)).toMatch(/request|invalid|could not/i);
    });

    it('falls back to a generic message for unrecognised errors', () => {
      const err = new Error('something obscure');
      const msg = friendlyMessage(err);
      expect(msg).toBeTruthy();
      expect(msg).not.toContain('something obscure');
    });
  });

  describe('reportError', () => {
    it('always console.errors the raw error for debugging', () => {
      const err = new Error('boom');
      reportError(err);
      expect(console.error).toHaveBeenCalledWith(expect.anything(), err);
    });

    it('shows a toast when no target is provided', () => {
      reportError(new TypeError('Failed to fetch'));
      expect(document.querySelector('[data-toast]')).not.toBeNull();
    });

    it('shows an inline error when a target is provided', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      reportError(new Error('API 500: boom'), { target });

      expect(target.querySelector('[data-inline-error]')).not.toBeNull();
      expect(document.querySelector('[data-toast]')).toBeNull();
    });

    it('returns the friendly message it surfaced', () => {
      const msg = reportError(new TypeError('Failed to fetch'));
      expect(msg).toMatch(/connection|network|offline/i);
    });
  });
});
