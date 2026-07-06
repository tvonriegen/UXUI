# TalentHub Workflow Status

## Current Branch

- `refactor/feature-boundaries`

## Current Phase

- PR 2 — `refactor: split high-risk feature pages into modules` (Phase A complete locally; Phase B presentational splits complete locally; validation green).

## Current PR / Task

- Task: `refactor: split high-risk feature pages into modules`.
- Scope: decompose the high-risk feature pages surfaced by the PR 1 architecture review (`profile`, `muro`, `empleos`, `administracion`, `messages`, `DashboardColegio`, `talent`, `apps/web/src/app/actions/contact-requests.ts`) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable.
- **Stacked branch.** `refactor/feature-boundaries` is cut from `fix/privacy-contact-routing` because PR #2 against `caro-maturana` is held by the external Vercel blocker. The user has accepted the stacked branch approach (2026-07-05); PR 2 is opened against `fix/privacy-contact-routing` until PR #2 lands, then retargeted / rebased to `caro-maturana` if needed. Captured in `DECISION_LOG.md` ADR-003 and `OPEN_QUESTIONS.md` Q18.
- **Status: Phase A complete locally; Phase B presentational split complete locally.** This branch now includes the Phase A service extraction, Phase A contact-routing UI extraction, and small Phase B presentational components for `muro`, `empleos`, and `administracion`. No RLS, migration, `supabase/`, `apps/web/src/app/api/`, `profile/page.tsx`, UI redesign, commit, or push.
- **Architect verdict (2026-07-05):** Aprobar con observaciones for plan / docs. Phase A Gate 2 is resolved by owner instruction with the no-new-dependency `verify:contact-policy` script. Sub-decisions: stacked branch policy (accepted), test mechanism (accepted), ProfilePage deep split deferred, no schema / RLS / dependency changes.
- **Phase A complete locally.** `ensureConversation` moved to `lib/services/conversations.ts`; `contact-policy` pure decision logic extracted; the `requestContactWithTalent` dedup / insert path wrapped in `lib/services/contact-requests.ts` without `next/cache` / `next/headers` imports; server action public exports stay byte-identical; `ContactRequestQueue`, `useContactTalent`, and `ContactTalentButton` extracted without user-visible CTA changes.
- **Phase B presentational complete locally.** `muro` now has `MuroHeader`; `empleos` now has `CompanyStatsGrid`; `administracion` now has `AdminHeader` and `AdminTabs`. No Supabase logic, server actions, mutations, or route behavior moved.
- **ProfilePage deep split is explicitly deferred** to a dedicated PR (PR 3 or later). PR 2 may only extract a small, low-risk presentational fragment from `profile/page.tsx` if it lands without changing the render path or the data contract.

## Last Completed Work

- PR 0 (`chore/workflow-state`) was **integrated locally into `caro-maturana` via fast-forward** on 2026-07-05. The full local branch head — including `e01cecf`, `f15550b`, and the final docs touch-up `adb64cf docs: clarify workflow branch handoff` — is now reachable from `caro-maturana`. PR 0 itself was validated before integration (`npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓ — 2026-07-05 QA session).
- PR 1 implementation pass + security pass landed on `fix/privacy-contact-routing` (HEAD `7a881f6 docs: record privacy contact routing implementation`). PR #2 is opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. Local validation green; `Vercel` GitHub check failing externally; `Vercel Preview Comments` passed.
- The PR 2 architecture setup landed on `refactor/feature-boundaries` (HEAD `c3dead6 docs: define PR 2 feature boundary architecture`). This pass stages the Phase A service-boundary implementation and updates workflow / architecture docs. No commit, no push.

## Current Working State

- Branch `refactor/feature-boundaries` started this continuation with uncommitted Phase A service-boundary changes. Stacked on `fix/privacy-contact-routing` HEAD `7a881f6`; PR 2 docs commit `c3dead6` is on this branch.
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
  - **Updated:** `package.json` with root `verify:contact-policy` script only; no dependency changes.
- Documentation updated in this continuation: `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, `docs/workflow/PR_TRACKER.md`, `docs/workflow/SESSION_LOG.md`, `docs/workflow/OPEN_QUESTIONS.md`, and `docs/requirements/TRACEABILITY_MATRIX.md`.
- Validation run locally after Phase A UI / Phase B presentational extraction: `npm run verify:is-minor` ✓, `npm run verify:contact-policy` ✓, `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓.

## Known Breakages

- **Vercel check failing on PR #2 — external / out-of-this-workspace blocker (carried over from PR 1, still active).** The `Vercel` GitHub check on PR #2 failed. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found` here). The `Vercel Preview Comments` check passed. The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner. This is an **external** deployment issue, not a local code validation problem. Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16. Owner action: teammate / project owner must inspect / fix Vercel or grant access.
- **Gate 2 resolved.** `verify:contact-policy` is the selected no-new-dependency safety net for the Phase A service-boundary work.
- Git pull over SSH failed with `Permission denied (publickey)` against `origin`; local is in sync with `origin` per `git status` and the push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier. Future pushes are still blocked until SSH credentials are restored.
- 21 dependency vulnerabilities reported by `npm run install:web` on the baseline branch (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Historical migrations still include old project naming in comments only (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Broader historical schema snapshot drift remains between `supabase/schema.sql`, `supabase/full_reset.sql`, and older migrations; PR 1 updated touched sections only. Tracked in `docs/technical/KNOWN_ISSUES.md`. Out of PR 2 scope per `PR2_FEATURE_BOUNDARIES.md`.
- Runtime Supabase migration / RLS / trigger behavior was not exercised on a live Supabase instance in the PR 1 pass (the new migration in `supabase/migrations/20260705000001_contact_requests.sql` is unverified at runtime). Local validations passed. The runtime smoke test is a recommended follow-up before merge / deploy, not a blocker. Out of PR 2 scope.

## Next Recommended Action

- **PR 2 Phase A and Phase B presentational work are staged locally on a stacked branch.** The detailed plan is in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`; workflow files are updated in lockstep.
- **Recommended next actions (in order).**
  1. **Review the staged Phase A + Phase B presentational diff.** Confirm it remains limited to services, contact-routing UI, route-local presentation, docs, and `verify:contact-policy`.
  2. **Commit only if requested.** No commit or push was performed in this pass.
  3. **ProfilePage deep split is deferred.** Keep PR 3 planned for the dedicated split.
- **User must explicitly ask before any further commit / push** on this branch. Do not auto-commit.

## Owner / Agent Notes

- Owner: not assigned.
- Agent: opencode (Session 1, 2026-07-05; PR 0). QA session: opencode (2026-07-05). PR 1 Start session: opencode (2026-07-05). PR 1 decision / audit consolidation: opencode (2026-07-05). PR 1 Implementation Pass: opencode (2026-07-05). PR 1 QA + Security Pass: opencode (2026-07-05). PR #2 / Vercel external blocker: opencode (2026-07-05). PR 2 architecture setup: opencode (2026-07-05).
- No secrets, `.env.local`, service keys, or generated outputs may be added to this directory.
