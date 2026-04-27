// Chat UI state and streaming response rendering. Placeholder — populate from script.legacy.js during FE-001.
// FE-005 — chat errors surface inline in the chat-messages container so the
// user sees the problem next to the conversation, not as a detached toast.
import { apiFetch } from './api.js';

export async function sendMessage(prompt) {
  const errorTarget = document.getElementById('chat-messages') ?? undefined;
  const res = await apiFetch('/chat', { method: 'POST', body: { prompt }, errorTarget });
  return res.json();
}
