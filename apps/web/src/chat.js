// Chat UI state and streaming response rendering. Placeholder — populate from script.legacy.js during FE-001.
// FE-005 — chat errors surface inline in the chat-messages container so the
// user sees the problem next to the conversation, not as a detached toast.
// DB-003 — loadHistory() pulls the user's last 20 messages from
// /api/conversations/recent on login and renders them in chronological order
// so returning users see where they left off.
import { apiFetch } from './api.js';

const CHAT_CONTAINER_ID = 'chat-messages';

export async function sendMessage(prompt) {
  const errorTarget = document.getElementById(CHAT_CONTAINER_ID) ?? undefined;
  const res = await apiFetch('/chat', { method: 'POST', body: { prompt }, errorTarget });
  return res.json();
}

export async function loadHistory() {
  const container = document.getElementById(CHAT_CONTAINER_ID);
  if (!container) return;

  const res = await apiFetch('/conversations/recent', { errorTarget: container });
  const { messages } = await res.json();

  // API returns newest-first; reverse for chronological rendering.
  const chronological = [...messages].reverse();

  container.replaceChildren();
  for (const m of chronological) {
    container.appendChild(renderMessage(m));
  }
}

function renderMessage({ role, message }) {
  const node = document.createElement('div');
  node.className = role === 'assistant' ? 'message interviewer' : 'message user';
  // textContent (not innerHTML) — XSS-safe, even if markup slips past the model.
  node.textContent = message;
  return node;
}
