# TalentHub Project Handoff

- Date: 2026-07-30
- Branch: `main`
- HEAD: `f502b9d`
- Base: `main` / `origin/main`

## Mission

TalentHub is moving from a shared legacy role-aware application to four canonical account experiences: Student, Company, School and External. Legacy surfaces remain available while data and feature ownership are extracted incrementally.

## Delivered

- Canonical identity: `account_type`, `account_status`, `student_stage`.
- School institutions and memberships with initial RLS.
- Public student projection with allowlisted fields.
- Common `opportunities` and reversible legacy mappings.
- Freelance proposals with student/external RLS boundaries.
- Institutional internship request mapping preserving school approval.
- Server-side account guards and dedicated persona route entry points.
- Shared desktop/mobile navigation based on canonical account type.
- External profile editing, freelance publishing and proposal review.
- Runtime security verifier and manual GitHub Actions workflow.
- Shared public shell applied to the landing, exploration, freelance, legal, login and registration routes.
- Public registration limited to Student and Company; External remains reserved for existing client routes.
- Student profile reconciliation migration applied through `20260730002712_reconcile_student_profiles`.
- Vitest, Testing Library and Chromium Playwright coverage added for the public/auth flows.

## Current Remote State

- Supabase production migrations applied through `20260730002712_reconcile_student_profiles`.
- The latest reconciliation verified 5 student profiles, 5 `student_profiles`, 0 inconsistent `external_profiles` and 0 `external` accounts.
- The connected project is production; no separate staging project has been provisioned yet.
- The repository is synchronized with `origin/main` at `f502b9d`.

## Local Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:identity-access
npm run verify:opportunities
npm run test:release
```

Local and GitHub static verification passes. Web Quality also passes unit/component tests, production build and Chromium public-flow E2E. Runtime checks require the separate staging project described in `docs/technical/STAGING_SETUP.md` and must not use production users.

## Runtime Gate

1. Create the second free Supabase project; never use production for fixtures.
2. Capture a schema/functions/policies/grants baseline from production and review it against the intended application contract.
3. Do not replay the historical local migrations, run `db push` or run `migration repair` against production until the baseline mapping is approved and tested in staging.
4. Apply only reviewed forward migrations after the staging baseline.
5. Set `SEED_SECRET` in the staging deployment environment.
6. Run the protected `/api/seed` endpoint against disposable staging.
7. Configure the canonical `RUNTIME_*` GitHub secrets listed in `docs/qa/RUNTIME_SECURITY_RUNBOOK.md`.
8. Trigger the runtime workflows manually and record the RLS/RPC matrix.
9. Revisit the GitHub Supabase Preview check only after migration history is reconciled through the reviewed baseline.

## Known Risks

- Authenticated compatibility reads from `profiles` remain broad.
- `profile/page.tsx`, `muro/page.tsx`, `administracion/page.tsx` and `empleos/page.tsx` remain oversized legacy routes.
- New dedicated persona routes currently re-export tested legacy components in several places.
- Direct legacy `job_postings` reads/writes remain during dual-read migration.
- Supabase production Advisors report leaked-password protection disabled; the RLS helpers are private and not public RPC endpoints.
- Production feed RPCs are restored through three tracked forward migrations; authenticated write smoke testing remains pending without staging.
- Local Supabase CLI is unavailable; use Supabase MCP for remote migration operations.
- Supabase Preview currently fails because remote migration versions are absent under the local filenames; this is migration-history drift, not a proven application regression.
- Vercel `uxui-jad2` completed successfully, while `uxui-sxfl` failed and requires Vercel project access to diagnose.

## Next Implementation Order

1. Provision staging and produce the reviewed Supabase baseline.
2. Run the staging fixture, RLS matrix and feed RPC smoke tests.
3. Reconcile Supabase Preview migration history without destructive production operations.
4. Diagnose the failing `uxui-sxfl` Vercel project or remove the stale integration.
5. Continue Student feature extraction from legacy pages.
6. Complete profile privacy tightening and advisor remediation.

## Safety Rules

- Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code or `NEXT_PUBLIC_*` variables.
- Never run runtime fixtures against production users.
- Treat `supabase/migrations/` as the executable schema source.
- Treat the current migration folder as historically non-replayable until the baseline strategy is completed.
- Never use `supabase migration repair` to hide drift without verifying the actual schema in disposable staging.
- Keep legacy tables until dual-read counts and runtime behavior are verified.
- Use server actions and RLS for authorization; navigation visibility is not authorization.
