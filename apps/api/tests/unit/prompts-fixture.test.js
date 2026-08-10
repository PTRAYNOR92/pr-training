import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE = resolve(__dirname, '../fixtures/prompts.regression.json');

/**
 * AI-003 Acceptance Criteria:
 * - 10 test prompts produce equivalent quality responses on Azure OpenAI.
 * - Regression test pass.
 *
 * The actual quality scoring is human — see docs/ai-003-regression-checklist.md.
 * This test is the shape-guard that keeps the fixture well-formed so the review
 * can be run reliably against any provider.
 */
describe('AI-003: prompt regression fixture is well-formed', () => {
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));

  it('has exactly ten prompts', () => {
    expect(fixture.prompts).toHaveLength(10);
  });

  it('each prompt has id, scenario, persona, and a non-trivial prompt string', () => {
    for (const p of fixture.prompts) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      expect(p.scenario).toBeTruthy();
      expect(p.persona).toBeTruthy();
      expect(typeof p.prompt).toBe('string');
      expect(p.prompt.length).toBeGreaterThan(30);
    }
  });

  it('prompt ids are unique', () => {
    const ids = fixture.prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all four scenario types at least twice so no category is under-sampled', () => {
    const counts = fixture.prompts.reduce((acc, p) => {
      acc[p.scenario] = (acc[p.scenario] ?? 0) + 1;
      return acc;
    }, {});
    // Expect at least 2 each for Select Committee, Media, Consultation, Job Interview.
    expect(counts['Select Committee'] ?? 0).toBeGreaterThanOrEqual(2);
    expect(counts['Media Interview'] ?? 0).toBeGreaterThanOrEqual(2);
    expect(counts['Public Consultation'] ?? 0).toBeGreaterThanOrEqual(2);
    expect(counts['Job Interview'] ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('names both the legacy and target model so the reviewer knows what to compare', () => {
    expect(fixture.model.legacy).toMatch(/openai/i);
    expect(fixture.model.target).toMatch(/azure/i);
  });
});
