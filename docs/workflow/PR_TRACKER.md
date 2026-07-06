# TalentHub PR Tracker

| ID | Title | Branch | Base | Status | Validation | Owner | Notes |
|----|-------|--------|------|--------|------------|-------|-------|
| PR 0 | chore: add persistent workflow state tracking | `chore/workflow-state` (integrated into `caro-maturana`) | `caro-maturana` | **Integrated locally** via fast-forward into `caro-maturana` on 2026-07-05; push to `origin` is the user's call (SSH blocked) | **Passed** (lint ✓, typecheck ✓, build ✓ — 2026-07-05 QA session) | not assigned | Introduces `docs/workflow/` and updates `docs/git/GIT_WORKFLOW.md`. The full local branch head — `e01cecf` (main setup), `f15550b` (docs finalization), and `adb64cf` (workflow branch handoff) — is now reachable from `caro-maturana`. |
| PR 1 | fix: privacy contact routing (minor students via school) | `fix/privacy-contact-routing` | `caro-maturana` (post-PR 0 fast-forward) | **PR #2 opened / pushed / local validation passed / Vercel external failing** | **Passed locally** (`npm run verify:is-minor` ✓ 7/7, `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ no dummy env) | not assigned (Vercel: teammate / partner who owns the Vercel project) | Route company contact with minor students through the school-mediated path. Implementation is committed and pushed to `origin/fix/privacy-contact-routing` (HEAD `7a881f6`). PR #2 opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. GitHub checks: `Vercel` **failed**, `Vercel Preview Comments` **passed**. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). This is an **external** deployment issue, not a local code validation problem. See `DECISION_LOG.md` ADR-002 and resolved `OPEN_QUESTIONS.md` Q12–Q14. Security review verdict after B1 / M1 fixes: APROBAR, no BLOCKER / HIGH. Runtime Supabase migration smoke test is a recommended follow-up, not a blocker. |
| PR 2 | refactor: split high-risk feature pages into modules | `refactor/feature-boundaries` (stacked on `fix/privacy-contact-routing` while PR #2 is held by the external Vercel blocker) | `fix/privacy-contact-routing` until PR #2 lands; retarget / rebase to `caro-maturana` after PR #2 lands | **Phase A complete locally + Phase B presentational complete locally / no commit / no push** | **Passed locally** (`verify:is-minor` ✓ 7/7, `verify:contact-policy` ✓ 8/8, `typecheck` ✓, `lint` ✓, `build` ✓) | not assigned | Phase A implemented: service boundaries, contact-routing UI queue, talent CTA hook/component, and no-dependency `verify:contact-policy`. Phase B implemented as small presentational route-local components for `muro`, `empleos`, and `administracion`. No schema/RLS/migration, `supabase/`, `apps/web/src/app/api/`, `profile/page.tsx`, UI redesign, dependency, commit, or push. **ProfilePage deep split is explicitly deferred** to PR 3 or later. |

## PR 0 — Detail

- Branch: `chore/workflow-state`.
- Base: `caro-maturana`.
- Integration: fast-forwarded into `caro-maturana` locally on 2026-07-05. All three commits — `e01cecf`, `f15550b`, `adb64cf` — are reachable from the new `caro-maturana` HEAD. The push of the now-integrated branch (or of `caro-maturana`) to `origin` is the user's call; SSH credentials are still blocked on this machine.
- Scope:
  - Create `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `DECISION_LOG.md`, `OPEN_QUESTIONS.md`, `PR_TRACKER.md`.
  - Update `docs/git/GIT_WORKFLOW.md` to require reading `STATUS.md`, `NEXT_ACTIONS.md`, `PR_TRACKER.md` at session start and updating `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at session close.
- Files touched in this PR: only documentation under `docs/`.
- Commits on `chore/workflow-state` (all now in `caro-maturana`):
  - `e01cecf chore: add persistent workflow state tracking` — main PR 0 setup commit (2026-07-05).
  - `f15550b docs: finalize workflow state after PR 0 setup` — documentation-only follow-up on the same branch (2026-07-05).
  - `adb64cf docs: clarify workflow branch handoff` — final docs touch-up clarifying the handoff into `caro-maturana` (2026-07-05).
- Validation: **passed** (2026-07-05 QA session, against the pre-integration `chore/workflow-state` HEAD). `npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓. No dummy env values required.
- Last known good validation (baseline `caro-maturana` pre-integration, 2026-07-05, dummy public env values): lint passed, typecheck passed, build passed. `npm run install:web` reported 21 dependency vulnerabilities (not auto-fixed, see `KNOWN_ISSUES.md`).

## PR 1 — Detail

- Branch: `fix/privacy-contact-routing` (created from `caro-maturana` after the PR 0 fast-forward).
- Purpose: route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data.
- Status: **PR #2 opened / pushed / local validation passed / Vercel external failing**. Implementation is committed (HEAD `7a881f6`) and pushed to `origin/fix/privacy-contact-routing`. PR #2 opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. GitHub checks: `Vercel` **failed**, `Vercel Preview Comments` **passed**. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). This is an **external** deployment issue, not a local code validation problem.
- Architecture-auditor verdict (2026-07-05): **Aprobar con observaciones** — do not block, provided the ajustes imprescindibles are incorporated before / during implementation. The required guardrails (CR-1 / C3 admin-client elimination; CR-2 / C2 `can_converse` on both insert sides; M1 `isMinor` predicate; M2 `contact_requests` RLS; M3 indexes; M4 `schema.sql` alignment; M-5 / M7 `notifications.metadata` + idempotent migration; M-6 / M6 verification mechanism; M-2 / M8 `SECURITY DEFINER` hygiene; secondary decisions on student visibility, cancellation, `rejection_reason`, Colegio↔Egresado) are captured in `DECISION_LOG.md` ADR-002. See `SESSION_LOG.md` (PR 1 Start, PR 1 decision / audit consolidation, PR 1 Implementation Pass, PR 1 QA + Security Pass, and PR #2 / Vercel external blocker, 2026-07-05).
- Security follow-up verdict (2026-07-05, after the B1 and M1 fixes): **APROBAR, sin BLOCKER / HIGH**. The B1 fix is `trg_profiles_guard_role_age` (rejects direct `profiles.role` / `profiles.age` updates unless `auth.role() = 'service_role'`) plus a tightened `profiles_update` policy with `WITH CHECK`. The M1 fix removes `email` from the talent directory client select so it cannot leak through the public row.
- Direct contact-surface points identified during the read-only exploration (reworked in PR 1):
  - `apps/web/src/app/talent/page.tsx` — creates conversations on behalf of a company toward candidates.
  - `apps/web/src/app/messages/page.tsx` — opens the company↔student and school↔student conversation paths.
  - `apps/web/src/app/actions/interviews.ts` — used the admin Supabase client to create interview proposals, bypassing RLS. Refactored to the RLS-constrained server-action client bound to `auth.uid()` (CR-1 / C3).
  - Supabase RLS on `conversations` — previously validated only participant membership; now `can_converse(a, b)` gates `conversations INSERT` and `messages INSERT`, with `conversations SELECT` remaining participant-based for history (soft-lock per M5).
- Scope (now that C1–C4, M1–M8, and the secondary decisions are decided in ADR-002, and the implementation is committed / pushed):
  - Add the `contact_requests` table, supporting indexes (pair/status and school/status), and RLS policies (M2, M3). Idempotent migration.
  - Add or update the `is_minor_profile(role, age)` SQL function and the `can_converse(a, b)` SQL function with explicit `search_path`, `STABLE`, and minimum grants (M1, M3, M8).
  - Update `conversations` and `messages` RLS so that `can_converse` gates both inserts (CR-2 / C2, M5).
  - Extend `notifications` to include `metadata jsonb NOT NULL DEFAULT '{}'` and a CHECK that allows `contact_request` with `metadata.status` (M5, M7). Idempotent migration.
  - Add the `contact_request` DB trigger that writes the notification row (C4). The trigger is the only writer for the `contact_request` notification kind in PR 1.
  - Refactor `apps/web/src/app/actions/interviews.ts::proposeInterview` to drop the admin client; for minor candidates, create or reuse a `contact_requests` row in `pending` and do not move `job_applications.status` to `interviewing` until approval (CR-1 / C3).
  - Add the school-side approve / reject path and the company-side cancel path on `contact_requests`; wire the approval outcome to the `can_converse` gate and to the soft-lock / reuse-or-create conversation logic (M2, M5; resolves Q13).
  - Regenerate `supabase/schema.sql` for the touched sections and record any residual drift in `docs/technical/KNOWN_ISSUES.md` (C1, M4).
  - Pick and document the `is-minor` / contact-routing verification mechanism (M6; resolves Q12).
  - Confirm the `respondInterview` / `cancelInterview` admin-client scope (Q14): either confirm they stay out of scope for PR 1, or justify any admin-client use with a concrete, narrow, documented reason (per CR-1 / C3).
  - Add or extend a test that asserts a company's contact intent toward a minor student is routed through the school-mediated path and the student's direct contact data is not exposed in the company-facing response.
  - Documentation: updated `SESSION_LOG.md`, `PR_TRACKER.md`, `OPEN_QUESTIONS.md`, `NEXT_ACTIONS.md`, `STATUS.md`, `TRACEABILITY_MATRIX.md`, `KNOWN_ISSUES.md`, and `SECURITY_MODEL.md` as the implementation landed.
- Validation (2026-07-05, pre-push): `npm run verify:is-minor` ✓ (7/7 canonical cases), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env values required). Security review (post B1 / M1 fixes) verdict: **APROBAR, no BLOCKER / HIGH**. Runtime Supabase migration / RLS / trigger smoke test on a live instance is a recommended follow-up before merge / deploy (not a blocker).
- Commits added on top of the previous docs-only state `7a2b42f docs: document privacy contact routing decisions`:
  - `bfbe3d5 feat(db): add mediated contact requests RLS` — `supabase/migrations/20260705000001_contact_requests.sql` (contact_requests, RLS, `is_minor_profile`, `can_converse`, `trg_profiles_guard_role_age`, approval conversation trigger, message / conversation gates).
  - `7843e1b feat(web): add minor contact policy helper` — `apps/web/src/lib/utils/is-minor.ts` + `scripts/verify-is-minor.mjs` + root `verify:is-minor` script.
  - `0bf3ecc feat(web): add school-mediated contact flow` — `apps/web/src/app/actions/contact-requests.ts` (new) + UI wiring on `apps/web/src/app/talent/page.tsx` and `apps/web/src/components/dashboard/DashboardColegio.tsx`.
  - `4a86621 refactor(web): route interview proposals through privacy checks` — `apps/web/src/app/actions/interviews.ts::proposeInterview` (admin client removed from the proposal path).
  - `62b7f56 chore(db): align schema snapshot for contact routing` — `supabase/schema.sql` snapshot for PR 1 touched sections.
  - `7a881f6 docs: record privacy contact routing implementation` — workflow / security / traceability docs.
- Vercel external blocker: see `KNOWN_ISSUES.md` (External deployment issues) and `OPEN_QUESTIONS.md` Q16. Owner action: teammate / project owner must inspect / fix Vercel or grant access. Exact command for the owner: `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs`.

## PR 2 — Detail (Phase A service-boundary extraction, stacked on PR 1)

- Branch: `refactor/feature-boundaries` (stacked on `fix/privacy-contact-routing` while PR #2 is held by the external Vercel blocker).
- Base: `fix/privacy-contact-routing` until PR #2 lands; retarget / rebase to `caro-maturana` after PR #2 lands (`OPEN_QUESTIONS.md` Q18, `DECISION_LOG.md` ADR-003 sub-decision "Stacked branch policy").
- Purpose: decompose the high-risk feature pages surfaced by the PR 1 architecture review (`profile`, `muro`, `empleos`, `administracion`, `messages`, `DashboardColegio`, `talent`, `apps/web/src/app/actions/contact-requests.ts`) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable, and the high-risk feature pages stop accumulating complexity.
- Status: **Phase A complete locally + Phase B presentational complete locally / no commit / no push**. The detailed target folder tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, and commit plan live in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`. This continuation completes the remaining Phase A UI extractions and performs limited Phase B route-local presentational splits.
- Architecture-auditor verdict (2026-07-05): **Aprobar con observaciones** for the plan and the docs. Gate 2 is resolved by owner instruction with the no-new-dependency `verify:contact-policy` script. The required guardrails (no schema / RLS / migration changes; no behavior / UI changes; no `respondInterview` / `cancelInterview` admin-client review; no ProfilePage deep split; no new dependencies; server action public exports stay byte-identical) are captured in `DECISION_LOG.md` ADR-003 and referenced from `OPEN_QUESTIONS.md` Q17 and Q18.
- Phase A — low-risk extraction around the PR 1 flow (recommended first):
  - Done in this pass: move `ensureConversation` from the private body of `apps/web/src/app/actions/contact-requests.ts` to `apps/web/src/lib/services/conversations.ts` (exported). Public server action export unchanged.
  - Done in this pass: extract the Empresa ↔ minor decision cascade from `requestContactWithTalent` into a pure `apps/web/src/lib/services/contact-policy.ts` (no IO; uses the existing `isMinorProfile` from `lib/utils/is-minor.ts`).
  - Done in this pass: wrap the dedup / insert path in `apps/web/src/lib/services/contact-requests.ts`. The server action becomes a thin shell; public exports stay byte-identical.
  - Done in this continuation: extract the school approve / reject JSX from `apps/web/src/components/dashboard/DashboardColegio.tsx` into `apps/web/src/components/contact-routing/ContactRequestQueue.tsx`. Same Tailwind classes, review buttons, spinner, and error handling.
  - Done in this continuation: encapsulate the talent page CTA call to `requestContactWithTalent` in `apps/web/src/lib/hooks/useContactTalent.ts` and `apps/web/src/components/contact-routing/ContactTalentButton.tsx`. User-visible CTA is unchanged.
- Phase B — route-local presentational splits (optional, only if Phase A is small and green):
  - Done in this continuation: `apps/web/src/app/muro/page.tsx` header extracted to `apps/web/src/app/muro/_components/MuroHeader.tsx`. No fetch/mutation logic moved.
  - Done in this continuation: `apps/web/src/app/empleos/page.tsx` company stats grid extracted to `apps/web/src/app/empleos/_components/CompanyStatsGrid.tsx`. No server actions, `proposeInterview`, mutations, or Supabase logic moved.
  - Done in this continuation: `apps/web/src/app/administracion/page.tsx` header/tabs extracted to `apps/web/src/app/administracion/_components/AdminHeader.tsx` and `AdminTabs.tsx`. No school actions/mutations moved.
  - `apps/web/src/app/messages/page.tsx` (680 lines) — only if the conversations / messages surface starts sharing helpers with the contact-routing services; otherwise left alone.
- ProfilePage deep split — explicitly deferred to a dedicated PR (PR 3 or later). PR 2 may only extract a small, low-risk presentational fragment from `profile/page.tsx` if it lands without changing the render path or the data contract.
- Implementation gate (`OPEN_QUESTIONS.md` Q17, `DECISION_LOG.md` ADR-003 sub-decision "Test mechanism"):
  - **Gate 1 — Stacked branch accepted.** Captured in `DECISION_LOG.md` ADR-003. **Resolved (2026-07-05).**
  - **Gate 2 — Test mechanism decided.** Resolved by owner instruction: PR 2 keeps the PR 1 `verify:*` script approach and adds `verify:contact-policy`; no new dependency.
  - **Gate 3 — No behavior change.** Process gate; resolved by the implementation notes.
  - **Gate 4 — Validation green.** Process gate; resolved at the implementation pass.
- Files added / updated in this pass (no commit yet, no push): `apps/web/src/lib/services/conversations.ts`, `apps/web/src/lib/services/contact-policy.ts`, `apps/web/src/lib/services/contact-requests.ts`, `apps/web/src/app/actions/contact-requests.ts`, `apps/web/src/components/contact-routing/`, `apps/web/src/lib/hooks/useContactTalent.ts`, route-local `_components` for `muro`, `empleos`, and `administracion`, `scripts/verify-contact-policy.mjs`, root `package.json` script entry, and workflow / architecture docs.
- Validation (2026-07-06): `npm run verify:is-minor` ✓ (7/7), `npm run verify:contact-policy` ✓ (8/8), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓.

## PR 3 — Detail (planned, not started — ProfilePage deep split)

- Branch: TBD.
- Base: `caro-maturana` after PR 2 is merged and retargeted.
- Purpose: split `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) by role (Estudiante / Egresado / Empresa / Colegio). Deferred from PR 2 by the architect verdict (`PR2_FEATURE_BOUNDARIES.md`).
- Status: **planned** — do not start coding until PR 2 is merged. Tracked in `OPEN_QUESTIONS.md` (follow-up) and this row will be expanded when the work starts.
- Scope (initial, to be refined when work starts): a role-aware split that touches data shape, evidence state, and the render path. Out of scope for PR 2.
