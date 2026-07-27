# Phase 1: Identity and Access

- Date: 2026-07-26
- Branch: `foundation/identity-access`
- Status: implementation and staging migration complete; broader runtime matrix pending

## Delivered

- Added canonical `account_type` and `account_status` to `profiles`.
- Added `schools`, `school_members`, `student_profiles`, `company_profiles` and `external_profiles`.
- Added trusted identity triggers, Auth profile provisioning and the `public_student_profiles` projection.
- Added server-side account resolution and account-type route guards.
- Added controlled Company and External registration; Colegio registration remains invitation-only.
- Added canonical student creation, import and graduation flows.
- Aligned sensitive server actions and chat tools with `account_type`.
- Updated demo seed data with Auth metadata and canonical persona records.
- Applied canonical identity and public-projection migrations to Supabase staging.
- Added `npm run verify:identity-access` and CI execution.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify:identity-access`
- `git diff --check`
- Anonymous REST read of `public_student_profiles` returned `HTTP 200` without exposing base tables.
- Authenticated checks passed for own student profile, cross-student isolation, school membership scope and company profile ownership.

All passed locally on 2026-07-26.

## Pending

- Run the complete authenticated negative RLS matrix for cross-company, cross-school and external access.
- Configure `SEED_SECRET` in deployed environments before using `/api/seed`.
- The local Supabase CLI remains unavailable; remote migration execution used Supabase MCP.
