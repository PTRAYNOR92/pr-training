// AI-002 — provider abstraction. Swapping AZURE_OPENAI/OPENAI is a single env var.
import { config } from '../config/env.js';
import * as azureOpenAI from './azureOpenAI.js';
import * as openAI from './openAI.js';

export function getAIProvider() {
  switch (config.aiProvider) {
    case 'azure-openai':
      return { name: 'azure-openai', complete: azureOpenAI.complete };
    case 'openai':
      return { name: 'openai', complete: openAI.complete };
    default:
      throw new Error(`Unknown AI_PROVIDER: ${config.aiProvider}`);
  }
}
