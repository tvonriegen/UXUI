# TalentHub Session Log

## 2026-07-05 — Session 1

### Goal

- PR 0: create the persistent workflow state tracking system in `docs/workflow/` and update `docs/git/GIT_WORKFLOW.md`.

### Initial Inspection

- Confirmed current branch is `chore/workflow-state`, off base branch `caro-maturana`.
- `git status` shows a clean working tree.
- `docs/workflow/` does not exist yet.
- Read existing docs to align style and conventions:
  - `docs/git/GIT_WORKFLOW.md`
  - `docs/git/COMMIT_CONVENTION.md`
  - `docs/roadmap/ROADMAP.md`
  - `docs/technical/KNOWN_ISSUES.md`
  - `docs/technical/RUNBOOK.md`
  - `docs/technical/REFACTORING_PLAN.md`
- Confirmed PR target base: `caro-maturana` (integration branch).

### Commands Inspected (not executed by the orchestrator)

- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -10`
- `git remote -v`
- `git branch -a`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run install:web`
- `git pull` (failed with SSH `Permission denied (publickey)`; local already in sync with `origin` per status)

### Validation Result

- Status: **passed** (2026-07-05 QA session).
- `npm run lint` ✓ — no ESLint warnings or errors.
- `npm run typecheck` ✓ — `tsc --noEmit` clean.
- `npm run build` ✓ — Next.js 14.2.35 production build compiled successfully, 20/20 static pages generated, no dummy env values required.
- `npm run install:web` reported 21 dependency vulnerabilities on the baseline (not re-run in this session; tracked in `docs/technical/KNOWN_ISSUES.md`).

### Commits

- Local commit `e01cecf chore: add persistent workflow state tracking` created on `chore/workflow-state` after QA validation passed.
- Local commit `f15550b docs: finalize workflow state after PR 0 setup` added on the same branch (`chore/workflow-state`) after PR 0 setup; documentation-only follow-up.
- Push: blocked on SSH credential issue (see `OPEN_QUESTIONS.md`); the local `chore/workflow-state` branch head (carrying both `e01cecf` and `f15550b`) is not yet on `origin`.

### Risks

- New workflow files could drift out of sync with the actual branch and PR state if the discipline to update them on every session is not followed. Mitigation: `docs/git/GIT_WORKFLOW.md` mandates the read/update ritual.
- Validations did run in the QA session and all passed: `npm run lint`, `npm run typecheck`, and `npm run build` were clean. The build only covers the Next.js app, so any malformed workflow doc would only be caught by review, not by the build.
- The SSH `Permission denied (publickey)` issue is environmental and out of scope for this PR; it could delay sharing the PR with reviewers.

### Next Session

- Restore SSH credentials and push the full local branch head of `chore/workflow-state` to `origin` (carries both `e01cecf` and `f15550b`; do **not** push/cherry-pick only `e01cecf`); open PR 0 against `caro-maturana` and update the remote tracking line in this entry.
- If SSH remains blocked, integrate the full local `chore/workflow-state` branch head into `caro-maturana` (both `e01cecf` and `f15550b`, not just `e01cecf`) to unblock PR 1.
- Once PR 0 is integrated into `caro-maturana`, start PR 1: `fix/privacy-contact-routing` from `caro-maturana` (see `NEXT_ACTIONS.md`).

## 2026-07-05 — PR 1 Start

### Goal

- Start PR 1 (`fix/privacy-contact-routing`): create the branch off the locally integrated `caro-maturana`, explore the contact-routing surface area, and update the workflow documentation to reflect that implementation is **blocked** pending the architecture-audit findings.

### Branch

- `fix/privacy-contact-routing`, branched from `caro-maturana` after PR 0 was integrated via fast-forward (`e01cecf`, `f15550b`, `adb64cf` are all reachable from the new base).
- `git status` at session start: clean working tree on `fix/privacy-contact-routing`; HEAD is `adb64cf docs: clarify workflow branch handoff`.

### Actions Run

