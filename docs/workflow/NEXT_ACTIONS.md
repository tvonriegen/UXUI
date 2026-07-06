# TalentHub Next Actions
## Immediate (PR 2 — `refactor/feature-boundaries`, stacked on `fix/privacy-contact-routing`)

PR 2 architecture is staged on disk on `refactor/feature-boundaries` (HEAD `c795e14 docs: record external Vercel blocker for PR 1` at the start of this pass). The detailed plan lives in `docs/architecture/PR2_FEATURE_BOUNDARIES.md` (new). No code, RLS, migration, helper, UI, or `package.json` file was touched in this pass. The user must explicitly ask before any further commit / push.

**PR 2 branch posture.** `refactor/feature-boundaries` is a stacked branch cut from `fix/privacy-contact-routing` because PR #2 against `caro-maturana` is held by the external Vercel check. The user has accepted this approach (2026-07-05). The architecture pass records the posture in `DECISION_LOG.md` ADR-003 and in `OPEN_QUESTIONS.md` Q18 (retarget / rebase policy). No code lands in this pass.

**Architect verdict (2026-07-05).** Aprobar con observaciones for the plan and the docs. BLOQUEAR implementation until the gate conditions in `PR2_FEATURE_BOUNDARIES.md` are met. Sub-decisions recorded in `DECISION_LOG.md` ADR-003: stacked branch policy (accepted), test mechanism (open — `OPEN_QUESTIONS.md` Q17), ProfilePage deep split deferred, no schema / RLS / migration / `package.json` dependency changes.

### Immediate actions (PR 2 architecture setup — this pass)

1. **Created the PR 2 architecture entry point.** `docs/architecture/PR2_FEATURE_BOUNDARIES.md` (new). Goals, non-goals, target folder tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, commit plan, gate conditions, deferred work, risk register, open decisions, references.
2. **Updated the codebase map.** `docs/architecture/CODEBASE_MAP.md` now lists the PR 1 contact-routing additions (committed and pushed to `fix/privacy-contact-routing`) and the PR 2 planned boundaries (architecture only). High-risk file list includes line counts (2026-07-05) and PR 2 phase mapping.
3. **Updated the refactoring plan.** `docs/technical/REFACTORING_PLAN.md` now includes Phase 4 (PR 2 phases A / B with gate conditions) and Phase 5 (follow-up chore PRs). ProfilePage deep split is explicitly deferred.
4. **Updated the workflow state.** `docs/workflow/STATUS.md` now reads `refactor/feature-boundaries` as the current branch and PR 2 architecture planning as the current phase.
5. **Updated the next actions.** This file.
6. **Updated the PR tracker.** `docs/workflow/PR_TRACKER.md` PR 2 row: status = architecture planning in progress / stacked on PR 1; base = `fix/privacy-contact-routing` until PR #2 lands. Detail section expanded.
7. **Updated the session log.** `docs/workflow/SESSION_LOG.md` PR 2 architecture setup entry added.
8. **Updated the decision log.** `docs/workflow/DECISION_LOG.md` ADR-003 added.
9. **Updated the open questions.** `docs/workflow/OPEN_QUESTIONS.md` Q17 (test mechanism) and Q18 (retarget / rebase policy) added.
10. **Updated the traceability matrix.** `docs/requirements/TRACEABILITY_MATRIX.md` PR 2 added as a technical-enabler row (no functional requirement change).

### Immediate actions (PR 2 — what the user should do next, in order)

1. **Review and accept the PR 2 architecture.** Read `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and `DECISION_LOG.md` ADR-003. Confirm:
   - Stacked branch policy (cut from `fix/privacy-contact-routing`; PR 2 PR base = `fix/privacy-contact-routing` until PR #2 lands).
   - Phase A scope (the five low-risk extractions around the PR 1 contact-routing flow).
   - Phase B (optional, only if Phase A is small and green) — route-local presentational splits for `muro`, `empleos`, `administracion`.
   - ProfilePage deep split is explicitly deferred to a dedicated PR (PR 3 or later).
   - No schema / RLS / migration / `package.json` dependency changes except a minimal pure-service test runner if explicitly approved.
2. **Pick a test mechanism (Gate 2).** Open: `OPEN_QUESTIONS.md` Q17. The architect requires a safety net before moving privacy-sensitive code. Two acceptable options:
   - **(a)** Accept a minimal pure-service test runner (e.g. `node --test`, `vitest` with no new dependencies, or another low-friction choice). The choice and the justification are recorded in `DECISION_LOG.md` ADR-003 sub-decision "Test mechanism".
   - **(b)** Keep the PR 1 `verify:*` script approach and add `verify:contact-policy` for the canonical cases of the new `contact-policy` pure decision function. No new `package.json` dependency.
3. **Commit the PR 2 architecture docs.** Stage `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and the workflow / architecture updates; commit on `refactor/feature-boundaries` with a `docs:` prefix per `docs/git/COMMIT_CONVENTION.md`. Push to `origin/refactor/feature-boundaries` once SSH credentials are restored (or wait for the user to push).
4. **Open PR 2 against `fix/privacy-contact-routing`** (not `caro-maturana`) per the stacked branch policy. The PR base will be retargeted to `caro-maturana` after PR #2 lands; see `OPEN_QUESTIONS.md` Q18.
5. **Once Gate 2 is resolved: implement Phase A.** Follow the commit plan in `PR2_FEATURE_BOUNDARIES.md` (five atomic commits, in order):
   1. `refactor(web): move ensureConversation to lib/services/conversations.ts`.
   2. `refactor(web): extract contact-policy pure decision logic`.
   3. `refactor(web): route contact-requests server action through services`.
   4. `refactor(web): extract ContactRequestQueue presentational component`.
   5. `refactor(web): encapsulate talent page contact CTA in hook and component`.
   If a verification script is added (e.g. `verify:contact-policy`), it lands as a separate `chore` commit on top, not folded into the refactor commits.
