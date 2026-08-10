# Source Control and Branching Strategy

**Programme:** PR Training App — Security & Architecture Improvement
**Version:** 1.0 · Draft · April 2026
**Applies to:** `github.com/PTRAYNOR92/pr-training`

This document defines the branching model, PR workflow, branch protection rules, commit conventions, and release process. It is derived from the Product Backlog (Epics 1–4) and the Test Plan (sprint schedule, entry/exit criteria, defect priorities).

---

## 1. Principles

1. **Trunk-based.** `main` is the single source of truth and is always deployable. Long-lived branches are avoided.
2. **Short-lived feature branches.** Scoped to one backlog ticket, merged within days — not weeks.
3. **Every PR references a backlog ticket.** If there is no ticket, write one before opening the branch. This is what links code to the acceptance criteria the Test Plan will check.
4. **Tests are gates, not afterthoughts.** The Test Plan's P1/P2 categories map directly to CI jobs and branch protection.
5. **Security changes require two reviewers.** Everything under `apps/api/src/middleware/`, `apps/api/src/providers/`, `infra/`, and `SECURITY.md` — enforced via `CODEOWNERS`.

---

## 2. Branches

| Branch | Purpose | Lifetime | Protected |
|---|---|---|---|
| `main` | Always deployable. Staging deploys on every merge. | Permanent | Yes |
| `refactor/monorepo` | One-off branch that lands the monorepo scaffold. | Until merged to main | Yes (while open) |
| `feat/<TICKET>-<slug>` | New feature work tied to a backlog ticket. | Days | No |
| `fix/<TICKET>-<slug>` | Bug fix tied to a defect ticket. | Days | No |
| `hotfix/<TICKET>-<slug>` | Production-critical fix (P1 defect). See §7. | Hours | No, but fast-track review |
| `docs/<slug>` | Docs, ADRs, README, runbooks. | Days | No |
| `chore/<slug>` | Dependency bumps, lint config, build tweaks. | Days | No |
| `release/<vX.Y.Z>` | Only if a release requires stabilisation beyond staging soak. Usually not needed. | Days | Yes while open |

### 2.1 Ticket IDs come from the Product Backlog

Use the exact IDs from `docs/3_Product_Backlog.docx`. Examples:

- `feat/API-002-jwt-validator` — Epic 1, MUST
- `feat/AUTH-001-centralise-firebase-init` — Epic 2, MUST
- `feat/AI-002-provider-abstraction` — Epic 3, SHOULD
- `feat/FE-001-decompose-script-legacy` — Epic 4, SHOULD
- `fix/SEC-009-quota-breach-returns-429` — test-plan-derived defect
- `docs/adr-0005-firestore-vs-cosmos`

### 2.2 Branching off `main` only

Feature branches are created from the latest `main`. Never branch off another feature branch — if you need code that isn't merged yet, say so in the PR description and coordinate merge order, don't chain branches.

---

## 3. Commit messages (Conventional Commits)

Format: `<type>(<scope>): <subject>`

| Type | When to use |
|---|---|
| `feat` | User-visible or API-surface addition |
| `fix` | Bug fix |
| `refactor` | No behavioural change |
| `perf` | Performance change with measurable delta |
| `test` | Tests only |
| `docs` | Docs only |
| `chore` | Tooling, deps, CI |
| `build` | Build pipeline / bundler changes |
| `ci` | GitHub Actions changes |

Scopes follow the workspace: `web`, `api`, `shared`, `infra`, `docs`, or `repo` for cross-cutting changes.

Subject in the imperative, under 72 characters, no trailing period. Body (optional) explains **why**. Reference the ticket in the body, not the subject:

```
feat(api): validate Firebase RS256 JWT on all protected endpoints

Implements API-002. Uses jose's createRemoteJWKSet so Google's public
keys are cached per Cache-Control TTL (API-004). Returns 401 with a
minimal error body — no stack trace — satisfying SEC-005.

Refs: API-002, API-004, SEC-001..SEC-005
```

Breaking changes use `feat!:` or a `BREAKING CHANGE:` footer.

---

## 4. Pull request workflow

```
backlog ticket exists
        │
        ▼
branch off latest main   ──► local work + commits ──► push
        │
        ▼
open PR (draft if WIP)   ──► CI runs lint + unit + integration + build
        │
        ▼
mark ready for review    ──► 1 reviewer (2 for security paths via CODEOWNERS)
        │
        ▼
all required checks green + approvals met
        │
        ▼
squash and merge         ──► main updated ──► deploy-staging.yml runs
                                                   │
                                                   ▼
                                           Playwright smoke on staging
```

### 4.1 PR requirements (match Test Plan entry criteria)

Every PR must, before merge:

- Reference the backlog ticket ID and copy its acceptance criteria into the description (the PR template enforces this).
- Pass the `CI` workflow: `lint`, `test`, `build`.
- Include tests at the level called out in Test Plan §3.1. For example, a change to `jwtValidator.js` must ship unit tests covering valid / expired / wrong-audience / missing / tampered (90% coverage target — SEC-001..SEC-005).
- Update `.env.example` if new environment variables are added.
- Not decrease coverage on touched files.
- For security-path changes, include a note in the PR body stating which Test Plan P1 cases were re-run locally (SEC-001..SEC-013).