- **PR 0 integration confirmation.** Verified the local fast-forward of `chore/workflow-state` into `caro-maturana` includes all three commits (`e01cecf`, `f15550b`, `adb64cf`); no commit was dropped.
- **Branch creation.** Created `fix/privacy-contact-routing` from the integrated `caro-maturana`.
- **PR 1 exploration (read-only).** Identified direct contact-surface points to be reworked in PR 1:
  - `apps/web/src/app/talent/page.tsx` — creates conversations on behalf of a company toward candidates (client-side init).
  - `apps/web/src/app/messages/page.tsx` — opens the company↔student conversation route, including the school↔student direct-message path.
  - `apps/web/src/app/actions/interviews.ts` — uses the **admin** Supabase client to create interview proposals, bypassing RLS.
  - Supabase RLS on `conversations` — currently validates only participant membership; it does **not** gate against minor-student contact exposure.
- **Architecture audit.** The architecture-auditor returned a **block** verdict on PR 1 implementation until findings C1–C4 are resolved. Findings (high level):
  - **C1** — `supabase/schema.sql` drifts from `supabase/migrations/`. Pick a canonical source.
  - **C2** — Enforcement must combine strong RLS **and** a server action; the server action alone is insufficient.
  - **C3** — `proposeInterview` uses the admin client and bypasses RLS; remove the bypass.
  - **C4** — `notifications.type` CHECK does not include `contact_request`; must be extended.
  - **M1 / M5 / secondary** — open decisions: `isMinor(role, age) = role === 'Estudiante' && (age === null || age < 18)`; treatment of existing Empresa↔minor conversations; whether the student sees `contact_requests`; notification source (DB trigger vs. server action). See `OPEN_QUESTIONS.md` Q10–Q11 and the secondary block in `NEXT_ACTIONS.md`.

### Files Changed (this session)

- `docs/workflow/STATUS.md` — moved to PR 1, noted branch created and implementation blocked.
- `docs/workflow/NEXT_ACTIONS.md` — replaced the PR 0 immediate list with the PR 1 executable checklist (C1–C4 / M1 / M5); pointed `After Current PR` at a follow-up refactor PR.
- `docs/workflow/SESSION_LOG.md` — added this entry.
- `docs/workflow/PR_TRACKER.md` — PR 0 marked integrated locally (push to `origin` left to the user); PR 1 marked started and blocked by the architecture review, validation not run.
- `docs/workflow/OPEN_QUESTIONS.md` — added Q6–Q11 capturing the architecture-audit findings and PR 1 open decisions.
- No code, RLS, or migration files were touched on `fix/privacy-contact-routing` in this session, by design (block verdict).

### Validation

- Not run. PR 1 makes no code changes in this session; the workflow documentation update is the only diff on the working tree. Lint / typecheck / build were not re-executed because there is nothing to validate yet on `fix/privacy-contact-routing` (and running them would be premature before the architectural decisions are made).

### Risks / Blockers

- **Implementation blocker.** PR 1 cannot start coding until C1–C4 are resolved and M1 / M5 / the secondary decisions are answered. Until then, the only safe edits on this branch are the workflow documentation files (`docs/workflow/**`) and design notes.
- **SSH push still blocked.** The local fast-forward of PR 0 into `caro-maturana` is in place, but the push of the integrated branch head to `origin` is the user's call. Pushing `fix/privacy-contact-routing` is likewise blocked until SSH credentials are restored.
- **Drift risk.** Resolving C1 (schema vs. migrations) must be done before drafting any RLS changes, otherwise the new policies may not match the deployed schema.

### Next Session

- Resolve C1–C4 and answer M1 / M5 / the secondary decisions (see `OPEN_QUESTIONS.md` Q6–Q11 and `NEXT_ACTIONS.md`).
- Once decisions are made, draft the PR 1 implementation plan (RLS policies, server actions, tests), commit on `fix/privacy-contact-routing`, run `npm run lint` / `npm run typecheck` / `npm run build` plus the minor-student routing test, and update `SESSION_LOG.md`, `PR_TRACKER.md`, and `DECISION_LOG.md`.

