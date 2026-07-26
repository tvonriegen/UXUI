# Known Issues

## Current Verification

- 2026-07-26: all five repository verification scripts passed.
- 2026-07-26: `npm run typecheck` passed.
- 2026-07-26: `npm run lint` passed without warnings.
- 2026-07-26: `npm run build` passed and generated 20 pages.
- 2026-07-26: `git diff --check` passed before integration.

## External Verification Pending

- Supabase staging has not been exercised from this workspace. Apply the three privacy/interview migrations and verify RLS, trigger and status-transition behavior with real company, school and student roles.
- Deployment configuration must define `SEED_SECRET`; `/api/seed` now returns `503` outside local development when the secret is missing.

## Technical Debt

- `supabase/schema.sql`, `supabase/full_reset.sql` and older migrations still contain historical snapshot drift outside the current security sections. Migrations remain canonical.
- The dependency tree previously reported 21 vulnerabilities. They were not auto-fixed to avoid unplanned upgrades.
- `apps/web/src/app/profile/page.tsx` remains a large role-aware route and needs a separate decomposition effort.
- There is no disposable Supabase integration test suite yet; current scripts are hermetic structural/domain checks.

## Historical External Issue

- The Vercel check associated with historical PR #2 failed under a project owned by another account. The privacy implementation was locally validated and is now integrated into `main`; the old deployment issue is not treated as a current code failure.
