# Infrastructure

Infrastructure-as-code for the PR Training App. Staging and production environments are defined here and deployed via GitHub Actions (see `.github/workflows/`).

## Contents

| Path | Purpose |
|---|---|
| `azure/bicep/main.bicep` | Azure resources: Static Web App, App Service, Key Vault, Application Insights, Azure OpenAI (AI-001) |
| `azure/bicep/modules/openai.bicep` | Azure OpenAI account + gpt-4o-mini deployment (AI-001) |
| `azure/bicep/parameters/staging.json` | Environment-specific parameters for staging |
| `azure/bicep/parameters/production.json` | Environment-specific parameters for production |
| `firebase/firebase.json` | Firebase project config + emulator ports |
| `firebase/firestore.rules` | Firestore security rules (server-admin writes only for logs) |
| `firebase/firestore.indexes.json` | Composite indexes for conversation queries |

## Local Firebase emulator

```bash
cd infra/firebase
firebase emulators:start
```

Used by `apps/web` and `apps/api` when `NODE_ENV=development` (AUTH-005).
