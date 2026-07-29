# TalentHub Project Handoff

- Date: 2026-07-29
- Branch: `fix/supabase-feed-runtime-reconciliation`
- HEAD: `6c24a57`
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

## Current Remote State

- Supabase production migrations applied through `20260729222304_harden_feed_rpc_security`.
- 6 production profiles: 2 schools, 2 companies and 2 students.
- 4 production opportunities, 1 mapped internship request and 0 proposals.
- The connected project is production; no separate staging project has been provisioned yet.

## Local Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:identity-access
npm run verify:opportunities
```

Static verification passes for the current change set. `lint`, `typecheck` and `build` must be rerun before merge. Runtime checks require the separate staging project described in `docs/technical/STAGING_SETUP.md` and must not use production users.

## Runtime Gate

1. Create the second free Supabase project and reviewed schema baseline.
2. Set `SEED_SECRET` in the staging deployment environment.
3. Run the protected `/api/seed` endpoint against disposable staging.
4. Confirm the external fixture owns an open freelance opportunity.
5. Configure the canonical `RUNTIME_*` GitHub secrets listed in `docs/qa/RUNTIME_SECURITY_RUNBOOK.md`.
6. Trigger the runtime workflows manually.
7. Record the result before enabling production rollout.

## Known Risks

- Authenticated compatibility reads from `profiles` remain broad.
- `profile/page.tsx`, `muro/page.tsx`, `administracion/page.tsx` and `empleos/page.tsx` remain oversized legacy routes.
- New dedicated persona routes currently re-export tested legacy components in several places.
- Direct legacy `job_postings` reads/writes remain during dual-read migration.
- Supabase production Advisors report leaked-password protection disabled; the RLS helpers are private and not public RPC endpoints.
- Production feed RPCs are restored through three tracked forward migrations; authenticated write smoke testing remains pending without staging.
- Local Supabase CLI is unavailable; use Supabase MCP for remote migration operations.

## Next Implementation Order

1. Runtime staging fixture and RLS matrix.
2. Student feature extraction from legacy pages.
3. Canonical Company opportunity writes.
4. School member management and profile extraction.
5. Profile privacy tightening and advisor remediation.
6. Accessibility, mobile and deployment hardening.

## Safety Rules

- Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code or `NEXT_PUBLIC_*` variables.
- Never run runtime fixtures against production users.
- Treat `supabase/migrations/` as the executable schema source.
- Keep legacy tables until dual-read counts and runtime behavior are verified.
- Use server actions and RLS for authorization; navigation visibility is not authorization.
