# TalentHub Workflow Status

## Current Branch

- `refactor/feature-boundaries`

## Current Phase

- PR 2 — `refactor: split high-risk feature pages into modules` (Phase A complete locally; Phase B presentational splits complete locally; validation green). A merge from `origin/caro-maturana` is in progress on this branch to sync the privacy PR #2 that landed on `caro-maturana` (merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`); the technical PR 2 itself remains stacked and uncommitted on the local branch.

## Current PR / Task

- Task: `refactor: split high-risk feature pages into modules`.
- Scope: decompose the high-risk feature pages surfaced by the PR 1 architecture review (`profile`, `muro`, `empleos`, `administracion`, `messages`, `DashboardColegio`, `talent`, `apps/web/src/app/actions/contact-requests.ts`) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable.
- **Stacked branch posture (evolving, 2026-07-12).** `refactor/feature-boundaries` was originally cut from `fix/privacy-contact-routing` while GitHub PR **#2** (the privacy PR) was held by the external Vercel check. GitHub PR #2 has since been **merged to `caro-maturana`** with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f` (which brought in `8f39ce6 fix(security): enforce interview privacy at RLS` as part of the merge). This `STATUS.md` resolution reflects the **merge sync** of `refactor/feature-boundaries` against that new `caro-maturana` HEAD; the technical PR 2 is **not** asserted as merged and `main` is **not** asserted as updated. The stacked branch policy and the retarget / rebase procedure remain in `DECISION_LOG.md` ADR-003 and `OPEN_QUESTIONS.md` Q18.
- **Status: Phase A complete locally; Phase B presentational split complete locally.** This branch now includes the Phase A service extraction, Phase A contact-routing UI extraction, and small Phase B presentational components for `muro`, `empleos`, and `administracion`. No RLS, migration, `supabase/`, `apps/web/src/app/api/`, `profile/page.tsx`, UI redesign, commit, or push.
- **Architect verdict (2026-07-05):** Aprobar con observaciones for plan / docs. Phase A Gate 2 is resolved by owner instruction with the no-new-dependency `verify:contact-policy` script. Sub-decisions: stacked branch policy (accepted), test mechanism (accepted), ProfilePage deep split deferred, no schema / RLS / dependency changes.
- **Phase A complete locally.** `ensureConversation` moved to `lib/services/conversations.ts`; `contact-policy` pure decision logic extracted; the `requestContactWithTalent` dedup / insert path wrapped in `lib/services/contact-requests.ts` without `next/cache` / `next/headers` imports; server action public exports stay byte-identical; `ContactRequestQueue`, `useContactTalent`, and `ContactTalentButton` extracted without user-visible CTA changes.
- **Phase B presentational complete locally.** `muro` now has `MuroHeader`; `empleos` now has `CompanyStatsGrid`; `administracion` now has `AdminHeader` and `AdminTabs`. No Supabase logic, server actions, mutations, or route behavior moved.
- **ProfilePage deep split is explicitly deferred** to a dedicated PR (PR 3 or later). PR 2 may only extract a small, low-risk presentational fragment from `profile/page.tsx` if it lands without changing the render path or the data contract.

## Last Completed Work

