# AI-003 — Prompt Regression Checklist

**Purpose.** Confirm that migrating from the legacy OpenAI deployment to Azure OpenAI (gpt-4o-mini) does not regress response quality on the ten prompts in [`apps/api/tests/fixtures/prompts.regression.json`](../apps/api/tests/fixtures/prompts.regression.json). This is a human-scored review — language-model "quality" cannot be asserted in CI.

## How to run

1. Ensure both providers have a working `complete()` implementation in `apps/api/src/providers/`.
2. Run the fixture against each provider locally and capture the outputs. Example:

   ```bash
   node scripts/run-prompt-fixture.js --provider=openai      > out/openai.json
   node scripts/run-prompt-fixture.js --provider=azure-openai > out/azure.json
   ```

   (The helper script is out of scope for this ticket — create it on the day of the migration review.)
3. Open the two output files side by side and score each prompt on the rubric below.

## Rubric (1–5 per dimension, 5 = best)

| Dimension | What to check |
|---|---|
| **Adherence to persona** | Does the response sound like the named persona? |
| **Task completion** | Did it answer the prompt or sidestep? |
| **Factual plausibility** | Are named entities, dates, figures credible for the domain? |
| **Tone** | Is tone appropriate for the scenario (adversarial / warm / forensic)? |
| **Brevity** | Is it free of padding and filler? |

## Pass criterion

A prompt **passes** when the Azure gpt-4o-mini response scores **within one rubric point** of the legacy response on every dimension. The migration passes when **at least 9 of 10** prompts pass, and no prompt drops by two or more points on any single dimension.

## Known-risky prompts

- `feedback-01` and `feedback-02` stress specificity more than other prompts — budget extra time to grade them.
- `media-02` has previously elicited sycophantic responses from smaller models; watch the "Tone" dimension.

## After the review

Record scores in a one-off Google Doc linked from the AI-003 PR description. Do not commit scored outputs — they are just test artefacts.
