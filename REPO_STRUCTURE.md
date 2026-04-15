# PR Training App — Repository Structure

**Programme:** PR Training App — Security & Architecture Improvement
**Version:** 1.0 · Draft · April 2026
**Owner:** Sola

This document defines the recommended repository layout for the PR Training App programme, based on the Solution Design Document, Solution Architecture Document, Product Backlog, and Test Plan. It is a **monorepo** containing the static web frontend, the secure Node.js API proxy, shared code, infrastructure-as-code, and programme documentation.

---

## 1. Why a monorepo

The programme has two first-class deployable units that must evolve in lockstep:

- `apps/web` — the static vanilla-JS frontend (Azure Static Web Apps)
- `apps/api` — the Node.js + Express proxy that validates Firebase JWTs, enforces quotas, and forwards to Azure OpenAI / ElevenLabs (Azure App Service)

They share Firebase configuration shape, request/response DTOs, and the Firestore schema (`conversations`, `messages`, `usage_daily`, `users`). A monorepo keeps these contracts in `packages/shared`, enables atomic PRs across layers, and gives a single CI/CD entry point — which aligns with SAD §4.2 (single GitHub Actions pipeline) and backlog item **FE-004** (lint enforced in CI).

npm workspaces are sufficient; no need for Turborepo/Nx at this size.

---

## 2. Top-level layout

```
pr-training/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # lint + test on every PR
│   │   ├── deploy-staging.yml        # auto-deploy on merge to main
│   │   └── deploy-production.yml     # manual approval gate (SAD §4.2)
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .vscode/
│   └── settings.json
│
├── apps/
│   ├── web/                          # Frontend — Azure Static Web Apps
│   └── api/                          # Backend — Azure App Service
│
├── packages/
│   └── shared/                       # DTOs, schemas, constants shared by web + api
│
├── infra/
│   ├── azure/                        # Bicep templates (App Service, Static Web Apps, Key Vault)
│   ├── firebase/                     # Firestore rules, indexes, emulator config
│   └── README.md
│
├── docs/
│   ├── 1_Solution_Design_Document.docx
│   ├── 2_Solution_Architecture_Document.docx
│   ├── 3_Product_Backlog.docx
│   ├── 4_Test_Plan.docx
│   ├── 5_Financial_Estimates.docx
│   ├── adr/                          # Architecture Decision Records
│   └── runbooks/                     # Operational runbooks (incident, rollback)
│
├── tests/
│   └── e2e/                          # Playwright — cross-app journeys (Test Plan §E2E)
│
├── scripts/
│   ├── setup.sh                      # one-shot local bootstrap
│   └── seed-firestore.js             # dev seed data
│
├── .editorconfig
├── .env.example                      # union of web + api env vars, for reference
├── .eslintrc.cjs                     # shared lint config (FE-004)
├── .gitignore
├── .gitattributes
├── .nvmrc                            # Node 20 LTS (SAD §5)
├── .prettierrc
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md                       # disclosure policy; references threat model
├── package.json                      # root — npm workspaces, shared scripts
└── package-lock.json
```

---

## 3. `apps/web` — static frontend

Maps directly to SDD §3.5 and SAD §2.1 (modular ES modules, no framework).

```
apps/web/
├── public/
│   ├── index.html                    # chat view
│   ├── login.html
│   └── assets/                       # images, fonts, favicon
├── src/
│   ├── main.js                       # bootstrap: mounts router, auth listener
│   ├── firebase.js                   # AUTH-001 — single initializeApp() (MUST)
│   ├── auth.js                       # onAuthStateChanged, getIdToken, logout redirect
│   ├── api.js                        # fetch() wrapper; injects Bearer JWT; 401 → /login
│   ├── chat.js                       # message state; streaming render
│   ├── voice.js                      # ElevenLabs calls via /api/voice
│   ├── router.js                     # hash router (FE-003)
│   ├── components/                   # FE-002 — shared partials
│   │   ├── nav.html
│   │   ├── header.html
│   │   └── footer.html
│   └── styles/
├── tests/
│   ├── unit/                         # Vitest
│   └── fixtures/
├── .env.example                      # VITE_FIREBASE_*, VITE_API_BASE_URL
├── package.json
└── vite.config.js                    # dev server + static build
```

**Notes**

- Vite is used for dev server + production bundling; output is static HTML/JS/CSS suitable for Azure Static Web Apps.
- All secrets stay server-side; only public Firebase config ships to the browser (that config is not secret).
- `components/` are loaded at runtime via `fetch()` to satisfy FE-002 without introducing a framework.

---

## 4. `apps/api` — secure proxy

Maps to SDD §3.3 and SAD §2.2 (middleware pipeline order preserved).

