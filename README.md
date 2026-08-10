# PR Training App

Monorepo for the PR Training Web Application — a training tool for communications and PR professionals with AI-powered chat, voice, and Firebase-authenticated access.

This repo is being refactored under the **Security & Architecture Improvement Programme**. See [`REPO_STRUCTURE.md`](./REPO_STRUCTURE.md) for the target layout and rationale.

## Packages

| Path | Description |
|---|---|
| `apps/web` | Static frontend (vanilla JS ES modules) — Azure Static Web Apps |
| `apps/api` | Secure Node.js + Express proxy — Azure App Service |
| `packages/shared` | DTOs, schemas, and constants shared by web + api |
| `infra/azure` | Bicep templates for Azure resources |
| `infra/firebase` | Firestore rules, indexes, emulator config |

## Prerequisites

- Node.js 20 LTS (see `.nvmrc`)
- npm 10+
- Firebase CLI (for emulators)
- Azure CLI (for infra deploys)

## Getting started

```bash
nvm use
npm install
npm run dev:web   # starts Vite dev server for the frontend
npm run dev:api   # starts the API on http://localhost:3000 (separate terminal)
```

Copy `.env.example` to `.env.local` in each app before running.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:web` | Frontend dev server |
| `npm run dev:api` | API dev server with hot reload |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint every workspace |
| `npm run test` | Unit + integration tests across workspaces |
| `npm run test:e2e` | Playwright end-to-end suite |

## Branching

Trunk-based: feature branches → PR into `main`. Staging deploys on merge to `main`; production requires manual approval (see `.github/workflows/`).

## Security

Report vulnerabilities per [`SECURITY.md`](./SECURITY.md). No secrets in git — all credentials live in Azure Key Vault / Firebase project config.
