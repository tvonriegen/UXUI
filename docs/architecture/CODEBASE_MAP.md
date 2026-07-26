# Codebase Map

## Workspace

- `apps/web`: Next.js 14 App Router application.
- `supabase`: canonical migrations, schema snapshot, reset helper and seed data.
- `scripts`: repository verification and maintenance scripts.
- `docs`: product, architecture, requirements, QA and workflow records.

## Web App Boundaries

- `apps/web/src/app`: routes, server actions and API routes.
- `apps/web/src/components`: reusable UI, dashboard, ATS, talent and contact-routing components.
- `apps/web/src/lib`: clients, auth, roles, schemas, services, hooks and pure utilities.
- `apps/web/src/app/empleos`: jobs, matching explanation, readiness flow and company ATS surface.
- `apps/web/src/app/profile`: role-aware profile surface; deep modularization remains future work.

## Product Modules

- Matching: `apps/web/src/lib/utils/matching.ts` and `MatchExplanationPanel.tsx`.
- Assisted applications: `apps/web/src/lib/utils/application-readiness.ts` and `ApplicationReadinessPanel.tsx`.
- Privacy contact routing: `apps/web/src/lib/services/`, `contact-routing/` and contact request server actions.
- Interviews: `apps/web/src/app/actions/interviews.ts`, ATS components and interview migrations.
- Evidence and validation: profile, portfolio, certification, badge and school dashboard flows.

## Database

- `supabase/migrations`: executable source of truth for schema, RLS and triggers.
- `supabase/schema.sql`: maintained snapshot for the touched and current security sections.
- `supabase/seed/seed.sql`: controlled demo seed data.
- `supabase/full_reset.sql`: controlled reset helper.

## Verification Scripts

- `verify:is-minor`: canonical minor-profile predicate cases.
- `verify:contact-policy`: contact-routing decision cases.
- `verify:interviews-privacy-rls`: interview INSERT, immutable identity and status transition invariants.
- `verify:explainable-match`: matching parity and factor explanation cases.
- `verify:application-readiness`: readiness blockers, recommendations and deterministic output cases.

## Known Hotspots

- `apps/web/src/app/profile/page.tsx` remains the largest route and is intentionally deferred for a dedicated refactor.
- `apps/web/src/app/empleos/page.tsx` still combines data loading, ATS behavior and route presentation despite the new extracted panels.