## 2026-07-05 — PR 1 decision / audit consolidation

### Goal

- Document the architectural decisions that resolve the architecture-auditor's **Aprobar con observaciones** verdict on PR 1, so that implementation can proceed with the auditor's guardrails baked in. Documentation only — no code, no RLS, no migrations, no commit, no push.

### Audit consolidation (2026-07-05)

- Re-read the architecture-auditor's findings (CR-1, CR-2, M-1, M-2, M-3, M-4, M-5, M-6 and the residual implementation questions) and the previously open Q6–Q11 in `OPEN_QUESTIONS.md`.
- Verified verdict: **Aprobar con observaciones**. The auditor's required ajustes imprescindibles are:
  - `proposeInterview` must run entirely through the RLS-constrained / `auth.uid()`-bound client; the admin client is out of scope for the PR 1 contact/interview path (CR-1 / C3).
  - `can_converse` must gate `conversations INSERT` and `messages INSERT`; `conversations SELECT` may remain participant-based for history (CR-2 / C2).
  - `contact_requests` RLS — SELECT for company / school; INSERT for company; UPDATE for company (cancel `pending`) and school (approve / reject); DELETE denied; a minor student does not see `pending` rows in PR 1 (M-1).
  - `SECURITY DEFINER` functions: explicit `search_path`, minimum grants, `STABLE`, no mutations (M-2 / M-8).
  - `contact_requests` indexes: pair/status for `can_converse` lookup; school/status queue (M-3).
  - `schema.sql` alignment for the sections PR 1 touches (C1, M-4).
  - `notifications.metadata jsonb NOT NULL DEFAULT '{}'` with a CHECK that allows `contact_request`; idempotent migration (M-5 / M-7).
  - `is-minor` verification mechanism: choose a concrete mechanism at implementation time (preferred: minimal test if viable; fallback: documented verifiable cases) (M-6).
- Recorded every accepted decision in `DECISION_LOG.md` ADR-002 with sub-decision IDs C1–C4, M1–M8, and the secondary decisions.

### Actions Run

- Authored `DECISION_LOG.md` ADR-002 with the C1–C4, M1–M8, and secondary decisions (status: Accepted, 2026-07-05, branch `fix/privacy-contact-routing`).
- Updated `OPEN_QUESTIONS.md` Q6–Q11 to "Answered" pointers into `DECISION_LOG.md` ADR-002; added a "Residual implementation questions (PR 1)" section with Q12 (test / verification mechanism), Q13 (approval trigger mechanics), and Q14 (`respondInterview` / `cancelInterview` admin-client scope).
- Replaced the "blocked" framing in `NEXT_ACTIONS.md` with a "ready for implementation after committing the decision docs / with guardrails" plan, including a pre-implementation docs-commit gate, the ADR-002 guardrails inlined, and a high-level implementation plan with eleven steps and the validation criteria.
- Updated `STATUS.md` "Current PR / Task", "Current Working State", "Known Breakages", and "Next Recommended Action" to reflect: docs decisions updated, code not yet touched, implementation ready pending explicit implementation approval and/or commit of the docs state.
- Updated `PR_TRACKER.md` PR 1 row in the table to "decision package approved with guardrails / ready for implementation planning"; updated the PR 1 detail section accordingly; corrected the three file paths to `apps/web/src/app/talent/page.tsx`, `apps/web/src/app/messages/page.tsx`, and `apps/web/src/app/actions/interviews.ts`.
- Added a brief "PR 1 Contact Routing Decisions" pointer section to `docs/architecture/SECURITY_MODEL.md` (no implementation details, only the decision references).
- Added this entry to `SESSION_LOG.md`.

### Files Changed (this session)

