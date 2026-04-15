// Chat UI state and streaming response rendering. Placeholder — populate from script.legacy.js during FE-001.
import { apiFetch } from './api.js';

export async function sendMessage(prompt) {
  const res = await apiFetch('/chat', { method: 'POST', body: { prompt } });
  return res.json();
}
