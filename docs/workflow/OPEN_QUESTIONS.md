# TalentHub Open Questions

## Q1 — SSH push credentials

- Type: Blocked.
- Description: `git pull` against `origin` (git@github.com) failed with `Permission denied (publickey)`. Local branch `chore/workflow-state` was reported in sync with `origin` per `git status` at session start, but new commits cannot be pushed.
- Impact: PR 0 and subsequent PRs cannot be shared with remote reviewers until credentials are restored.
- Owner: not assigned.
- Action: confirm with the repository owner whether the SSH key is missing from the local agent, expired, or no longer authorized on the GitHub side. Update `STATUS.md`, `NEXT_ACTIONS.md`, and `SESSION_LOG.md` once resolved.

## Q2 — Base branch for PRs

- Type: Confirmation needed.
- Description: The current integration / base branch is `caro-maturana`. PR 0 is being prepared on `chore/workflow-state` branched from it, and `NEXT_ACTIONS.md` plans PR 1 (`fix/privacy-contact-routing`) to also branch from `caro-maturana`.
- Question: confirm that all PRs in the current cleanup phase must be opened against `caro-maturana` and not against `main`.
- Owner: not assigned.
- Action: capture the answer in this file and reflect it in `PR_TRACKER.md` and `docs/git/GIT_WORKFLOW.md`.

## Q3 — PR 1 scope and ownership

- Type: Scoping.
- Description: PR 1 is planned as `fix/privacy-contact-routing` to prevent leaking private contact data through the public job application routing path. Exact files, RLS policies, and tests to touch are not yet enumerated.
- Question: who owns PR 1, and which `apps/web` route plus which Supabase table / RLS policy are in scope?
- Owner: not assigned.
- Action: enumerate the affected files, RLS policies, and test cases during the PR 0 close-out and update `PR_TRACKER.md`.

## Q4 — Dependency vulnerabilities from `npm run install:web`

- Type: Tracking.
- Description: The baseline branch reports 21 dependency vulnerabilities. They were not auto-fixed to avoid unplanned breaking upgrades (see `docs/technical/KNOWN_ISSUES.md`).
- Question: should a dedicated chore PR be scheduled to triage and (where safe) upgrade the affected dependencies, and on which branch?
- Owner: not assigned.
- Action: schedule the dependency triage PR after PR 0 and PR 1, and link it from `PR_TRACKER.md` and `NEXT_ACTIONS.md`.

## Q5 — Validation runner for workflow PRs

- Type: Process.
- Description: PR 0 only touches documentation, so the existing Next.js lint / typecheck / build pipeline does not validate the new Markdown files. A future change to the workflow files could break the index without anyone noticing.
- Question: do we want a lightweight Markdown lint or link check added to CI, or is the read/update ritual in `GIT_WORKFLOW.md` enough for now?
- Owner: not assigned.
- Action: revisit when Phase 4 (CI) of `docs/roadmap/ROADMAP.md` is scheduled.
