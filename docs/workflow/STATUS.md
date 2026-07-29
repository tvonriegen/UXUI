# TalentHub Workflow Status

## Current Branch

- `fix/supabase-feed-runtime-reconciliation`
- HEAD: `6c24a57`
- Base: `main` / `origin/main`
- Worktree contains the pending route, runtime, Supabase and deployment changes; it is not ready to merge yet.

## Current Phase

- Four-persona restructuring is in incremental delivery.
- Initial identity, opportunities, page experience and route-tree work is complete.
- Student, Company and School route surfaces now point to feature-owned components; resource-level data extraction remains incremental.
- Runtime RLS, E2E, accessibility, mobile and deployment hardening remain the release gate.

## Delivered

- Canonical `account_type`, `account_status` and `student_stage` model.
- School, membership, student, company and external profile tables with initial RLS.
- Safe anonymous student projection.
- Common opportunities with reversible legacy mappings.
- Freelance proposals and institutional internship mapping.
- Server guards and dedicated persona route entry points.
- Shared canonical-account navigation for desktop and mobile.
- Unified External authenticated surfaces with the shared light shell, typography and form/card treatment.
- External profile and opportunity publishing flows.
- Runtime security verifier and manual GitHub Actions workflow.
- Vercel workspace configuration, Node 22 release baseline and private RLS helper schema.
- Feature-owned feed, opportunity, talent, school administration, profile, messaging, notification and settings components.
- CI, structural verifiers, lint, typecheck and production build baseline.

## Remote State

- Supabase production migrations are applied through `20260729222304_harden_feed_rpc_security`.
- Connected production currently has 6 profiles: 2 schools, 2 companies and 2 students.
- Connected production currently has 4 opportunities, 1 mapped internship request and 0 proposals.
- The connected project is production, not staging; the second free staging project has not been provisioned.
- External fixture seeding and the runtime security workflow are still pending.

## Release Risks

- Authenticated `profiles` compatibility reads remain broad during legacy extraction.
- Legacy role-aware pages remain large and still contain direct legacy reads/writes.
- Runtime RLS matrix has not run with isolated staging secrets.
- Supabase Auth still reports leaked-password protection disabled; the RLS helper surface is now private.
- Production feed RPCs are restored; authenticated write smoke testing remains pending without staging.
- Vercel Preview and production environment variables require the project owner.
- The local Supabase CLI is unavailable; remote migrations use Supabase MCP.

## Next Action

1. Provision the second free Supabase project using `docs/technical/STAGING_SETUP.md`.
2. Run the canonical runtime smoke tests against staging.
3. Complete the Vercel Preview validation with the project owner.
4. Record the production feed RPC verification and schedule a follow-up staging project when available.
5. Narrow authenticated profile reads and resolve remaining advisor findings.

## Historical Baseline

Phase 0 verdict: **APROBAR CON OBSERVACIONES**. The original audit and workflow records remain in the session history for traceability.