- PR 0 (`chore/workflow-state`) was **integrated locally into `caro-maturana` via fast-forward** on 2026-07-05. The full local branch head — including `e01cecf`, `f15550b`, and the final docs touch-up `adb64cf docs: clarify workflow branch handoff` — is now reachable from `caro-maturana`. PR 0 itself was validated before integration (`npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓ — 2026-07-05 QA session).
- **2026-07-12 — GitHub PR #2 (privacy) merged to `caro-maturana`.** PR **#2** (`https://github.com/tvonriegen/UXUI/pull/2`, `fix: privacy contact routing (minor students via school)`) was merged to `caro-maturana` on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`. The merge brought in the PR 1 implementation on `fix/privacy-contact-routing` (HEAD `7a881f6 docs: record privacy contact routing implementation`) and the PR 1B interview privacy RLS hardening (`8f39ce6 fix(security): enforce interview privacy at RLS`, including `supabase/migrations/20260705000002_interviews_privacy_rls.sql`, `scripts/verify-interviews-privacy-rls.mjs`, and the PR 1B-touched `supabase/schema.sql` sections). Security review verdict after the B1 and M1 fixes: **APROBAR, sin BLOCKER / HIGH**. The external `Vercel` GitHub check on PR #2 was failing at the time of merge; that failure is now **historical for PR #2** and remains tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16. The PR 1B INSERT/immutable-trigger correction (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger on identity columns) is already applied in `supabase/migrations/20260705000002_interviews_privacy_rls.sql`. The follow-up needed before promoting `caro-maturana` → `main` is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`), which is **not** the INSERT/immutable trigger correction; the runtime Supabase staging smoke test for both PR 1 migrations remains a **follow-up before `main`**, not done in this pass. `main` is **not** asserted as updated here; that is a separate owner action.
- The PR 2 architecture setup landed on `refactor/feature-boundaries` (HEAD `c3dead6 docs: define PR 2 feature boundary architecture`). This pass stages the Phase A service-boundary implementation and updates workflow / architecture docs. No commit, no push on the technical PR 2.

## Current Working State

- Branch `refactor/feature-boundaries` started this continuation with uncommitted Phase A service-boundary changes. Stacked on `fix/privacy-contact-routing` HEAD `7a881f6`; PR 2 docs commit `c3dead6` is on this branch.
- A merge from `origin/caro-maturana` is in progress on this branch to sync the privacy PR #2 that landed on `caro-maturana` (merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`, including the PR 1B RLS commit `8f39ce63b67f43f11d5dd49a23d28876c4413d05`). Only the allowlisted documentation files are being edited by this resolution; `package.json`, `apps/web`, `supabase`, and `scripts` are not in scope and are left to the owner.
- Code and script files changed on disk (no commit yet):
  - **Added:** `apps/web/src/lib/services/conversations.ts`.
  - **Added:** `apps/web/src/lib/services/contact-policy.ts`.
  - **Added:** `apps/web/src/lib/services/contact-requests.ts`.
  - **Updated:** `apps/web/src/app/actions/contact-requests.ts`.
  - **Added:** `apps/web/src/components/contact-routing/types.ts`.
  - **Added:** `apps/web/src/components/contact-routing/ContactRequestQueue.tsx`.
  - **Added:** `apps/web/src/components/contact-routing/ContactTalentButton.tsx`.
  - **Added:** `apps/web/src/lib/hooks/useContactTalent.ts`.
  - **Updated:** `apps/web/src/components/dashboard/DashboardColegio.tsx`.
  - **Updated:** `apps/web/src/app/talent/page.tsx`.
  - **Added:** `apps/web/src/app/muro/_components/MuroHeader.tsx`.
  - **Updated:** `apps/web/src/app/muro/page.tsx`.
  - **Added:** `apps/web/src/app/empleos/_components/CompanyStatsGrid.tsx`.
  - **Updated:** `apps/web/src/app/empleos/page.tsx`.
  - **Added:** `apps/web/src/app/administracion/_components/AdminHeader.tsx`.
  - **Added:** `apps/web/src/app/administracion/_components/AdminTabs.tsx`.
  - **Updated:** `apps/web/src/app/administracion/page.tsx`.
  - **Added:** `scripts/verify-contact-policy.mjs`.
  - **Updated:** `package.json` with root `verify:contact-policy` script only; no dependency changes. (`package.json` is **not** edited by this docs-only resolution.)
- Documentation updated in this continuation: `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, `docs/workflow/PR_TRACKER.md`, `docs/workflow/SESSION_LOG.md`, `docs/workflow/OPEN_QUESTIONS.md`, and `docs/requirements/TRACEABILITY_MATRIX.md`.
- Validation run locally after Phase A UI / Phase B presentational extraction: `npm run verify:is-minor` ✓, `npm run verify:contact-policy` ✓, `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓.
- Privacy PR 1 / PR 1B commits reachable from `caro-maturana` (post-merge): `bfbe3d5 feat(db): add mediated contact requests RLS`, `7843e1b feat(web): add minor contact policy helper`, `0bf3ecc feat(web): add school-mediated contact flow`, `4a86621 refactor(web): route interview proposals through privacy checks`, `62b7f56 chore(db): align schema snapshot for contact routing`, `7a881f6 docs: record privacy contact routing implementation`, `8f39ce6 fix(security): enforce interview privacy at RLS` (PR 1B), and the merge commit `6f2be0f` to `caro-maturana`.

## Known Breakages

- **Privacy PR #2 Vercel check — historical, not a current blocker.** The `Vercel` GitHub check on PR #2 was failing externally at the time of merge; the merge to `caro-maturana` was performed with the failing check recorded as a known issue. That failure is now **historical for PR #2** and remains tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16. The runtime Supabase staging smoke test for `supabase/migrations/20260705000001_contact_requests.sql` and `supabase/migrations/20260705000002_interviews_privacy_rls.sql` is a **follow-up before `main`**, not a blocker for the privacy PR merge; see `OPEN_QUESTIONS.md` Q15.
- **Gate 2 resolved.** `verify:contact-policy` is the selected no-new-dependency safety net for the Phase A service-boundary work.
- Git pull over SSH failed with `Permission denied (publickey)` against `origin`; local is in sync with `origin` per `git status` and the push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier. Future pushes are still blocked until SSH credentials are restored.
- 21 dependency vulnerabilities reported by `npm run install:web` on the baseline branch (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Historical migrations still include old project naming in comments only (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Broader historical schema snapshot drift remains between `supabase/schema.sql`, `supabase/full_reset.sql`, and older migrations; PR 1 updated touched sections only. Tracked in `docs/technical/KNOWN_ISSUES.md`. Out of PR 2 scope per `PR2_FEATURE_BOUNDARIES.md`.
- Runtime Supabase migration / RLS / trigger behavior was not exercised on a live Supabase staging instance in the privacy PR 1 / PR 1B pass (the new migrations in `supabase/migrations/20260705000001_contact_requests.sql` and `supabase/migrations/20260705000002_interviews_privacy_rls.sql` are unverified at runtime). Local validations passed. The runtime smoke test is a **recommended follow-up before `main`**, not a blocker for the privacy PR merge. The PR 1B INSERT/immutable-trigger correction (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger on identity columns) is in `supabase/migrations/20260705000002_interviews_privacy_rls.sql`; structural verification via `npm run verify:interviews-privacy-rls` passed locally. The **follow-up before `main`** is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — not the already-applied INSERT/immutable trigger correction.

## Next Recommended Action

- **Technical PR 2 (`refactor/feature-boundaries`) is staged locally on a stacked branch, with a merge sync from `origin/caro-maturana` in progress to sync the privacy PR #2 that landed there.** The technical PR 2 is **not** asserted as merged and `main` is **not** asserted as updated. The detailed plan is in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`; workflow files are updated in lockstep.
- **Recommended next actions (in order).**
  1. **Review the staged Phase A + Phase B presentational diff** on `refactor/feature-boundaries` once the merge sync is complete. Confirm it remains limited to services, contact-routing UI, route-local presentation, docs, and `verify:contact-policy`.
  2. **Schedule the runtime Supabase staging smoke test** (privacy PR 1 / PR 1B migrations) as a **follow-up before `main`**, per `OPEN_QUESTIONS.md` Q15. Not a blocker for the privacy PR merge; a blocker for promoting `caro-maturana` → `main`.
  3. **Plan the `interviews.status` UPDATE transition hardening** (the mandatory pre-`main` follow-up): an UPDATE policy on `interviews` that gates who can transition `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`. This is the pre-`main` gate; it is **not** the INSERT/immutable-trigger correction (already applied in PR 1B).
  4. **Commit / push the technical PR 2 only if explicitly requested.** No commit or push was performed in this pass; user must explicitly ask.
  5. **ProfilePage deep split is deferred** to PR 3.
- **User must explicitly ask before any further commit / push** on this branch. Do not auto-commit.

## Owner / Agent Notes

- Owner: not assigned.
- Agent: opencode (Session 1, 2026-07-05; PR 0). QA session: opencode (2026-07-05). PR 1 Start session: opencode (2026-07-05). PR 1 decision / audit consolidation: opencode (2026-07-05). PR 1 Implementation Pass: opencode (2026-07-05). PR 1 QA + Security Pass: opencode (2026-07-05). PR #2 / Vercel external blocker: opencode (2026-07-05). PR 2 architecture setup: opencode (2026-07-05). Privacy PR #2 merge sync (merge sync of `origin/caro-maturana` into `refactor/feature-boundaries`): opencode (2026-07-12, Phase 1D).
- No secrets, `.env.local`, service keys, or generated outputs may be added to this directory.
