# Known Issues

## Current Verification

- 2026-07-26: all five repository verification scripts passed.
- 2026-07-26: `npm run typecheck` passed.
- 2026-07-26: `npm run lint` passed without warnings.
- 2026-07-26: `npm run build` passed and generated 20 pages.
- 2026-07-26: `git diff --check` passed before integration.
- 2026-07-26: Phase 0 and Phase 1 branch validation passed before local merges; CI workflow added but not yet run remotely.
- 2026-07-26: Phase 2 readiness-timeline validation passed locally; Supabase runtime migration and remote CI remain pending.

## External Verification Pending

- Supabase staging has not been exercised from this workspace. Apply the privacy/interview migrations plus `20260726000002_application_readiness_timeline.sql` and verify RLS, triggers, timeline events and status transitions with real company, school and student roles.
- Deployment configuration must define `SEED_SECRET`; `/api/seed` now returns `503` outside local development when the secret is missing.
- The current GitHub OAuth token lacks the `workflow` scope, so `git push origin main` is rejected while publishing `.github/workflows/ci.yml`.

## Technical Debt

- `supabase/schema.sql`, `supabase/full_reset.sql` and older migrations still contain historical snapshot drift outside the current security sections. Migrations remain canonical.
- The dependency tree previously reported 21 vulnerabilities. They were not auto-fixed to avoid unplanned upgrades.
- `apps/web/src/app/profile/page.tsx` remains a large role-aware route and needs a separate decomposition effort.
- There is no disposable Supabase integration test suite yet; current scripts are hermetic structural/domain checks.
- Runtime Supabase smoke testing is now available as an opt-in manual workflow, but staging fixtures and GitHub environment secrets still need to be configured.
- The student profile route remains large despite the persistence and actionable-anchor improvements; keep its decomposition separate from product UX changes.

## Historical External Issue

- The Vercel check associated with historical PR #2 failed under a project owned by another account. The privacy implementation was locally validated and is now integrated into `main`; the old deployment issue is not treated as a current code failure.
