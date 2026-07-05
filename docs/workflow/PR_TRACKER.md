# TalentHub PR Tracker

| ID | Title | Branch | Base | Status | Validation | Owner | Notes |
|----|-------|--------|------|--------|------------|-------|-------|
| PR 0 | chore: add persistent workflow state tracking | `chore/workflow-state` | `caro-maturana` | In progress | **Passed** (lint ✓, typecheck ✓, build ✓ — 2026-07-05 QA session) | not assigned | Introduces `docs/workflow/` and updates `docs/git/GIT_WORKFLOW.md`. Push blocked on SSH credential issue. |
| PR 1 | fix: privacy contact routing | `fix/privacy-contact-routing` | `caro-maturana` | Planned | Not run | not assigned | Prevent leaking private contact data (phone, email, address) through the public job application routing path. See `OPEN_QUESTIONS.md` Q3 for scoping. |

## PR 0 — Detail

- Branch: `chore/workflow-state`
- Base: `caro-maturana`
- Scope:
  - Create `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `PR_TRACKER.md`.
  - Update `docs/git/GIT_WORKFLOW.md` to require reading `STATUS.md`, `NEXT_ACTIONS.md`, `PR_TRACKER.md` at session start and updating `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at session close.
- Files touched in this PR: only documentation under `docs/`.
- Commit message (planned): `chore: add persistent workflow state tracking`.
- Validation: **passed** (2026-07-05 QA session). `npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓. No dummy env values required.
- Last known good validation (baseline `caro-maturana`, 2026-07-05, dummy public env values): lint passed, typecheck passed, build passed. `npm run install:web` reported 21 dependency vulnerabilities (not auto-fixed, see `KNOWN_ISSUES.md`).

## PR 1 — Detail

- Branch: `fix/privacy-contact-routing` (to be created from `caro-maturana`).
- Scope (preliminary):
  - Identify the public routing surface in `apps/web` that returns contact fields.
  - Update Supabase RLS policies and/or API response shaping to keep phone, email, and address behind an authenticated and authorized boundary.
  - Add or extend a test that asserts contact fields are not present in the unauthenticated response.
- Documentation: update `SESSION_LOG.md`, `PR_TRACKER.md`, and `docs/architecture/SECURITY_MODEL.md`.
- Validation: lint / typecheck / build plus the new contact-leak test.
