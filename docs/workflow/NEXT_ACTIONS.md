# TalentHub Next Actions
## Immediate (PR 2 — `refactor/feature-boundaries`, stacked on `fix/privacy-contact-routing`; being synced against `origin/caro-maturana` after the privacy PR #2 merge)

PR 2 Phase A is complete locally and Phase B presentational splits are complete locally on `refactor/feature-boundaries` (HEAD `c3dead6 docs: define PR 2 feature boundary architecture` at the start of the Phase A service pass). The detailed plan lives in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`. This continuation keeps the scope to service extraction, contact-routing UI extraction, and small route-local presentational components; no schema, RLS, migration, `supabase/`, `apps/web/src/app/api/`, `profile/page.tsx`, UI redesign, dependency, commit, or push.

**Privacy PR #2 status (2026-07-12).** GitHub PR **#2** (the privacy PR, `https://github.com/tvonriegen/UXUI/pull/2`) was **merged to `caro-maturana`** on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`. The merge brought in the PR 1 implementation on `fix/privacy-contact-routing` (HEAD `7a881f6`) and the PR 1B interview privacy RLS hardening (`8f39ce63b67f43f11d5dd49a23d28876c4413d05 fix(security): enforce interview privacy at RLS`, including `supabase/migrations/20260705000002_interviews_privacy_rls.sql`, `scripts/verify-interviews-privacy-rls.mjs`, and the PR 1B-touched `supabase/schema.sql` sections). Security review verdict after the B1 and M1 fixes (2026-07-05): **APROBAR, sin BLOCKER / HIGH**. The external `Vercel` GitHub check on PR #2 was failing at the time of merge; the failure is now **historical for PR #2** and remains tracked in `KNOWN_ISSUES.md` (External deployment issues) and `OPEN_QUESTIONS.md` Q16. **The mandatory follow-up needed before promoting `caro-maturana` → `main` is the hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — this is **not** the INSERT/immutable trigger correction (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger on identity columns), which is already applied in PR 1B; structural verification (`npm run verify:interviews-privacy-rls`) passed locally, and the runtime Supabase staging smoke test is a **follow-up before `main`**, not a blocker for the privacy PR merge (see `OPEN_QUESTIONS.md` Q15). **`main` is not asserted as updated** in this workflow state.

**PR 2 branch posture (2026-07-12).** `refactor/feature-boundaries` was originally cut from `fix/privacy-contact-routing` while the privacy PR #2 was held by the external Vercel check. With the privacy PR #2 now merged to `caro-maturana`, the technical PR 2 branch is being synced against the new `caro-maturana` HEAD via a **merge sync** (the privacy PR #2 brought in PR 1 + PR 1B code and migrations, plus documentation); the technical PR 2 itself remains stacked and uncommitted on the local branch, and is **not** asserted as merged. The user accepted the stacked-branch approach (2026-07-05). The architecture pass recorded the posture in `DECISION_LOG.md` ADR-003 and in `OPEN_QUESTIONS.md` Q18 (retarget / rebase policy). This implementation pass stages only the service-boundary Phase A subset authorized by the user.

**Architect verdict (2026-07-05).** Aprobar con observaciones for the plan and the docs. Phase A Gate 2 is resolved by owner instruction: keep the no-new-dependency `verify:*` pattern and add `verify:contact-policy`. Sub-decisions recorded in `DECISION_LOG.md` ADR-003: stacked branch policy (accepted), test mechanism (accepted), ProfilePage deep split deferred, no schema / RLS / migration / dependency changes.

### Immediate actions (PR 2 architecture setup — this pass)

