# TalentHub Workflow Status

## Current Branch

- `refactor/feature-boundaries`

## Current Phase

- PR 2 — `refactor: split high-risk feature pages into modules` (architecture planning; implementation gate pending).

## Current PR / Task

- Task: `refactor: split high-risk feature pages into modules`.
- Scope: decompose the high-risk feature pages surfaced by the PR 1 architecture review (`profile`, `muro`, `empleos`, `administracion`, `messages`, `DashboardColegio`, `talent`, `apps/web/src/app/actions/contact-requests.ts`) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable.
- **Stacked branch.** `refactor/feature-boundaries` is cut from `fix/privacy-contact-routing` (HEAD `c795e14 docs: record external Vercel blocker for PR 1` on this branch) because PR #2 against `caro-maturana` is held by the external Vercel blocker. The user has accepted the stacked branch approach (2026-07-05); PR 2 is opened against `fix/privacy-contact-routing` until PR #2 lands, then retargeted / rebased to `caro-maturana` if needed. Captured in `DECISION_LOG.md` ADR-003 and `OPEN_QUESTIONS.md` Q18.
- **Status: architecture planning; implementation not started.** No code, no RLS, no migration, no `package.json` change, no `apps/web/src/app/api/` change in this pass. Documentation only. The detailed target folder tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, and commit plan live in `docs/architecture/PR2_FEATURE_BOUNDARIES.md` (new in this pass).
- **Architect verdict (2026-07-05):** Aprobar con observaciones for plan / docs. BLOQUEAR implementation until the gate conditions in `PR2_FEATURE_BOUNDARIES.md` are met. Sub-decisions: stacked branch policy (accepted), test mechanism (open — `OPEN_QUESTIONS.md` Q17), ProfilePage deep split deferred, no schema / RLS / `package.json` dependency changes except a minimal pure-service test runner if explicitly approved.
- **Phase A (recommended first).** Move `ensureConversation` to `lib/services/conversations.ts`; extract `contact-policy` pure decision logic; wrap dedup / insert path in `lib/services/contact-requests.ts`; extract `ContactRequestQueue` from `DashboardColegio`; encapsulate the talent page CTA in `useContactTalent` and / or `ContactTalentButton`. Server action public exports stay byte-identical.
- **Phase B (optional, only if Phase A is small and green).** Route-local presentational splits for `muro`, `empleos`, `administracion`. `messages` only if the conversations / messages surface starts sharing helpers with the contact-routing services.
- **ProfilePage deep split is explicitly deferred** to a dedicated PR (PR 3 or later). PR 2 may only extract a small, low-risk presentational fragment from `profile/page.tsx` if it lands without changing the render path or the data contract.

## Last Completed Work

- PR 0 (`chore/workflow-state`) was **integrated locally into `caro-maturana` via fast-forward** on 2026-07-05. The full local branch head — including `e01cecf`, `f15550b`, and the final docs touch-up `adb64cf docs: clarify workflow branch handoff` — is now reachable from `caro-maturana`. PR 0 itself was validated before integration (`npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓ — 2026-07-05 QA session).
- PR 1 implementation pass + security pass landed on `fix/privacy-contact-routing` (HEAD `7a881f6 docs: record privacy contact routing implementation`). PR #2 is opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. Local validation green; `Vercel` GitHub check failing externally; `Vercel Preview Comments` passed.
- The PR 2 architecture setup landed on `refactor/feature-boundaries` (HEAD `c795e14 docs: record external Vercel blocker for PR 1` at the start of this pass; this pass adds `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and updates the workflow / architecture docs). No code, no commit, no push in this pass.

## Current Working State

- Branch `refactor/feature-boundaries` is clean per `git status --short --branch`. Stacked on `fix/privacy-contact-routing` HEAD `7a881f6`; the previous docs commit `c795e14 docs: record external Vercel blocker for PR 1` is on this branch only and is not on `fix/privacy-contact-routing`.
- PR 2 documentation artifacts created / updated in this pass (no commit yet):
  - **Created:** `docs/architecture/PR2_FEATURE_BOUNDARIES.md` — the architecture entry point for PR 2 (goals, non-goals, target folder tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, commit plan, gate conditions, deferred work, risk register, open decisions, references).
  - **Updated:** `docs/architecture/CODEBASE_MAP.md` — added PR 1 contact-routing additions and PR 2 planned boundaries; updated the high-risk files list with PR 2 phase mapping.
  - **Updated:** `docs/technical/REFACTORING_PLAN.md` — added Phase 4 (PR 2 phases A / B) and Phase 5 (follow-up chore PRs); explicitly deferred the ProfilePage deep split.
  - **Updated:** `docs/workflow/STATUS.md` (this file) — current branch = `refactor/feature-boundaries`; current phase = PR 2 architecture planning; stacked branch noted.
  - **Updated:** `docs/workflow/NEXT_ACTIONS.md` — immediate actions for the PR 2 architecture pass; decision flow for Gate 2 (test mechanism).
  - **Updated:** `docs/workflow/PR_TRACKER.md` — PR 2 row updated: status = architecture planning in progress / stacked on PR 1; base = `fix/privacy-contact-routing` until PR #2 lands; detail section expanded.
  - **Updated:** `docs/workflow/SESSION_LOG.md` — PR 2 architecture setup entry added.
  - **Updated:** `docs/workflow/DECISION_LOG.md` — ADR-003 added (stacked branch policy accepted; test mechanism pending; Phase A scope; ProfilePage deep split deferred).
  - **Updated:** `docs/workflow/OPEN_QUESTIONS.md` — Q17 (test mechanism) and Q18 (PR 2 base / retarget policy) added.
  - **Updated:** `docs/requirements/TRACEABILITY_MATRIX.md` — PR 2 added as a technical-enabler row (no functional requirement change).
