// ElevenLabs provider — see _legacy-elevenlabs.js for the original Vercel function.
import { config } from '../config/env.js';

export async function synthesize({ text, voiceId }) {
  // TODO: implement against ElevenLabs TTS API using config.elevenLabs.*
  void text;
  void voiceId;
  void config;
  throw new Error('ElevenLabs provider not implemented yet');
}