1. **Created the PR 2 architecture entry point.** `docs/architecture/PR2_FEATURE_BOUNDARIES.md` (new). Goals, non-goals, target folder tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, commit plan, gate conditions, deferred work, risk register, open decisions, references.
2. **Updated the codebase map.** `docs/architecture/CODEBASE_MAP.md` now lists the PR 1 contact-routing additions (committed and pushed to `fix/privacy-contact-routing`) and the PR 2 planned boundaries (architecture only). High-risk file list includes line counts (2026-07-05) and PR 2 phase mapping.
3. **Updated the refactoring plan.** `docs/technical/REFACTORING_PLAN.md` now includes Phase 4 (PR 2 phases A / B with gate conditions) and Phase 5 (follow-up chore PRs). ProfilePage deep split is explicitly deferred.
4. **Updated the workflow state.** `docs/workflow/STATUS.md` now reads `refactor/feature-boundaries` as the current branch and PR 2 architecture planning as the current phase, with the privacy PR #2 merge to `caro-maturana` reflected.
5. **Updated the next actions.** This file.
6. **Updated the PR tracker.** `docs/workflow/PR_TRACKER.md` PR 2 row: status = architecture planning in progress / stacked on PR 1; base = `fix/privacy-contact-routing` until PR #2 lands. Detail section expanded.
7. **Updated the session log.** `docs/workflow/SESSION_LOG.md` PR 2 architecture setup entry added.
8. **Updated the decision log.** `docs/workflow/DECISION_LOG.md` ADR-003 added.
9. **Updated the open questions.** `docs/workflow/OPEN_QUESTIONS.md` Q17 (test mechanism) and Q18 (retarget / rebase policy) added.
10. **Updated the traceability matrix.** `docs/requirements/TRACEABILITY_MATRIX.md` PR 2 added as a technical-enabler row (no functional requirement change).

### Immediate actions (PR 2 — current continuation)

1. **Review the full local PR 2 diff.** It now includes Phase A services, Phase A contact-routing UI, and Phase B presentational splits only.
2. **Commit is still the user's call.** This pass stages code and docs only; no commit and no push were performed.
3. **Open PR 2 against `fix/privacy-contact-routing`** (not `caro-maturana`) per the stacked branch policy if/when the user asks. The PR base will be retargeted to `caro-maturana` after the privacy PR #2 has fully landed; see `OPEN_QUESTIONS.md` Q18. `package.json` script-ordering (between `verify:contact-policy` and `verify:interviews-privacy-rls`) is outside the docs-only allowlist and is the owner's call.
4. **Phase A implemented locally.** Landed pieces: `lib/services/conversations.ts`, `lib/services/contact-policy.ts`, `lib/services/contact-requests.ts`, thin `app/actions/contact-requests.ts`, `verify:contact-policy`, `ContactRequestQueue`, `useContactTalent`, `ContactTalentButton`, and `contact-routing/types.ts`.
5. **Phase B presentational implemented locally.** Landed pieces: `app/muro/_components/MuroHeader.tsx`, `app/empleos/_components/CompanyStatsGrid.tsx`, `app/administracion/_components/AdminHeader.tsx`, and `AdminTabs.tsx`. No fetch, mutation, server action, or Supabase logic moved.

**Runtime Supabase staging migration smoke test (follow-up before `main`, not a blocker for the privacy PR merge).** Apply `supabase/migrations/20260705000001_contact_requests.sql` and `supabase/migrations/20260705000002_interviews_privacy_rls.sql` to a Supabase **staging** instance and exercise, at minimum:

- Company minor contact request insert (RLS accepts) and direct non-minor contact path.
- `profiles.role` / `profiles.age` direct update from a non-service role is rejected (B1 fix); update from a service role succeeds.
- School approve path opens / reuses the company↔student conversation and unlocks message inserts.
- School reject path closes the request and the `contact_request` notification is emitted by the trigger (not the server action).
- Message soft-lock holds before approval: `messages INSERT` between a company and a minor student without an approved `contact_request` is denied.
- PR 1B: a company can still propose an interview for its own application; direct inserts with swapped `student_id`, wrong `company_id`, non-`proposed` status, or applications from another company are rejected; immutable columns on `interviews` cannot be mutated by an UPDATE.