6. **Update the workflow files as Phase A lands.** `docs/workflow/SESSION_LOG.md`, `docs/workflow/PR_TRACKER.md`, `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, and `docs/requirements/TRACEABILITY_MATRIX.md` reflect the actual diff at each commit.
7. **If Phase A is small and green: consider Phase B (optional).** Three independent commits, one per route. Each route is its own revertible unit.

### Guardrails baked into PR 2 (from ADR-003 + the architect verdict)

- **No schema / RLS / migration changes.** Privacy guarantee remains at the database layer (RLS + DB trigger + `can_converse`) per `DECISION_LOG.md` ADR-002. PR 2 only moves code, not data guarantees.
- **No behavior / UI changes.** PR 2 is a refactor. The company → minor contact request still creates or reuses a `contact_requests` row in `pending`; the school approve / reject queue still drives the same flow; the talent page CTA still calls the same server action; `proposeInterview` still does not use the admin client.
- **No ProfilePage deep split.** `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) is the largest single file in the repo. A meaningful role-aware split is a dedicated PR (PR 3 or later), not PR 2. PR 2 may extract a small, low-risk presentational fragment from it only if it lands without changing the render path or the data contract.
- **Server action public exports stay byte-identical.** `requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest` keep their names, parameter order, and return shapes. Internal body shrinks as it delegates to `lib/services/contact-requests.ts` and `lib/services/conversations.ts`.
- **No new `package.json` dependencies by default.** A minimal pure-service test runner is a recommendation, not an assumption; the decision is captured in `OPEN_QUESTIONS.md` Q17 and `DECISION_LOG.md` ADR-003.
- **Stacked branch policy.** PR 2 PR base = `fix/privacy-contact-routing` until PR #2 lands; retarget / rebase to `caro-maturana` after PR #2 lands. `OPEN_QUESTIONS.md` Q18.

### Validation criteria (PR 2 implementation, when Gate 2 is resolved)

- `npm run verify:is-minor` ✓ (PR 1; still green).
- `npm run verify:contact-policy` ✓ (Phase A Gate 2, if added).
- `npm run typecheck` ✓.
- `npm run lint` ✓.
- `npm run build` ✓ (no dummy env).
- If a test runner was accepted (Gate 2 option a): the corresponding test command passes on `lib/services/contact-policy.ts` (pure decision), `lib/services/conversations.ts` (`ensureConversation` reuse / race-recovery with a fake client), and `lib/services/contact-requests.ts` (the service wrapper used by the server action).
- Public exports of `apps/web/src/app/actions/contact-requests.ts` byte-identical to PR 1 HEAD.
- No changes to `supabase/migrations/`, `supabase/schema.sql`, RLS policies, or `apps/web/src/app/api/`.
- Documentation updated as commits land.

## After Current PR

- **PR 3 (planned, not started).** ProfilePage deep split — `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) split by role (Estudiante / Egresado / Empresa / Colegio). Deferred from PR 2 by the architect verdict. Tracked in `OPEN_QUESTIONS.md` (follow-up) and a future row in `PR_TRACKER.md`. Branch from `caro-maturana` after PR 2 lands and is retargeted.
- **Follow-up chore PRs (tracked separately).** Dependency vulnerability triage (21 vulnerabilities from `npm run install:web`); broader schema snapshot drift; `respondInterview` / `cancelInterview` admin-client review; runtime Supabase migration / RLS / trigger smoke test for PR 1. None are PR 2 deliverables.

## Blocked

- **Vercel check on PR #2 is failing — external / out-of-this-workspace blocker.** The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). Owner action: teammate / project owner must inspect / fix Vercel or grant access. Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16.
- **PR 2 implementation is gated on Gate 2 (test mechanism).** Until the owner picks a test mechanism (`OPEN_QUESTIONS.md` Q17), Phase A code cannot land. The architecture pass does not require Gate 2 to be resolved; only the implementation pass does.
- **Push to `origin` is blocked.** SSH authentication fails with `Permission denied (publickey)`. The push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier; further pushes remain blocked until credentials are restored.
- **`npm run install:web` reports 21 dependency vulnerabilities** on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
