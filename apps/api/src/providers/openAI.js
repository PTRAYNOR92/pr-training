// OpenAI provider — kept as a migration fallback. See _legacy-openai.js for the original Vercel function.
import { config } from '../config/env.js';

export async function complete({ prompt }) {
  // TODO: implement against https://api.openai.com/v1/chat/completions
  void prompt;
  void config;
  throw new Error('OpenAI provider not implemented yet');
}