This is tracked as the **`interviews.status` UPDATE transition hardening follow-up before `main`** (a policy UPDATE on `interviews` that gates status transitions; **not** the INSERT/immutable trigger correction already applied in PR 1B) and is the gate for promoting `caro-maturana` → `main` (not a blocker for the privacy PR #2 merge, which already happened on 2026-07-12).

### Guardrails baked into PR 2 (from ADR-003 + the architect verdict)

- **No schema / RLS / migration changes.** Privacy guarantee remains at the database layer (RLS + DB trigger + `can_converse`) per `DECISION_LOG.md` ADR-002. PR 2 only moves code, not data guarantees.
- **No behavior / UI changes.** PR 2 is a refactor. The company → minor contact request still creates or reuses a `contact_requests` row in `pending`; the school approve / reject queue still drives the same flow; the talent page CTA still calls the same server action; `proposeInterview` still does not use the admin client.
- **No ProfilePage deep split.** `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) is the largest single file in the repo. A meaningful role-aware split is a dedicated PR (PR 3 or later), not PR 2. PR 2 may extract a small, low-risk presentational fragment from it only if it lands without changing the render path or the data contract.
- **Server action public exports stay byte-identical.** `requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest` keep their names, parameter order, and return shapes. Internal body shrinks as it delegates to `lib/services/contact-requests.ts` and `lib/services/conversations.ts`.
- **No new dependencies.** Gate 2 uses the PR 1 `verify:*` script pattern (`verify:contact-policy`) and does not add Vitest/Jest or other dependencies.
- **Stacked branch policy.** PR 2 PR base = `fix/privacy-contact-routing` until the technical PR 2 is retargeted / rebased; the privacy PR #2 is already merged to `caro-maturana`, so the retarget / rebase procedure is the live open question (`OPEN_QUESTIONS.md` Q18). The merge sync of `refactor/feature-boundaries` against `origin/caro-maturana` does not decide this question; it is left to the owner.

### Validation criteria (PR 2 implementation, when Gate 2 is resolved)

- `npm run verify:is-minor` ✓ (PR 1; still green).
- `npm run verify:contact-policy` ✓ (Phase A Gate 2, no-dependency script).
- `npm run typecheck` ✓.
- `npm run lint` ✓.
- `npm run build` ✓ (no dummy env).
- If a test runner was accepted (Gate 2 option a): the corresponding test command passes on `lib/services/contact-policy.ts` (pure decision), `lib/services/conversations.ts` (`ensureConversation` reuse / race-recovery with a fake client), and `lib/services/contact-requests.ts` (the service wrapper used by the server action).
- Public exports of `apps/web/src/app/actions/contact-requests.ts` byte-identical to PR 1 HEAD.
- No changes to `supabase/migrations/`, `supabase/schema.sql`, RLS policies, or `apps/web/src/app/api/`.
- Documentation updated as commits land.
- Privacy PR #2 already merged to `caro-maturana` (merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`, including PR 1B `8f39ce6`); the technical PR 2 stacks on top and does not regress any privacy guarantee.

## After Current PR

- **PR 3 (planned, not started).** ProfilePage deep split — `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) split by role (Estudiante / Egresado / Empresa / Colegio). Deferred from PR 2 by the architect verdict. Tracked in `OPEN_QUESTIONS.md` (follow-up) and a future row in `PR_TRACKER.md`. Branch from `caro-maturana` after PR 2 lands and is retargeted.
- **Follow-up chore PRs (tracked separately).** Dependency vulnerability triage (21 vulnerabilities from `npm run install:web`); broader schema snapshot drift; `respondInterview` / `cancelInterview` admin-client review; runtime Supabase migration / RLS / trigger smoke test for PR 1. None are PR 2 deliverables.

## Blocked

- **Vercel check on the privacy PR #2 is historical for PR #2 (the PR is merged) — the external Vercel project is still owned by a teammate / partner's GitHub account.** The `Vercel` GitHub check on PR #2 was failing at the time of merge; the failure is now **historical for PR #2** and the PR is merged to `caro-maturana`. The Vercel project is still owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). Owner action: teammate / project owner should still run the inspect command, share the build logs, fix the build if actionable, or grant the user access — this is recommended for future PRs, not a current blocker. Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16 (answered; merge policy was option (a)).
- **Push to `origin` is blocked.** SSH authentication fails with `Permission denied (publickey)`. The push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier; further pushes remain blocked until credentials are restored.
- **`npm run install:web` reports 21 dependency vulnerabilities** on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
