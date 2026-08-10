# ADR 0001 — Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Sola

## Context

Non-trivial architecture choices (database, hosting, provider, protocol) have already been made in the Solution Design and Solution Architecture Documents. To make those choices discoverable, challengeable, and auditable over time, each significant decision is captured as a short, numbered Markdown file in `docs/adr/`.

## Decision

We will use [Michael Nygard's lightweight ADR format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) with five sections: Status, Context, Decision, Consequences, and Links. New ADRs are opened as PRs and require one reviewer.

## Consequences

- All future cross-cutting technical decisions must land with a matching ADR.
- Status transitions (`Accepted` → `Superseded`) are explicit; superseded ADRs are kept for history and cross-reference the replacement.
- ADRs are part of the repo, not the programme docs on OneDrive — they track code, not scope.

## Links

- `REPO_STRUCTURE.md` §11 — list of ADRs to write next
- SDD, SAD (OneDrive) — source of the initial decisions
