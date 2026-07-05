# TalentHub PR Tracker

| ID | Title | Branch | Base | Status | Validation | Owner | Notes |
|----|-------|--------|------|--------|------------|-------|-------|
| PR 0 | chore: add persistent workflow state tracking | `chore/workflow-state` | `caro-maturana` | Local committed / ready for PR | **Passed** (lint ✓, typecheck ✓, build ✓ — 2026-07-05 QA session) | not assigned | Introduces `docs/workflow/` and updates `docs/git/GIT_WORKFLOW.md`. Branch head carries `e01cecf` (main setup) and `f15550b` (docs finalization). Next step is to push/integrate the full local branch head — not cherry-pick `e01cecf` alone. Push blocked on SSH credential issue. |
| PR 1 | fix: privacy contact routing (minor students via school) | `fix/privacy-contact-routing` | `caro-maturana` | Planned | Not run | not assigned | Route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data. |

## PR 0 — Detail

- Branch: `chore/workflow-state`
- Base: `caro-maturana`
- Scope:
  - Create `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `PR_TRACKER.md`.
  - Update `docs/git/GIT_WORKFLOW.md` to require reading `STATUS.md`, `NEXT_ACTIONS.md`, `PR_TRACKER.md` at session start and updating `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at session close.
- Files touched in this PR: only documentation under `docs/`.
- Commit message (planned): `chore: add persistent workflow state tracking`.
- Commits on `chore/workflow-state`:
  - `e01cecf chore: add persistent workflow state tracking` — main PR 0 setup commit (2026-07-05).
  - `f15550b docs: finalize workflow state after PR 0 setup` — documentation-only follow-up on the same branch (2026-07-05).
- The full local branch head (both commits) is not yet on `origin`; push blocked by SSH credential issue. The next step is to push/integrate the **full local branch head of `chore/workflow-state`**, not cherry-pick `e01cecf` alone.
- Validation: **passed** (2026-07-05 QA session). `npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓. No dummy env values required.
- Last known good validation (baseline `caro-maturana`, 2026-07-05, dummy public env values): lint passed, typecheck passed, build passed. `npm run install:web` reported 21 dependency vulnerabilities (not auto-fixed, see `KNOWN_ISSUES.md`).

## PR 1 — Detail

- Branch: `fix/privacy-contact-routing` (to be created from `caro-maturana` after PR 0 is integrated).
- Purpose: route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data.
- Scope (preliminary):
  - Identify the company-to-candidate contact flow used for minor students (profile, application, message routes in `apps/web`) and the Supabase RLS policies that gate contact fields.
  - Update the routing and/or RLS policies so that when a company contacts a minor candidate, the contact is delivered to / mediated by the school rather than reaching the student directly.
  - Add or extend a test that asserts a company's contact intent toward a minor student is routed through the school-mediated path and the student's direct contact data is not exposed in the company-facing response.
- Documentation: update `SESSION_LOG.md`, `PR_TRACKER.md`, and `docs/architecture/SECURITY_MODEL.md`.
- Validation: lint / typecheck / build plus the new minor-student routing test.
