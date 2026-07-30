# Known Issues

## Current Verification

- 2026-07-26: all five repository verification scripts passed.
- 2026-07-26: `npm run typecheck` passed.
- 2026-07-26: `npm run lint` passed without warnings.
- 2026-07-26: `npm run build` passed and generated 20 pages.
- 2026-07-26: `git diff --check` passed before integration.
- 2026-07-26: Phase 0 and Phase 1 branch validation passed before local merges; CI workflow added but not yet run remotely.
- 2026-07-26: Phase 2 evidence and Phase 3 readiness/security validations passed locally; Supabase schema and policy migrations were applied and verified remotely.
- 2026-07-26: Phase 1 canonical identity migrations are applied to Supabase production; focused authenticated RLS checks pass, while the complete negative matrix remains pending.
- 2026-07-26: Common opportunities migration backfilled 3 company opportunities and 1 application link; external runtime publishing fixtures are still pending.
- 2026-07-27: Freelance proposals and institutional internship mappings are deployed structurally; runtime proposal tests require running the seed fixture with `cliente@demo.cr`.
- 2026-07-27: `verify:runtime-security` and the manual `Runtime Security Smoke Tests` workflow are available; staging fixture secrets have not yet been configured, so the full matrix remains unexecuted.
- 2026-07-28: Supabase RLS helpers were moved to the non-exposed `private` schema; security advisors now report only the Auth leaked-password setting.
- 2026-07-29: Production has no separate staging project; the free staging setup is documented in `docs/technical/STAGING_SETUP.md` and has not been provisioned yet.
- 2026-07-29: Production feed RPCs were restored through three tracked forward migrations; authenticated write smoke testing remains pending because no staging project exists.
- 2026-07-29: Feed RPC security was hardened in production; only the Auth leaked-password protection advisor warning remains.

## External Verification Pending

- Supabase schema alignment is complete for the reviewed production sections, but no separate staging project currently exercises RLS, evidence review, timeline triggers and interview transitions end to end.
- Deployment configuration must define `SEED_SECRET`; `/api/seed` now returns `503` outside local development when the secret is missing.
- The current GitHub OAuth token lacks the `workflow` scope, so `git push origin main` is rejected while publishing `.github/workflows/ci.yml`.

## Technical Debt

- `supabase/schema.sql`, `supabase/full_reset.sql` and older migrations still contain historical snapshot drift outside the current security sections. Migrations remain canonical.
- The dependency tree previously reported 21 vulnerabilities. They were not auto-fixed to avoid unplanned upgrades.
- `apps/web/src/app/profile/page.tsx` remains a large role-aware route and needs a separate decomposition effort.
- There is no disposable Supabase integration test suite yet; current scripts are hermetic structural/domain checks.
- Runtime Supabase smoke testing is now available as an opt-in manual workflow, but the free staging project, fixtures and GitHub environment secrets still need to be configured.
- The local Supabase CLI is unavailable (`supabase: command not found`); remote migration execution currently uses Supabase MCP.
- Supabase Auth leaked-password protection remains disabled and requires a dashboard setting change: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- The student profile route remains large despite the persistence and actionable-anchor improvements; keep its decomposition separate from product UX changes.
- Public self-registration temporarily sets `email_confirm = true` so users can log in immediately; restore email verification before production hardening.
- Public registration is temporarily limited to Estudiante and Empresa; external client routes remain reserved and are not exposed by the signup form.

## Phase 0 Four-Persona Findings (2026-07-26)

- `Egresado` is still a database and TypeScript role; it must become `student_stage = graduated` without losing history.
- `Externo` is not implemented in identity, routes, UI, database or RLS.
- The live schema has no institution/member model or common `opportunities` model.
- The live `profiles` SELECT policy is broad and exposes a table containing sensitive student fields; a safe public projection is required before anonymous exploration.
- Many live policies are assigned to `public` and need a resource-by-resource rewrite to the authorization matrix.
- The requested sequential integration branch policy differs from the current repository policy of direct work on `main`; resolve before Phase 1.
- No runtime negative RLS suite covers cross-company, cross-school, external publisher restrictions or public sensitive-field absence.

## Historical External Issue

- The Vercel check associated with historical PR #2 failed under a project owned by another account. The privacy implementation was locally validated and is now integrated into `main`; the old deployment issue is not treated as a current code failure.
