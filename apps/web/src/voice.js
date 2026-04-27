// API-007 — voice playback via the secured /api/voice endpoint. Placeholder — populate from script.legacy.js during FE-001.
// FE-005 — voice errors surface inline on the voice-status line so the user
// sees the failure next to the mic button rather than as a detached toast.
import { apiFetch } from './api.js';

export async function speak(text) {
  const errorTarget = document.getElementById('voice-status') ?? undefined;
  const res = await apiFetch('/voice', { method: 'POST', body: { text }, errorTarget });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  return audio;
}