- `docs/workflow/DECISION_LOG.md` — added ADR-002.
- `docs/workflow/OPEN_QUESTIONS.md` — Q6–Q11 marked answered; added residual implementation questions Q12–Q14.
- `docs/workflow/NEXT_ACTIONS.md` — replaced blocked framing with ready-for-implementation plan and guardrails.
- `docs/workflow/STATUS.md` — updated Current PR / Task, Current Working State, Known Breakages, Next Recommended Action.
- `docs/workflow/SESSION_LOG.md` — added this entry.
- `docs/workflow/PR_TRACKER.md` — PR 1 status updated; file paths corrected.
- `docs/architecture/SECURITY_MODEL.md` — brief decision summary appended.

### Validation

- Not run. Per the task brief, no validations are executed in this session. The uncommitted diff is documentation only.

### Risks / Blockers

- **The decision-documentation state is not yet committed.** Implementation must wait for an explicit implementation approval and / or a commit of the docs state.
- **Residual implementation questions in `OPEN_QUESTIONS.md` (Q12–Q14)** must be resolved in the implementation plan before the code commit lands. They are not blockers for the ADR.
- **SSH push remains blocked** on credentials (`Permission denied (publickey)`).

### Next Session

- Commit the decision-documentation state on `fix/privacy-contact-routing` (docs only) per the pre-implementation gate in `NEXT_ACTIONS.md`.
- Draft the PR 1 implementation plan with the ADR-002 guardrails inlined; resolve Q12–Q14 in the plan.
- Begin implementation per the plan and run `npm run lint` / `npm run typecheck` / `npm run build` plus the chosen verification mechanism. Update `SESSION_LOG.md`, `PR_TRACKER.md`, and `DECISION_LOG.md` as the work lands.

## 2026-07-05 — PR 1 Implementation Pass

### Context

- Branch: `fix/privacy-contact-routing`.
- Start state: clean working tree at `7a2b42f docs: document privacy contact routing decisions`.
- User explicitly approved implementation and requested no commit/push.

### Actions Run

- Added `supabase/migrations/20260705000001_contact_requests.sql` with `contact_requests`, RLS, `is_minor_profile`, `can_converse`, notification metadata/check update, contact request notifications, approval conversation trigger, and conversation/message insert gates.
- Added `apps/web/src/lib/utils/is-minor.ts` and `scripts/verify-is-minor.mjs`; added root `verify:is-minor` script.
- Added `apps/web/src/app/actions/contact-requests.ts` and wired the talent directory plus school dashboard queue to the server actions.
- Refactored `apps/web/src/app/actions/interviews.ts::proposeInterview` to remove admin-client usage from the proposal path. Minor applicants without approved contact create/reuse a pending `contact_requests` row and do not create interview/conversation/message/status updates.
- Updated `supabase/schema.sql` for PR 1 touched sections and documented residual broader snapshot drift.
- Resolved `OPEN_QUESTIONS.md` Q12–Q14 in implementation notes.

### Validation

- `npm run verify:is-minor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` not run in this pass.

### Risks / Follow-up

- Apply the new migration to a Supabase instance and QA RLS paths: company minor request insert, school approve/reject, conversation reuse/create on approval, message soft-lock before approval, and direct non-minor contact.
- `respondInterview` / `cancelInterview` still use the admin client and remain out of PR 1 scope; schedule a follow-up admin-client review.
- Broader schema snapshot drift remains outside PR 1 touched sections.

## 2026-07-05 — PR 1 QA + Security Pass

### Context

- Branch: `fix/privacy-contact-routing`.
- Working tree at the start: uncommitted PR 1 implementation from the previous session.
- Goal: complete the local QA matrix (build), run a security review of the uncommitted diff, fix any findings, document the verdict, and surface the recommended commit grouping. No commit / push.

### Commands Run (local)

- `npm run verify:is-minor` — 7/7 canonical cases pass (`Estudiante` unknown age, under 18, 18+, adult, `Egresado`, `Empresa`, `Colegio`).
- `npm run lint` — pass, no warnings / errors.
- `npm run typecheck` — pass, `tsc --noEmit` clean.
- `npm run build` — pass, Next.js 14.2.35 production build compiled successfully, all static pages generated, no dummy env values required.

### Security Review

