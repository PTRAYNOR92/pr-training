import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * AI-002 Acceptance Criteria:
 * - Config-driven provider selection.
 * - Swapping the AI_PROVIDER env var changes provider at runtime.
 *
 * Rather than stubbing config, we re-import the module after mutating
 * process.env so the env.js loader re-runs and config.aiProvider reflects
 * the new value. vi.resetModules() clears the module cache between tests.
 */
describe('AI-002: AI provider abstraction', () => {
  const ORIGINAL_PROVIDER = process.env.AI_PROVIDER;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_PROVIDER === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = ORIGINAL_PROVIDER;
  });

  it('returns the azure-openai provider when AI_PROVIDER=azure-openai', async () => {
    process.env.AI_PROVIDER = 'azure-openai';
    const { getAIProvider } = await import('../../src/providers/index.js');

    const provider = getAIProvider();
    expect(provider.name).toBe('azure-openai');
    expect(typeof provider.complete).toBe('function');
  });

  it('returns the openai provider when AI_PROVIDER=openai', async () => {
    process.env.AI_PROVIDER = 'openai';
    const { getAIProvider } = await import('../../src/providers/index.js');

    const provider = getAIProvider();
    expect(provider.name).toBe('openai');
    expect(typeof provider.complete).toBe('function');
  });

  it('defaults to azure-openai when AI_PROVIDER is unset', async () => {
    delete process.env.AI_PROVIDER;
    const { getAIProvider } = await import('../../src/providers/index.js');

    const provider = getAIProvider();
    expect(provider.name).toBe('azure-openai');
  });

  it('throws on an unknown provider rather than silently defaulting', async () => {
    process.env.AI_PROVIDER = 'some-future-provider';
    const { getAIProvider } = await import('../../src/providers/index.js');

    expect(() => getAIProvider()).toThrow(/unknown ai_provider/i);
  });

  it('binds the provider-specific complete() function, not a generic stub', async () => {
    process.env.AI_PROVIDER = 'azure-openai';
    const { getAIProvider } = await import('../../src/providers/index.js');
    const azure = await import('../../src/providers/azureOpenAI.js');

    expect(getAIProvider().complete).toBe(azure.complete);
  });
});
