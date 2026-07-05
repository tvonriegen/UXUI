# TalentHub Next Actions

## Immediate (PR 0 — `chore/workflow-state`)

- ~~Create `docs/workflow/` with `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, and `PR_TRACKER.md`.~~ Done.
- ~~Update `docs/git/GIT_WORKFLOW.md` to require reading `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, and `PR_TRACKER.md` at session start and updating `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at session close.~~ Done.
- ~~Run `npm run lint`, `npm run typecheck`, and `npm run build` from the repo root to validate PR 0.~~ Done — all passed (2026-07-05 QA session).
- ~~Review the working tree diff for accidental secrets, generated outputs, or unrelated changes.~~ Done.
- ~~Commit PR 0 with message `chore: add persistent workflow state tracking`.~~ Done (local commit `e01cecf`).
- ~~Record the commit SHA in `SESSION_LOG.md` and update `PR_TRACKER.md` to `validation: passed`.~~ Done.
- Push to `origin` is still blocked by the SSH credential issue. Restore credentials, push `chore/workflow-state`, and open PR 0 against `caro-maturana`.
- If continuing to work locally while SSH is blocked, integrate the local PR 0 commit `e01cecf` into `caro-maturana` first, then start PR 1 from that branch.

## After Current PR

- PR 1: `fix/privacy-contact-routing` — branch from `caro-maturana`. Start only after PR 0 is integrated into `caro-maturana`.
  - Goal: route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data.
  - Pre-work: identify the company-to-candidate contact flow used for minor students (profile, application, message routes in `apps/web`) and the Supabase RLS policies that gate contact fields.
  - Validation: re-run `npm run lint`, `npm run typecheck`, `npm run build`; add or extend a test that asserts a company's contact intent toward a minor student is routed through the school-mediated path and the student's direct contact data is not exposed in the company-facing response.
  - Documentation: update `SESSION_LOG.md` and `PR_TRACKER.md`; document any routing / RLS change in `docs/architecture/SECURITY_MODEL.md`.

## Blocked

- Push to `origin` is blocked: SSH authentication fails with `Permission denied (publickey)`. Local branch is in sync with `origin` per `git status` at session start, but new commits cannot be pushed until credentials are restored.
- `npm run install:web` reports 21 dependency vulnerabilities on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
