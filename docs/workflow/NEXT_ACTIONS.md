# TalentHub Next Actions

## Immediate (PR 0 — `chore/workflow-state`)

- ~~Create `docs/workflow/` with `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, and `PR_TRACKER.md`.~~ Done.
- ~~Update `docs/git/GIT_WORKFLOW.md` to require reading `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, and `PR_TRACKER.md` at session start and updating `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at session close.~~ Done.
- ~~Run `npm run lint`, `npm run typecheck`, and `npm run build` from the repo root to validate PR 0.~~ Done — all passed (2026-07-05 QA session).
- Review the working tree diff for accidental secrets, generated outputs, or unrelated changes.
- Commit PR 0 with message `chore: add persistent workflow state tracking`.
- Record the commit SHA in `SESSION_LOG.md` and update `PR_TRACKER.md` to `validation: passed`.
- Do not push until SSH credential issue is resolved (see `OPEN_QUESTIONS.md`).

## After Current PR

- PR 1: `fix/privacy-contact-routing` — branch from `caro-maturana`.
  - Goal: prevent leaking private contact data (phone, email, address) through the public job application routing path.
  - Pre-work: identify the routing surface in `apps/web` and the Supabase RLS policies that gate contact fields.
  - Validation: re-run `npm run lint`, `npm run typecheck`, `npm run build`; add or extend a test that asserts contact fields are not present in the unauthenticated response.
  - Documentation: update `SESSION_LOG.md` and `PR_TRACKER.md`; document any RLS change in `docs/architecture/SECURITY_MODEL.md`.

## Blocked

- Push to `origin` is blocked: SSH authentication fails with `Permission denied (publickey)`. Local branch is in sync with `origin` per `git status` at session start, but new commits cannot be pushed until credentials are restored.
- `npm run install:web` reports 21 dependency vulnerabilities on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
