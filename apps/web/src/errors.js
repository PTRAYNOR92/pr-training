// FE-005 — friendly error surfacing for the frontend.
// Two surfaces: showToast (global, body-attached) and showInlineError
// (in-context, attached to a target element provided by the caller).
// reportError() is the central entry point — it always console.errors
// the raw error, then routes the friendly message to the right surface.

const TOAST_DEFAULT_DURATION_MS = 5000;
const TOAST_ATTR = 'data-toast';
const INLINE_ATTR = 'data-inline-error';

export function showToast(message, { duration = TOAST_DEFAULT_DURATION_MS } = {}) {
  const toast = document.createElement('div');
  toast.setAttribute(TOAST_ATTR, '');
  toast.setAttribute('role', 'status');
  toast.className = 'app-toast app-toast--error';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
  return toast;
}

export function showInlineError(target, message) {
  clearInlineError(target);
  const node = document.createElement('div');
  node.setAttribute(INLINE_ATTR, '');
  node.setAttribute('role', 'alert');
  node.className = 'app-inline-error';
  node.textContent = message;
  target.appendChild(node);
  return node;
}

export function clearInlineError(target) {
  const existing = target.querySelector(`[${INLINE_ATTR}]`);
  if (existing) existing.remove();
}

export function friendlyMessage(err) {
  if (err instanceof TypeError) {
    return 'Could not reach the server — check your connection and try again.';
  }

  const msg = err?.message ?? '';

  if (/session expired/i.test(msg)) {
    return 'Your session has expired. Please sign in again.';
  }

  const statusMatch = msg.match(/^API\s+(\d{3})/);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status >= 500) return 'The server ran into a problem. Please try again in a moment.';
    if (status === 429) return 'You have hit the rate limit. Please wait a moment and try again.';
    if (status >= 400) return 'We could not process that request. Please check your input and try again.';
  }

  return 'Something went wrong. Please try again.';
}

export function reportError(err, { target } = {}) {
  // Always log the raw error so debugging is unaffected by the friendly surface.
  console.error('[app-error]', err);
  const message = friendlyMessage(err);
  if (target) {
    showInlineError(target, message);
  } else {
    showToast(message);
  }
  return message;
}