- Initial review surfaced two findings:
  - **B1 — BLOCKER.** The pre-existing `profiles_update` policy allowed an authenticated client to `UPDATE` `profiles.role` and `profiles.age` directly, which would silently bypass the PR 1 minor-routing logic. A TS check on the server action is not a security boundary; the column write has to be locked at the database.
  - **M1 — HIGH.** The talent directory page selected the `email` column for every public row, which leaked the student's direct contact data on the public route. Out of scope for a strict interpretation of the PR 1 server-action / RLS work, but the same threat surface, so fixed in the same pass.
- B1 fix: added `trg_fn_profiles_guard_role_age()` BEFORE UPDATE trigger on `profiles` that raises if `NEW.role` / `NEW.age` change while `COALESCE(auth.role(), '') <> 'service_role'`. Replaced the permissive `profiles_update` policy with one that uses both `USING (auth.uid() = id)` and `WITH CHECK (auth.uid() = id)`. Both pieces ship in the same migration as the rest of the PR 1 changes.
- M1 fix: removed `email` from the talent directory `profiles.select(...)` (`apps/web/src/app/talent/page.tsx`).
- Follow-up review after the fixes: **APROBAR, sin BLOCKER / HIGH**. No new findings. `proposeInterview` and the new `contact-requests` server actions use the RLS-constrained `auth.uid()`-bound client only; `can_converse` and the approval-time trigger gate the message / conversation flow; `SECURITY DEFINER` helpers declare `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC`, and (where read-only) `STABLE`.

### Files Changed (categories, this pass)

- **DB migration** (new): `supabase/migrations/20260705000001_contact_requests.sql` (now also includes the B1 trigger and the tightened `profiles_update` policy).
- **DB schema snapshot** (modified): `supabase/schema.sql` (PR 1 touched sections; B1 trigger / policy included).
- **Server actions** (new): `apps/web/src/app/actions/contact-requests.ts` (`requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest`).
- **Server actions** (modified): `apps/web/src/app/actions/interviews.ts` (`proposeInterview` refactor, admin client removed from the proposal path).
- **Shared helper** (new): `apps/web/src/lib/utils/is-minor.ts`.
- **Verify script** (new): `scripts/verify-is-minor.mjs`; root script `verify:is-minor` in `package.json`.
- **UI** (modified): `apps/web/src/app/talent/page.tsx` (server-action call, `email` removed from the client select as the M1 fix), `apps/web/src/components/dashboard/DashboardColegio.tsx` (school approve / reject queue).
- **Docs** (modified): `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md` (this entry), `PR_TRACKER.md`, `OPEN_QUESTIONS.md`, `DECISION_LOG.md` (ADR-002 implementation note), `docs/architecture/SECURITY_MODEL.md`, `docs/requirements/TRACEABILITY_MATRIX.md`, `docs/technical/KNOWN_ISSUES.md`.

### Risks / Follow-up (after the QA + Security pass)

- Runtime Supabase migration / RLS / trigger verification on a live instance is **not** a blocker for merge / commit, but is a recommended follow-up: apply `20260705000001_contact_requests.sql` to a Supabase instance and exercise company minor insert, school approve / reject, conversation reuse / create on approval, message soft-lock before approval, direct non-minor contact, and the B1 trigger rejecting a non-service `profiles.role` / `profiles.age` update.
- `respondInterview` / `cancelInterview` still use the admin client and remain out of PR 1 scope; schedule a follow-up admin-client review (already tracked in `OPEN_QUESTIONS.md` Q14 and `KNOWN_ISSUES.md`).
- Broader schema snapshot drift (`supabase/schema.sql` vs. `supabase/full_reset.sql` vs. older migrations) remains outside PR 1 touched sections; tracked in `KNOWN_ISSUES.md`.

### Next Session

- User reviews the uncommitted diff; optionally splits into the six atomic commit groups listed in `NEXT_ACTIONS.md` (Immediate) and `STATUS.md` (Next Recommended Action). Push to `origin` is the user's call; SSH credentials are still blocked.
- Schedule the runtime Supabase smoke test as a follow-up before merge / deploy (not a blocker).
