// API-007 — voice playback via the secured /api/voice endpoint. Placeholder — populate from script.legacy.js during FE-001.
import { apiFetch } from './api.js';

export async function speak(text) {
  const res = await apiFetch('/voice', { method: 'POST', body: { text } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  return audio;
}
