import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

/**
 * AI-001 Acceptance Criteria:
 * - Azure OpenAI resource provisioned.
 * - Model deployed (gpt-4o-mini).
 *
 * Provisioning happens via `az deployment group create` in CI. This test
 * guards the Bicep so main.bicep and openai.bicep keep declaring the
 * Cognitive Services account and the gpt-4o-mini deployment.
 */
describe('AI-001: Bicep provisions Azure OpenAI + gpt-4o-mini deployment', () => {
  const mainBicep = resolve(REPO_ROOT, 'infra/azure/bicep/main.bicep');
  const openAIBicep = resolve(REPO_ROOT, 'infra/azure/bicep/modules/openai.bicep');

  it('the openai module file exists', () => {
    expect(existsSync(openAIBicep)).toBe(true);
  });

  it('main.bicep references the openai module', () => {
    const src = readFileSync(mainBicep, 'utf8');
    expect(src).toMatch(/module\s+openai\s+['"]\.\/modules\/openai\.bicep['"]/);
  });

  it('openai.bicep declares a Cognitive Services account of kind OpenAI (S0)', () => {
    const src = readFileSync(openAIBicep, 'utf8');
    expect(src).toMatch(/Microsoft\.CognitiveServices\/accounts@/);
    expect(src).toMatch(/kind:\s*'OpenAI'/);
    expect(src).toMatch(/name:\s*'S0'/);
  });

  it('openai.bicep deploys a gpt-4o-mini model', () => {
    const src = readFileSync(openAIBicep, 'utf8');
    expect(src).toMatch(/Microsoft\.CognitiveServices\/accounts\/deployments@/);
    expect(src).toMatch(/name:\s*'gpt-4o-mini'/);
  });

  it('staging and production parameter files set openAICapacityTpm', () => {
    const staging = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'infra/azure/bicep/parameters/staging.json'), 'utf8'),
    );
    const production = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'infra/azure/bicep/parameters/production.json'), 'utf8'),
    );
    expect(staging.parameters.openAICapacityTpm?.value).toBeGreaterThan(0);
    expect(production.parameters.openAICapacityTpm?.value).toBeGreaterThanOrEqual(
      staging.parameters.openAICapacityTpm.value,
    );
  });
});
