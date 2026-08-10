# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public GitHub issue.

Email: _to be assigned — owner: Sola_

Expect an acknowledgement within 2 business days and a remediation plan within 10 business days for confirmed issues.

## Scope

In scope:
- `apps/web` (frontend) and `apps/api` (secure proxy) in this repository
- Deployed production environment (`pr-training.app`) once live
- Firebase Authentication and Firestore configuration

Out of scope:
- Third-party provider infrastructure (Azure OpenAI, ElevenLabs, Firebase platform)
- Denial-of-service findings against shared infrastructure without a clear amplification factor

## Hard rules

- All AI endpoints are gated behind Firebase JWT validation (Solution Design §3.2–3.3).
- No secrets are committed to the repository; all credentials live in Azure Key Vault (production) or local `.env.local` files (development).
- Per-user token quotas are enforced server-side (default 10,000 tokens/day).
- All conversation traffic is logged to Firestore for non-repudiation (Solution Architecture §3.2).

## Disclosure

We follow coordinated disclosure. Reporters who submit in good faith will be acknowledged in release notes if they wish.
