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

## Q6 — PR 1 / C1: schema canonicity (`schema.sql` vs. migrations)

- Type: Answered.
- Answer: `supabase/migrations/` is the canonical, executable source of truth; `supabase/schema.sql` is a derived snapshot regenerated in PR 1 for the sections PR 1 touches (M-4). Residual drift is recorded in `docs/technical/KNOWN_ISSUES.md`.
- See: `DECISION_LOG.md` ADR-002 / C1 (and M-4).

## Q7 — PR 1 / C2: enforcement must be RLS + server action (not server action alone)

- Type: Answered.
- Answer: privacy guarantee enforced primarily at the database layer (RLS, with `can_converse` on `conversations INSERT` and `messages INSERT`); `conversations SELECT` remains participant-based to preserve history. Server actions are the canonical UX entrypoint and must use the RLS-constrained / `auth.uid()`-bound client.
- See: `DECISION_LOG.md` ADR-002 / C2 (and C3, M3, M5).

## Q8 — PR 1 / C3: `proposeInterview` admin-client bypass

- Type: Answered.
- Answer: `proposeInterview` is refactored to the RLS-constrained server-action client bound to `auth.uid()`. The admin client is out of scope for the PR 1 contact/interview path. For minor candidates, the action creates or reuses a `contact_requests` row in `pending` instead of opening a direct conversation / message / interview, and `job_applications.status` is not moved to `interviewing` until approval.
- See: `DECISION_LOG.md` ADR-002 / C3.

## Q9 — PR 1 / C4: `notifications.type` CHECK missing `contact_request`

- Type: Answered.
- Answer: the `notifications.type` CHECK is extended to accept `contact_request`, with the request status in `notifications.metadata.status` (pending / approved / rejected / cancelled). The extension ships in the same migration as the RLS changes and is idempotent. `contact_request` notifications are emitted by a single database trigger.
- See: `DECISION_LOG.md` ADR-002 / C4 (and M-5, M-7).

## Q10 — PR 1 / M1: `isMinor(role, age)` semantics

- Type: Answered.
- Answer: `isMinor(role, age) = role === 'Estudiante' && (age === null || age < 18)`, implemented once in TypeScript (shared helper for server actions and the student-facing UI) and once in SQL (RLS function reading `profiles.role` and `profiles.age`). The two implementations must agree and are kept in sync by the PR 1 implementation notes.
- See: `DECISION_LOG.md` ADR-002 / M1.

## Q11 — PR 1 / M5: treatment of existing Empresa↔minor conversations

- Type: Answered.
- Answer: soft-lock — history remains visible to the participants (`conversations SELECT` by participant); new messages are blocked by `can_converse` on `messages INSERT` until a `contact_request` is approved. On approval the implementation reuses the existing conversation if one exists, or creates a new one. The reuse-or-create trigger mechanics are a residual implementation question (see Q12).
- See: `DECISION_LOG.md` ADR-002 / M5.

## Secondary PR 1 decisions

- **Student-side visibility of `contact_requests`.** Answered: a minor student does not see `contact_requests` rows in the `pending` state in PR 1. See `DECISION_LOG.md` ADR-002 / M2 and the secondary decisions block.
- **Notification source.** Answered: `contact_request` notifications are emitted by a single database trigger (uniform, harder to bypass). See `DECISION_LOG.md` ADR-002 / C4.

## Residual implementation questions (PR 1)

The architectural decisions above are accepted. The following questions are **not** blockers for the ADR but must be resolved before the PR 1 code commit lands. They belong in the implementation plan / implementation notes rather than the ADR.

- **Q12 — Test / verification mechanism for `is-minor` and contact-routing (M6 audit).** No test framework is declared at the repo root. The implementation must pick one of: (a) introduce a minimal test in the project's existing test runner if one is present, or (b) a documented set of verifiable cases runnable as a script. The choice and the justification (per the auditor's preference for a minimal test where viable) live in the PR 1 implementation notes.
- **Q13 — Approval trigger mechanics (M5 detail).** When a `contact_requests` row is approved, the implementation must reuse the existing conversation if one exists, or create a new one. The exact lookup + upsert pattern, the place where the trigger lives, and the message that unlocks the soft-locked thread are implementation details to be specified in the implementation plan.
- **Q14 — `respondInterview` / `cancelInterview` admin-client scope (audit residual).** The architecture-auditor's verdict leaves these actions out of scope for PR 1 unless they touch the direct contact / interview flow. The implementation plan must explicitly confirm or exclude them, and justify any admin-client use case with a concrete, narrow, documented reason (per CR-1 / C3).