### 4.2 Merge method

- **Squash and merge is the default.** One feature → one commit on `main`. Keeps history linear and readable.
- Rebase-and-merge allowed only for small, clean PRs with logically separate commits that the reviewer asks to preserve.
- **No merge commits on `main`** — GitHub setting enforces this.

### 4.3 PR size

Aim for PRs under 400 lines of diff. Split an epic across several PRs rather than batching. Reviewers are allowed to decline oversized PRs.

### 4.4 Reviewer SLAs

- First response within one working day.
- Security-tagged PRs take priority over everything else.
- If a reviewer is unavailable, request a replacement in the PR thread; don't self-merge.

---

## 5. Branch protection rules (apply these on GitHub)

On `main`:

- Require pull request before merging: **yes**
- Required approvals: **1** (2 when `CODEOWNERS` triggers — enforced automatically)
- Require review from Code Owners: **yes**
- Dismiss stale reviews on new commits: **yes**
- Require status checks to pass: **yes** — required checks:
  - `CI / lint-test-build`
  - (once wired) `Deploy to Staging / smoke`
- Require branches to be up to date before merging: **yes**
- Require conversation resolution before merging: **yes**
- Require linear history: **yes**
- Include administrators: **yes**
- Restrict who can push: **no one** (PR-only)
- Allow force pushes: **no**
- Allow deletions: **no**

On `refactor/monorepo` (while it is live):

- Same rules, so the initial scaffold lands through review and CI too.

---

## 6. Release strategy

### 6.1 Environments

Per Solution Architecture §4.1:

| Environment | Trigger | Who approves |
|---|---|---|
| Dev (local) | Developer | — |
| Staging | Push to `main` (automatic) | — |
| Production | `workflow_dispatch` on `deploy-production.yml` with a specific SHA | Production environment reviewers in GitHub |

### 6.2 Tagging and versioning

Semantic versioning, `vMAJOR.MINOR.PATCH`:

- Tag on `main` at the commit that was promoted to production.
- Tag messages reference the Test Plan exit criteria met (see §7 of the Test Plan).
- Release notes are auto-generated from Conventional Commit messages between tags.

### 6.3 Sprint milestones (from Test Plan §5)

Each sprint targets a milestone; the scope maps to backlog tickets and the exit criteria come from the Test Plan.

| Sprint | Focus | Target milestone tag | Exit criteria to meet |
|---|---|---|---|
| 1 | Secure API + JWT auth | `v2.0.0-beta.1` | SEC-001..SEC-011 pass; AUTH unit tests pass |
| 2 | Azure OpenAI migration + quota | `v2.0.0-beta.2` | SEC-012, SEC-013 pass; AI integration tests pass; quota enforcement verified |
| 3 | Frontend refactor + DB logging | `v2.0.0-rc.1` | FUN-001..FUN-007 pass; Firestore integration tests pass; module unit tests at coverage target |
| 4 | UAT + polish | `v2.0.0` | UAT sign-off; no P1/P2 open; coverage targets met; CI green on main |

A PR is not "done" until its acceptance criteria appear in the sprint milestone's exit checklist.

---

## 7. Hotfix path

Used only for P1 defects in production (Test Plan §4, "blocks release").

1. Branch `hotfix/<TICKET>-<slug>` from the tag currently deployed to production (not from `main`, which may have unreleased features).
2. Minimal fix + regression test (a test that fails before the fix and passes after).
3. PR with `hotfix` label; any reviewer from `CODEOWNERS` may approve; single approval is sufficient.
4. Merge → deploy-staging runs → smoke passes → manually dispatch production deploy referencing the hotfix SHA.
5. Immediately after: merge (or cherry-pick) the same commit into `main` to prevent regression.
6. Open a follow-up ticket if the fix was a workaround — full remediation lands through the normal flow.

---

## 8. Defect handling (aligned to Test Plan §4)

| Defect priority | Branch prefix | Review target | Merge blocker? |
|---|---|---|---|
| P1 (Critical, security/data) | `hotfix/` or `fix/` | Same day | Blocks release and blocks new feature merges |
| P2 (High, core broken) | `fix/` | Within sprint | Blocks feature merges in the same workspace |
| P3 (Medium) | `fix/` | Next sprint | No |
| P4 (Low) | `fix/` or `chore/` | Backlog-triaged | No |

---

## 9. Repository hygiene

- Delete feature branches on merge (GitHub setting).
- No binary or generated files in git — enforced by `.gitignore`.
- No secrets — enforced by a pre-commit hook (to be added) and by review.
- `main` never has a broken build. If it does, revert first, fix second.
- ADRs are append-only. Superseding an ADR is itself a PR; do not rewrite history.

---

## 10. First three PRs after this document

Suggested sequence to validate the process end-to-end:

1. **Merge `refactor/monorepo` → main** — the scaffold itself. This PR establishes branch protection rules and the CI surface.
2. **`feat/API-001-bootstrap-express-skeleton`** — wire the real Express app on top of the scaffold, deploy to Azure App Service staging, confirm `/api/health` returns 200.
3. **`feat/API-002-jwt-validator`** — JWT middleware with unit tests covering SEC-001..SEC-005.

After PR 3 lands, Sprint 1 exit criteria can be measured against the Test Plan.
