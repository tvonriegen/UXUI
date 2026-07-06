# Refactoring Plan

## Phase 1: Stabilize Structure

- Keep `apps/web`, `supabase`, `docs` and `scripts` as top-level boundaries.
- Avoid broad feature changes during structural cleanup.
- Keep commits small and reversible.

## Phase 2: Extract Domain Modules

- Extract matching utilities and explanation data structures.
- Extract profile evidence components from `profile/page.tsx`.
- Extract jobs/application readiness components from `empleos/page.tsx`.
- Extract school administration flows from `administracion/page.tsx`.

## Phase 3: Add Safety Nets

- Add unit tests for pure matching logic.
- Add integration checks for protected API routes.
- Add CI for lint, typecheck and build.

## Phase 4: PR 2 — `refactor: split high-risk feature pages into modules` (PR 2 / `refactor/feature-boundaries`)

PR 2 is the follow-up to PR 1 (`fix/privacy-contact-routing`, committed and pushed to `fix/privacy-contact-routing` HEAD `7a881f6`, PR #2 opened against `caro-maturana`, blocked by the external Vercel check). The architect verdict for PR 2 (2026-07-05) is **Aprobar con observaciones** for plan / docs and **BLOQUEAR** implementation until the gate conditions below are met. The detailed target tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, and commit plan live in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`. This file records the phase structure and the explicit deferrals.

### Phase A — low-risk extraction around the PR 1 contact-routing flow (complete locally)

- Done locally: move `ensureConversation` from `apps/web/src/app/actions/contact-requests.ts` (private) to `apps/web/src/lib/services/conversations.ts` (exported). Public server action export unchanged.
- Done locally: extract the Empresa ↔ minor decision cascade from `requestContactWithTalent` into a pure `apps/web/src/lib/services/contact-policy.ts` (no IO; uses the existing `isMinorProfile` from `lib/utils/is-minor.ts`).
- Done locally: wrap the dedup / insert path in `apps/web/src/lib/services/contact-requests.ts`. The server action becomes a thin shell; public exports stay byte-identical.
- Done locally: extract the school approve / reject JSX from `apps/web/src/components/dashboard/DashboardColegio.tsx` into `apps/web/src/components/contact-routing/ContactRequestQueue.tsx`. Same Tailwind classes and same review buttons/spinner/error handling.
- Done locally: encapsulate the talent page CTA call to `requestContactWithTalent` in `apps/web/src/lib/hooks/useContactTalent.ts` and `apps/web/src/components/contact-routing/ContactTalentButton.tsx`. User-visible CTA is unchanged.

**Phase A gate conditions** (must all be true before code lands):

- **Gate 1 — Stacked branch accepted.** `refactor/feature-boundaries` is cut from `fix/privacy-contact-routing` while PR #2 is held by the external Vercel blocker. Accepted by the user on 2026-07-05; captured in `DECISION_LOG.md` ADR-003.
- **Gate 2 — Test mechanism decided.** Resolved by owner instruction on 2026-07-05: PR 2 keeps the PR 1 `verify:*` script approach and adds `verify:contact-policy`. No new dependency is added. See `OPEN_QUESTIONS.md` Q17 and `DECISION_LOG.md` ADR-003.
- **Gate 3 — No behavior change.** The PR 2 implementation notes include a side-by-side before / after for each public function: same inputs, same outputs, same Supabase calls in the same order, same error messages.
- **Gate 4 — Validation green.** `verify:is-minor` (PR 1), `verify:contact-policy` (if added), `typecheck`, `lint`, `build` all pass; if a test runner was approved, the corresponding test command passes too. No dummy env required.

### Phase B — route-local presentational splits (complete locally, limited scope)

- `apps/web/src/app/muro/page.tsx` — done locally: extracted `app/muro/_components/MuroHeader.tsx`. No fetch, filter, post, save, comment, or job-apply logic moved.
- `apps/web/src/app/empleos/page.tsx` — done locally: extracted `app/empleos/_components/CompanyStatsGrid.tsx`. No server actions, `proposeInterview`, applicant mutations, or Supabase logic moved.
- `apps/web/src/app/administracion/page.tsx` — done locally: extracted `app/administracion/_components/AdminHeader.tsx` and `AdminTabs.tsx`. No school actions, student mutations, request updates, or Supabase logic moved.
- `apps/web/src/app/messages/page.tsx` (680 lines) — only if the conversations / messages surface starts sharing helpers with the contact-routing services; otherwise left alone.

**Phase B gate conditions** (must all be true if Phase B is pursued):

- **Gate B1 — Phase A is merged** (or at minimum, locally green and the user accepts Phase B on the stacked branch).
- **Gate B2 — Each route split is independent and revertible.** A bad split in `muro` must not block `empleos` or `administracion`. Each route ships as its own commit.
- **Gate B3 — No new tests required.** Phase B is presentational; the existing PR 1 + Phase A test surface is enough.
- **Gate B4 — No new `package.json` dependencies.** Same rule as Phase A.

### ProfilePage deep split — explicitly deferred

- `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) is the largest single file in the repository. A meaningful role-aware split (Estudiante vs. Egresado vs. Empresa vs. Colegio) touches data shape, evidence state, and the render path. The architect verdict is to defer this to a dedicated PR (PR 3 or later) and **not attempt it in PR 2**. PR 2 may extract a small, low-risk presentational fragment from `profile/page.tsx` only if it lands without changing the render path or the data contract, and only if it does not grow PR 2 past the "small and reversible" tolerance.

### PR 2 — explicit non-goals

- No schema / RLS / migration changes. Privacy guarantee stays where the data lives (RLS + DB trigger + `can_converse`) per `DECISION_LOG.md` ADR-002.
- No behavior / UI changes. PR 2 is a refactor only.
- No `respondInterview` / `cancelInterview` admin-client review. Out of PR 1 scope (`OPEN_QUESTIONS.md` Q14); tracked in `KNOWN_ISSUES.md`. Not a PR 2 deliverable.
- No new dependencies. Phase A uses the no-new-dependency `verify:contact-policy` script selected in `OPEN_QUESTIONS.md` Q17.

## Phase 5: Follow-up Chore PRs (tracked separately)

- Dependency vulnerability triage (21 vulnerabilities from `npm run install:web`). Tracked in `docs/technical/KNOWN_ISSUES.md`. Not a PR 2 deliverable.
- Broader schema snapshot drift (`supabase/schema.sql` vs. `supabase/full_reset.sql` vs. older migrations). Tracked in `KNOWN_ISSUES.md`. Not a PR 2 deliverable.
- `respondInterview` / `cancelInterview` admin-client review. Tracked in `KNOWN_ISSUES.md` and `OPEN_QUESTIONS.md` Q14. Not a PR 2 deliverable.
- ProfilePage deep split (see "ProfilePage deep split — explicitly deferred" above). Tracked in `OPEN_QUESTIONS.md` (follow-up after PR 2 merges).
- Runtime Supabase migration / RLS / trigger smoke test for PR 1 migration. Tracked in `OPEN_QUESTIONS.md` Q15. Not a PR 2 deliverable.
