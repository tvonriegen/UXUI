# Codebase Map

## Web App

- `apps/web/src/app`: Next.js routes, pages, API routes and server actions.
- `apps/web/src/components/dashboard`: role-specific dashboards.
- `apps/web/src/components/ats`: application timeline and interview proposal UI.
- `apps/web/src/components/talent`: matching and talent activities.
- `apps/web/src/components/ui`: reusable UI primitives.

### PR 1 contact-routing additions (committed on `fix/privacy-contact-routing`, HEAD `7a881f6`)

- `supabase/migrations/20260705000001_contact_requests.sql` — `contact_requests` table, RLS, `is_minor_profile` / `can_converse` SQL helpers, notification metadata / CHECK extension, `trg_profiles_guard_role_age` trigger, `trg_fn_contact_request_approve_conversation` approval trigger, `messages` / `conversations` insert gates.
- `apps/web/src/lib/utils/is-minor.ts` — `isMinorProfile(role, age)` shared helper; canonical predicate `role === 'Estudiante' && (age == null || age < 18)`.
- `apps/web/src/app/actions/contact-requests.ts` — `requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest` server actions. In PR 2 Phase A service-boundary work, `requestContactWithTalent` delegates to `lib/services/contact-requests.ts` and the private `ensureConversation` helper moved to `lib/services/conversations.ts`.
- `apps/web/src/app/actions/interviews.ts` — `proposeInterview` refactored to the RLS-constrained server-action client; admin client removed from the contact / interview path.
- `apps/web/src/app/talent/page.tsx` — server-action call wired; `email` removed from the talent directory client select (PR 1 M1 fix).
- `apps/web/src/components/dashboard/DashboardColegio.tsx` — school approve / reject queue wired to the new server actions.
- `scripts/verify-is-minor.mjs` + root `verify:is-minor` script — 7/7 canonical cases.

### PR 2 boundaries (on `refactor/feature-boundaries`; Phase A complete locally, Phase B presentational complete locally)

Target folder tree, layer contracts, extraction order, and risk matrix live in `docs/architecture/PR2_FEATURE_BOUNDARIES.md`. The planned new modules are:

- `apps/web/src/lib/services/` — `conversations.ts` (moved `ensureConversation`), `contact-policy.ts` (pure `decideContactPath` decision), `contact-requests.ts` (service wrapper used by the server action). Implemented locally in Phase A.
- `apps/web/src/components/contact-routing/` — `types.ts`, `ContactRequestQueue.tsx` (extracted from `DashboardColegio`), and `ContactTalentButton.tsx`; `apps/web/src/lib/hooks/useContactTalent.ts` encapsulates the talent page CTA call. Implemented locally in Phase A UI.
- Route-local `_components` for `muro`, `empleos`, `administracion` — Phase B presentational pass implemented locally with `MuroHeader.tsx`, `CompanyStatsGrid.tsx`, `AdminHeader.tsx`, and `AdminTabs.tsx`. No fetch/mutation logic moved.
- **Deferred (not in PR 2):** a deep split of `apps/web/src/app/profile/page.tsx` (2888 lines, complexity 61) is a dedicated PR (PR 3 or later); PR 2 may only extract a small, low-risk presentational fragment from it.

`apps/web/src/lib`: Supabase clients, auth, roles, schemas, shared data and matching.

## Database

- `supabase/schema.sql`: full schema snapshot.
- `supabase/migrations`: migration history (canonical source of truth per ADR-002 C1; `schema.sql` is the derived snapshot).
- `supabase/seed/seed.sql`: demo seed data.
- `supabase/full_reset.sql`: full reset helper for controlled environments.

## Maintenance

- `scripts/maintenance/rollback-migration.sql`: manual SQL rollback helper.
- `docs/technical/RUNBOOK.md`: operational notes.

## High-Risk Files To Refactor Later

Baseline measurement on `refactor/feature-boundaries` (2026-07-05):

- `apps/web/src/app/profile/page.tsx` — 2888 lines, complexity 61. **Deferred** to a dedicated PR (PR 3 or later); out of PR 2 scope per `PR2_FEATURE_BOUNDARIES.md`.
- `apps/web/src/app/muro/page.tsx` — 1373-line baseline, complexity 36. Phase B presentational split landed locally: header extracted to `app/muro/_components/MuroHeader.tsx`.
- `apps/web/src/app/empleos/page.tsx` — 1036-line baseline, complexity 29. Phase B presentational split landed locally: company analytics grid extracted to `app/empleos/_components/CompanyStatsGrid.tsx`.
- `apps/web/src/app/administracion/page.tsx` — 1309-line baseline, complexity 19. Phase B presentational split landed locally: header and tabs extracted to `app/administracion/_components/AdminHeader.tsx` and `AdminTabs.tsx`.
- `apps/web/src/app/messages/page.tsx` — 680 lines, complexity 20. Only touched in PR 2 if the conversations / messages surface starts sharing helpers with the contact-routing services; otherwise left alone.
- `apps/web/src/components/dashboard/DashboardColegio.tsx` — 443-line baseline. PR 1 privacy-sensitive (school approve / reject queue). Phase A in PR 2: queue extracted into `components/contact-routing/ContactRequestQueue.tsx`.
- `apps/web/src/app/talent/page.tsx` — 659-line baseline. PR 1 privacy-sensitive (server-action call). Phase A in PR 2: CTA state/call extracted into `lib/hooks/useContactTalent.ts` and `components/contact-routing/ContactTalentButton.tsx`.
- `apps/web/src/app/actions/contact-requests.ts` — 155-line PR 1 baseline; reduced in PR 2 Phase A service-boundary work by moving `ensureConversation` to `lib/services/conversations.ts`, extracting `decideContactPath` to `lib/services/contact-policy.ts`, and wrapping the request path in `lib/services/contact-requests.ts`. Public exports remain byte-identical.
