# Codebase Map

## Web App

- `apps/web/src/app`: Next.js routes, pages, API routes and server actions.
- `apps/web/src/components/dashboard`: role-specific dashboards.
- `apps/web/src/components/ats`: application timeline and interview proposal UI.
- `apps/web/src/components/talent`: matching and talent activities.
- `apps/web/src/components/ui`: reusable UI primitives.
- `apps/web/src/lib`: Supabase clients, auth, roles, schemas, shared data and matching.

## Database

- `supabase/schema.sql`: full schema snapshot.
- `supabase/migrations`: migration history.
- `supabase/seed/seed.sql`: demo seed data.
- `supabase/full_reset.sql`: full reset helper for controlled environments.

## Maintenance

- `scripts/maintenance/rollback-migration.sql`: manual SQL rollback helper.
- `docs/technical/RUNBOOK.md`: operational notes.

## High-Risk Files To Refactor Later

- `apps/web/src/app/profile/page.tsx`
- `apps/web/src/app/muro/page.tsx`
- `apps/web/src/app/empleos/page.tsx`
- `apps/web/src/app/administracion/page.tsx`
