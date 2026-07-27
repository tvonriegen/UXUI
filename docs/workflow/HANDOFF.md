# TalentHub Project Handoff

- Date: 2026-07-26
- Branch: `main`
- HEAD: `ef00aad35a90493f27b1949f6b288c64f335f220`
- Integrated source: `foundation/identity-access`

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

- Supabase migrations applied through `20260727002337_map_internship_requests`.
- 6 staging profiles: 2 schools, 2 companies and 2 students.
- 4 opportunities, 1 mapped internship request and 0 proposals.
- No external runtime fixture has been seeded in the connected staging project yet.

## Local Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:identity-access
npm run verify:opportunities
```

All passed at handoff. `npm run verify:runtime-security` requires isolated staging credentials and is intentionally not run with local or production users.

## Runtime Gate

1. Set `SEED_SECRET` in the deployed app environment.
2. Run the protected `/api/seed` endpoint against disposable staging.
3. Confirm the external fixture owns an open freelance opportunity.
4. Configure the `RUNTIME_*` GitHub secrets listed in `docs/qa/RUNTIME_SECURITY_RUNBOOK.md`.
5. Trigger `.github/workflows/runtime-security.yml` manually.
6. Record the result before enabling production rollout.

## Known Risks

- Authenticated compatibility reads from `profiles` remain broad.
- `profile/page.tsx`, `muro/page.tsx`, `administracion/page.tsx` and `empleos/page.tsx` remain oversized legacy routes.
- New dedicated persona routes currently re-export tested legacy components in several places.
- Direct legacy `job_postings` reads/writes remain during dual-read migration.
- Supabase Advisors report intentional callable `SECURITY DEFINER` helpers and leaked-password protection disabled.
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