```
apps/api/
├── src/
│   ├── index.js                      # process entrypoint
│   ├── app.js                        # express app factory (testable)
│   ├── config/
│   │   └── env.js                    # typed env loader; fails fast on missing keys
│   ├── middleware/
│   │   ├── cors.js                   # API-006
│   │   ├── rateLimit.js              # IP-based, 100 req/min (SAD §3.2)
│   │   ├── jwtValidator.js           # API-002 + AUTH — Firebase RS256 verify
│   │   ├── jwksCache.js              # API-004 — cache Google public keys by TTL
│   │   ├── quotaChecker.js           # AI-005 — 10K tokens/day, 429 on breach
│   │   ├── requestLogger.js          # SAD §2.2.1 step 5
│   │   └── errorHandler.js           # uniform JSON errors
│   ├── routes/
│   │   ├── health.js                 # GET /api/health (no auth) — API-001
│   │   ├── chat.js                   # POST /api/chat — API-003
│   │   ├── voice.js                  # POST /api/voice — API-007
│   │   └── usage.js                  # GET /api/me/usage
│   ├── providers/
│   │   ├── index.js                  # AI-002 — provider abstraction
│   │   ├── azureOpenAI.js            # AI-001 — primary
│   │   ├── openAI.js                 # fallback / migration safety net
│   │   └── elevenLabs.js
│   ├── services/
│   │   ├── firestore.js              # SDK client (admin)
│   │   ├── quotaService.js           # reads/writes usage_daily
│   │   └── conversationLogger.js     # writes conversations + messages
│   └── utils/
│       ├── logger.js                 # pino; structured JSON logs
│       └── errors.js                 # typed error classes (401, 403, 429, 500)
├── tests/
│   ├── unit/                         # Jest or Vitest
│   ├── integration/                  # supertest against app factory
│   └── fixtures/
├── .env.example                      # FIREBASE_PROJECT_ID, AZURE_OPENAI_*, ELEVENLABS_*, etc.
├── jest.config.js
└── package.json
```

**Middleware order is fixed** (SAD §2.2.1): CORS → rate-limit → JWT → quota → request log → handler → response log. Reordering breaks acceptance criteria and must be guarded by an integration test.

---

## 5. `packages/shared`

Keeps contracts DRY across web and api.

```
packages/shared/
├── src/
│   ├── schemas/
│   │   ├── chat.js                   # request/response shapes for /api/chat
│   │   ├── voice.js
│   │   └── firestore.js              # doc shapes: users, conversations, messages, usage_daily
│   ├── constants.js                  # default quotas, model names, endpoint paths
│   └── index.js
└── package.json
```

Using plain JS + JSDoc types keeps it framework-free; a later migration to TypeScript is a straight upgrade.

---

## 6. `infra/`

```
infra/
├── azure/
│   ├── bicep/
│   │   ├── main.bicep                # App Service, Static Web App, Key Vault, App Insights
│   │   └── parameters/
│   │       ├── staging.json
│   │       └── production.json
│   └── README.md                     # how to deploy + required role assignments
├── firebase/
│   ├── firebase.json                 # emulator ports, project aliases
│   ├── firestore.rules               # server-admin writes only for logs
│   ├── firestore.indexes.json
│   └── .firebaserc
└── README.md
```

Infrastructure-as-code is a must-have, not a nice-to-have — it is how staging (SAD §4.1) stays a true mirror of production.

---

## 7. Environments & secrets

| Scope | Location | Notes |
|---|---|---|
| Local dev | `.env.local` per app, gitignored | Firebase emulator suite (AUTH-005) |
| Staging | Azure App Config + Key Vault refs | Deployed on merge to `main` |
| Production | Azure App Config + Key Vault refs | Manual approval gate |

`.env.example` at the root documents **every** variable used anywhere in the repo. No secret ever lives in git (API-005, SAD §3.2).

---

## 8. Branching & CI/CD

- **Trunk-based**: short-lived feature branches → PR into `main`.
- **CI (`ci.yml`)** runs on every PR: install → lint → unit + integration tests → build both apps.
- **Staging deploy** runs on push to `main`: builds, deploys web to SWA staging slot, deploys api to App Service staging slot, runs Playwright smoke suite.
- **Production deploy** requires manual `workflow_dispatch` approval; uses blue/green via App Service deployment slots (SAD §4.2).

---

## 9. Testing strategy (summary)

Aligned with the Test Plan. Each layer owns its own tests; cross-app journeys live at the repo root.

| Layer | Framework | Location |
|---|---|---|
| Frontend unit | Vitest | `apps/web/tests/unit` |
| Frontend component | Vitest + jsdom | `apps/web/tests/unit` |
| API unit | Vitest / Jest | `apps/api/tests/unit` |
| API integration | supertest | `apps/api/tests/integration` |
| End-to-end | Playwright | `tests/e2e` |
| Security | OWASP ZAP baseline scan (CI) | `.github/workflows/ci.yml` |

---

## 10. Migration path from the current Vercel app

1. Initialise this repo structure in a fresh branch.
2. Copy the current vanilla-JS source into `apps/web/src`, then decompose into the modules listed in §3 one PR at a time (FE-001).
3. Stand up `apps/api` skeleton with `/api/health` only (API-001); deploy to Azure App Service staging.
4. Add JWT middleware behind a feature flag; point `apps/web` `api.js` at the new API (API-002, AUTH-002).
5. Swap provider from direct OpenAI to Azure OpenAI via the provider abstraction (AI-001, AI-002).
6. Cut Vercel traffic to Azure Static Web Apps; decommission the exposed OpenAI endpoint.

---

## 11. Open decisions to confirm before first commit

These are called out as ADRs to write (`docs/adr/`):

- **ADR-0001** Monorepo vs two repos — recommended: monorepo.
- **ADR-0002** Bundler for the web app — recommended: Vite.
- **ADR-0003** Test runner — recommended: Vitest across both apps for consistency.
- **ADR-0004** Logging/observability stack — recommended: pino + Application Insights.
- **ADR-0005** Firestore vs Cosmos DB — SDD §3.6 leaves this open; recommended: Firestore initially, Cosmos later if full Azure migration proceeds.
