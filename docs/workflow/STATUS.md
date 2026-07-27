# TalentHub Workflow Status

## Current Branch

- `main`
- HEAD: `fffcae46689192b00418ae1b2898eba7066d199d`
- Integrated source: `foundation/identity-access`
- Worktree is clean before the handoff update.

## Current Phase

- Four-persona restructuring is in incremental delivery.
- Initial identity, opportunities, page experience and route-tree work is complete.
- Student, Company and School feature extraction remains in progress because the dedicated routes still reuse legacy components.
- Runtime RLS, E2E, accessibility, mobile and deployment hardening remain the release gate.

## Delivered

- Canonical `account_type`, `account_status` and `student_stage` model.
- School, membership, student, company and external profile tables with initial RLS.
- Safe anonymous student projection.
- Common opportunities with reversible legacy mappings.
- Freelance proposals and institutional internship mapping.
- Server guards and dedicated persona route entry points.
- Shared canonical-account navigation for desktop and mobile.
- External profile and opportunity publishing flows.
- Runtime security verifier and manual GitHub Actions workflow.
- CI, structural verifiers, lint, typecheck and production build baseline.

## Remote State

- Supabase migrations are applied through `20260727002337_map_internship_requests`.
- Connected staging currently has 6 profiles: 2 schools, 2 companies and 2 students.
- Connected staging currently has 4 opportunities, 1 mapped internship request and 0 proposals.
- External fixture seeding and the runtime security workflow are still pending.

## Release Risks

- Authenticated `profiles` compatibility reads remain broad during legacy extraction.
- Legacy role-aware pages remain large and still contain direct legacy reads/writes.
- Runtime RLS matrix has not run with isolated staging secrets.
- Supabase advisors still report intentional callable `SECURITY DEFINER` helpers and leaked-password protection disabled.
- The local Supabase CLI is unavailable; remote migrations use Supabase MCP.

## Next Action

1. Configure disposable staging fixtures and run `Runtime Security Smoke Tests`.
2. Extract Student features from `profile/page.tsx`, `muro/page.tsx` and `empleos/page.tsx`.
3. Move new Company opportunity writes to canonical `opportunities`.
4. Narrow authenticated profile reads and resolve remaining advisor findings.

## Historical Baseline

Phase 0 verdict: **APROBAR CON OBSERVACIONES**. The original audit and workflow records remain in the session history for traceability.
