# TalentHub Workflow Status

## Current Branch

- `chore/workflow-state`

## Current Phase

- PR 0 — Persistent workflow state tracking

## Current PR / Task

- Task: `chore: add persistent workflow state tracking`
- Scope: introduce `docs/workflow/` (this directory) and update `docs/git/GIT_WORKFLOW.md` so every session reads and updates the workflow state at start and close.

## Last Completed Work

- 2026-07-05 — Repository professionalization baseline on `caro-maturana` (commit `a3e36ba docs: record verification results`).
- `docs/git/GIT_WORKFLOW.md`, `docs/git/COMMIT_CONVENTION.md`, and `docs/roadmap/ROADMAP.md` are in place.

## Current Working State

- Working tree on `chore/workflow-state` (off `caro-maturana`): `docs/git/GIT_WORKFLOW.md` modified, `docs/workflow/` untracked.
- PR 0 validation (2026-07-05, QA session): `npm run lint` **passed**, `npm run typecheck` **passed**, `npm run build` **passed** (no dummy env values needed; build succeeded without additional env).
- Last known validation on the baseline branch (2026-07-05, dummy public env values): `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed. `npm run install:web` reported 21 dependency vulnerabilities (not auto-fixed). See `docs/technical/KNOWN_ISSUES.md`.

## Known Breakages

- Git pull over SSH failed with `Permission denied (publickey)` against `origin`; local was reported in sync with `origin` per `git status` at session start. Push is blocked until SSH credentials are restored.
- 21 dependency vulnerabilities reported by `npm run install:web` on the baseline branch (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Historical migrations still include old project naming in comments only (tracked in `docs/technical/KNOWN_ISSUES.md`).

## Next Recommended Action

- Review the diff of this PR for completeness against the PR 0 scope.
- Commit PR 0 with message `chore: add persistent workflow state tracking`.
- Then move on to PR 1: `fix/privacy-contact-routing` (see `NEXT_ACTIONS.md`).

## Owner / Agent Notes

- Owner: not assigned.
- Agent: opencode (Session 1, 2026-07-05). QA session: opencode (2026-07-05).
- No secrets, `.env.local`, service keys, or generated outputs may be added to this directory.
