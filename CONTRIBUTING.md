# Contributing

## Development workflow

1. `nvm use` then `npm install` at the repo root (installs workspaces).
2. Copy `.env.example` to `apps/web/.env.local` and `apps/api/.env.local`; fill in values.
3. `npm run dev:web` and `npm run dev:api` in separate terminals.
4. Start the Firebase emulator suite from `infra/firebase` for offline auth/Firestore: `firebase emulators:start`.

## Branching

- `main` is always deployable.
- Branch naming: `feat/<ticket-id>-short-slug`, `fix/<ticket-id>-short-slug`, `refactor/<slug>`, `docs/<slug>`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Pull requests

- Must reference the backlog ticket ID (e.g. `API-002`) in the title or description.
- Must pass CI: lint, unit tests, integration tests, build for both apps.
- Require 1 reviewer. Security-sensitive changes (auth, quota, secrets) require 2.
- Keep PRs small — aim for under 400 lines changed.

## Architecture decisions

Non-trivial changes to architecture go through an ADR in `docs/adr/`. See `docs/adr/0001-record-architecture-decisions.md` for the template.

## Code style

- Enforced by ESLint and Prettier. Run `npm run lint` and `npm run format` before pushing.
- No `console.log` in production paths — use the shared `logger` in `apps/api/src/utils/logger.js`.
- Never commit `.env.local`, credentials, or Firebase admin JSON files.
