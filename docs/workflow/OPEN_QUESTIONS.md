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

## Residual implementation questions (PR 1) — resolved in implementation

- **Q12 — Test / verification mechanism for `is-minor` and contact-routing (M6 audit).** Answered: the repo has no root test runner, so PR 1 adds the no-new-dependency script `scripts/verify-is-minor.mjs` and root script `npm run verify:is-minor` with canonical cases for `Estudiante` unknown age, under 18, 18+, and non-student roles. The DB/RLS path still needs QA against a migrated Supabase instance.
- **Q13 — Approval trigger mechanics (M5 detail).** Answered: `trg_fn_contact_request_approve_conversation()` runs after a `contact_requests.status` transition to `approved`, canonicalizes the company/student UUID pair with `LEAST`/`GREATEST`, reuses an existing conversation if present, or inserts one with `ON CONFLICT DO NOTHING`. The same approved request unlocks future message inserts through `can_converse`.
- **Q14 — `respondInterview` / `cancelInterview` admin-client scope (audit residual).** Answered: PR 1 touches only `proposeInterview` in the direct contact / interview proposal path. `respondInterview` and `cancelInterview` remain out of PR 1 scope and still require a follow-up admin-client review before production hardening. The follow-up is tracked in `docs/technical/KNOWN_ISSUES.md` and is **not a blocker** for the PR 1 commit.

## Follow-up (not a blocker)

- **Q15 — Runtime Supabase migration / RLS / trigger smoke test.** Local validation passed (`npm ci --prefix apps/web` 21 baseline vulnerabilities, `verify:is-minor` 7/7, `verify:interviews-privacy-rls` passed, lint, typecheck, build with `.env.local` detected but no values read/displayed, `git diff --check` passed), and the security review approved the diff after the B1 / M1 fixes. The migrations in `supabase/migrations/20260705000001_contact_requests.sql` and `supabase/migrations/20260705000002_interviews_privacy_rls.sql` have not been exercised on a live Supabase instance in this pass. Recommended before merge / deploy: apply the migrations to a Supabase instance and run end-to-end checks for company minor insert, school approve / reject, conversation reuse / create on approval, message soft-lock before approval, direct non-minor contact, the B1 trigger rejecting a non-service `profiles.role` / `profiles.age` update, and PR 1B interview insert hardening (swapped `student_id`, wrong `company_id`, non-`proposed` status, applications from another company, and immutable-column UPDATE rejection). This is a follow-up, **not a blocker** for the PR 1 commit.

## Q16 — Vercel owner access and merge policy for PR #2 (external preview check failing while local validation passes)