- No code, RLS, migration, server action, helper, script, UI, or `package.json` files were touched. No commit, no push.

## Known Breakages

- **Vercel check failing on PR #2 — external / out-of-this-workspace blocker (carried over from PR 1, still active).** The `Vercel` GitHub check on PR #2 failed. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found` here). The `Vercel Preview Comments` check passed. The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner. This is an **external** deployment issue, not a local code validation problem. Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16. Owner action: teammate / project owner must inspect / fix Vercel or grant access.
- **PR 2 implementation is gated on Gate 2 (test mechanism).** Until the owner picks a test mechanism (`OPEN_QUESTIONS.md` Q17), Phase A code cannot land. The architecture pass does not require Gate 2 to be resolved; only the implementation pass does.
- Git pull over SSH failed with `Permission denied (publickey)` against `origin`; local is in sync with `origin` per `git status` and the push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier. Future pushes are still blocked until SSH credentials are restored.
- 21 dependency vulnerabilities reported by `npm run install:web` on the baseline branch (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Historical migrations still include old project naming in comments only (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Broader historical schema snapshot drift remains between `supabase/schema.sql`, `supabase/full_reset.sql`, and older migrations; PR 1 updated touched sections only. Tracked in `docs/technical/KNOWN_ISSUES.md`. Out of PR 2 scope per `PR2_FEATURE_BOUNDARIES.md`.
- Runtime Supabase migration / RLS / trigger behavior was not exercised on a live Supabase instance in the PR 1 pass (the new migration in `supabase/migrations/20260705000001_contact_requests.sql` is unverified at runtime). Local validations passed. The runtime smoke test is a recommended follow-up before merge / deploy, not a blocker. Out of PR 2 scope.

## Next Recommended Action

- **PR 2 is in architecture planning on a stacked branch.** The detailed plan is in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`; the workflow files (`NEXT_ACTIONS.md`, `PR_TRACKER.md`, `SESSION_LOG.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `TRACEABILITY_MATRIX.md`) are updated in lockstep.
- **Recommended next actions (in order).**
  1. **Owner: review and accept the PR 2 architecture.** Read `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and `DECISION_LOG.md` ADR-003. Confirm Phase A scope, the stacked branch policy, the ProfilePage deferral, and the "no schema / RLS / migration / `package.json` dependency changes" rule.
  2. **Owner: pick a test mechanism (Gate 2).** Either (a) accept a minimal pure-service test runner (recorded in `DECISION_LOG.md` ADR-003 sub-decision "Test mechanism") or (b) keep the PR 1 `verify:*` script approach and add `verify:contact-policy`. Capture the decision in `OPEN_QUESTIONS.md` Q17 and in `DECISION_LOG.md` ADR-003.
  3. **Commit the PR 2 architecture docs.** Stage `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and the workflow / architecture updates; commit on `refactor/feature-boundaries` with a `docs:` prefix. Push to `origin/refactor/feature-boundaries` once SSH credentials are restored (or wait for the user to push). Open PR 2 against `fix/privacy-contact-routing` (not `caro-maturana`) per the stacked branch policy.
  4. **Once Gate 2 is resolved: implement Phase A.** Follow the commit plan in `PR2_FEATURE_BOUNDARIES.md` (five atomic commits, in order). Update `docs/workflow/SESSION_LOG.md`, `docs/workflow/PR_TRACKER.md`, and `docs/requirements/TRACEABILITY_MATRIX.md` as commits land.
  5. **If Phase A is small and green: consider Phase B (optional).** Route-local presentational splits for `muro`, `empleos`, `administracion`. Each route is its own commit.
  6. **ProfilePage deep split is deferred.** Open a follow-up entry in `OPEN_QUESTIONS.md` and a follow-up PR row in `PR_TRACKER.md` (PR 3 or later) to avoid losing the work.
- **Do not start coding PR 2 Phase A until Gate 2 is resolved.** The architect verdict explicitly blocks implementation until the gate conditions in `PR2_FEATURE_BOUNDARIES.md` are met.
- **User must explicitly ask before any further commit / push** on this branch. Do not auto-commit.

## Owner / Agent Notes

- Owner: not assigned.
- Agent: opencode (Session 1, 2026-07-05; PR 0). QA session: opencode (2026-07-05). PR 1 Start session: opencode (2026-07-05). PR 1 decision / audit consolidation: opencode (2026-07-05). PR 1 Implementation Pass: opencode (2026-07-05). PR 1 QA + Security Pass: opencode (2026-07-05). PR #2 / Vercel external blocker: opencode (2026-07-05). PR 2 architecture setup: opencode (2026-07-05).
- No secrets, `.env.local`, service keys, or generated outputs may be added to this directory.