- Type: Answered (merge policy decided for the privacy PR #2; Vercel ownership and post-merge follow-up remain tracked).
- Answer: The privacy PR **#2** (https://github.com/tvonriegen/UXUI/pull/2) was **merged to `caro-maturana`** on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f` **despite the failing external `Vercel` check** (option (a) in the original question). The merge brought in the PR 1 implementation on `fix/privacy-contact-routing` (HEAD `7a881f6`) and the PR 1B interview privacy RLS hardening (`8f39ce63b67f43f11d5dd49a23d28876c4413d05`), which is the INSERT/immutable-trigger correction already applied in `supabase/migrations/20260705000002_interviews_privacy_rls.sql` (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger on identity columns). The **follow-up before `main`** is the hardening of `interviews.status` UPDATE transitions (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`); this is **not** the INSERT/immutable trigger correction. Local validation was green (`verify:is-minor` 7/7, `verify:interviews-privacy-rls` passed, typecheck, lint, build, `git diff --check`); the only failing check was the external deployment owned by a teammate / partner. The merge is therefore the **answer** to the original question: the team's policy on this PR was option (a). The Vercel failure is now **historical for PR #2** and remains tracked in `KNOWN_ISSUES.md` (External deployment issues) for future reference. The original sub-questions (Vercel owner runbook, access grant, real-code-issue vs. environment-issue classification) are now post-merge follow-up items rather than a merge gate.
- Follow-up (post-merge, not a blocker):
  - Teammate / project owner who owns the Vercel project should still run `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` from a machine with valid Vercel credentials, share the build logs, fix the build if the failure is actionable, or grant the user access so future failures are inspectable / fixable from this workspace.
  - The mandatory pre-`main` follow-up is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — not the INSERT/immutable trigger correction already applied in PR 1B; the runtime Supabase **staging** smoke test for both PR 1 migrations is the **follow-up before `main`** per `OPEN_QUESTIONS.md` Q15.
  - The technical PR 2 (`refactor/feature-boundaries`) was stacked on `fix/privacy-contact-routing` while the privacy PR #2 was held by the Vercel check; with the privacy PR #2 now merged to `caro-maturana`, the retarget / rebase policy is the live open question (see Q18 below).
- Description (preserved for audit): the original `Vercel` GitHub check on PR #2 failed; `Vercel Preview Comments` passed; local validation was green; the failing deployment id was `dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua`; the Vercel project is owned by a teammate / partner's GitHub account, so the user could not inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reported `No existing credentials found`). The user explicitly stated they could not fix Vercel because the project belonged to the teammate / partner. The merge was performed with the failing check recorded as a known issue.
- Owner: not assigned (Vercel side: teammate / partner who owns the Vercel project; merge policy: already decided via the merge itself).
- Action: capture the post-merge follow-up in `STATUS.md`, `NEXT_ACTIONS.md`, and `KNOWN_ISSUES.md`. Reflect the merged state in `PR_TRACKER.md` and the technical PR 2 stacked posture in `OPEN_QUESTIONS.md` Q18.

## Q17 — PR 2 test mechanism for the contact-routing service layer (Phase A Gate 2) — answered

- Type: Answered.
- Answer: The owner resolved Gate 2 by instruction: use the no-dependency PR 1 `verify:*` pattern and add root script `verify:contact-policy` backed by `scripts/verify-contact-policy.mjs`. No Vitest/Jest/test-runner dependency is added.
- Validation: `npm run verify:contact-policy` passes 8 canonical cases for `decideContactPath` (self, Empresa -> minor with school, Empresa -> minor without school, Empresa -> Egresado, Empresa -> non-minor Estudiante, Colegio -> own Estudiante, Colegio -> other-school Estudiante, unknown role).
- Description: PR 2 (`refactor/feature-boundaries`, stacked on `fix/privacy-contact-routing`; being synced against `origin/caro-maturana` after the privacy PR #2 merge with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`) introduces pure / RLS-aware services in `apps/web/src/lib/services/` (notably `contact-policy.ts` and `conversations.ts::ensureConversation`) and wraps the contact-requests server action in a service. The architect verdict (2026-07-05) requires a safety net (characterization tests) for the contact-routing service layer before moving any privacy-sensitive logic. PR 1 used a no-new-dependency `verify:*` script approach (`scripts/verify-is-minor.mjs` + root `verify:is-minor`). PR 2 must decide whether to keep that approach or to add a minimal test runner.
- Sub-questions:
  - Does the owner accept a minimal pure-service test runner (e.g. `node --test`, `vitest` with no new dependencies beyond what is already in the lockfile, or another low-friction choice) for PR 2?
  - If yes, which runner, and what is the rationale? The choice and the justification must be recorded in `DECISION_LOG.md` ADR-003 (sub-decision "Test mechanism") and reflected in `package.json` if a script needs to be added at the root.
  - If no, does PR 2 keep the PR 1 `verify:*` script approach and add `verify:contact-policy` for the canonical cases of the new `contact-policy` pure decision function? The canonical cases must cover at minimum: minor student (pending path), non-minor student (direct path), self-contact (deny), missing school for a minor student (error), and unknown role.
  - Either way, the chosen mechanism must be runnable on `lib/services/contact-policy.ts`, `lib/services/conversations.ts`, and `lib/services/contact-requests.ts` without a live Supabase instance (i.e. with a fake client) so the safety net is hermetic and reproducible.
- Impact: Gate 2 no longer blocks the Phase A service-boundary implementation.
- Owner: not assigned.
- Action: keep `verify:contact-policy` in the validation checklist for PR 2 Phase A.

## Q18 — PR 2 base and retarget / rebase policy after the privacy PR #2 was merged to `caro-maturana`

- Type: Process / branch policy (now live, not hypothetical).
- Description: PR 2 (`refactor/feature-boundaries`) was cut from `fix/privacy-contact-routing` (HEAD `7a881f6`) as a **stacked** branch because the privacy PR **#2** against `caro-maturana` was held by the external Vercel check at the time. The privacy PR #2 has since been **merged to `caro-maturana`** on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`, bringing in PR 1 + PR 1B. The `refactor/feature-boundaries` branch is now being synced against the new `caro-maturana` HEAD via a **merge sync** from `origin/caro-maturana` (the conflict resolution was mostly documentation / `package.json`, but the integration brings in the privacy PR #2 code, including the PR 1B migration). This question is now the **live** open question for the technical PR 2: what is the procedure for the technical PR 2's base, given that `caro-maturana` is now ahead of `fix/privacy-contact-routing` `7a881f6`?
- Sub-questions:
  - Is the team OK with retargeting the PR 2 PR to `caro-maturana` after PR #2 merges? (Fast-forward is not possible because `fix/privacy-contact-routing` is already merged; the new base is `caro-maturana` post-merge.)
  - Is a rebase preferred over a retarget? The rebase risk is low because PR 2 does not touch `supabase/`, `package.json`, or `apps/web/src/app/api/`, but it is real and must be planned for.
  - If `caro-maturana` advances (e.g. dependency triage PR) before PR #2 lands, does the team accept a rebase of `refactor/feature-boundaries` onto the new `caro-maturana` HEAD? Or is the stacked branch frozen on `fix/privacy-contact-routing` `7a881f6` until PR #2 lands, and any drift is handled by a merge commit at retarget time?
  - What is the merge policy for PR 2 itself: squash, merge commit, or rebase-and-merge? The team convention in `docs/git/COMMIT_CONVENTION.md` favors small atomic commits; a merge commit is acceptable for stacked PRs.
- Impact: determines the mechanical procedure when PR #2 lands. Not a blocker for the architecture pass; must be answered before the first Phase A commit lands so the workflow is consistent.
- Owner: not assigned.
- Action: capture the policy in `DECISION_LOG.md` ADR-003 (sub-decision "Stacked branch policy", follow-up) and reflect it in `NEXT_ACTIONS.md` (the Phase A commit plan) and `PR_TRACKER.md` (PR 2 detail section).
