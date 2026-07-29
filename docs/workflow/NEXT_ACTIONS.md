# TalentHub Next Actions

## Immediate Gate

1. Create the second free Supabase project described in `docs/technical/STAGING_SETUP.md`.
2. Build and review a schema baseline without copying production data.
3. Configure isolated staging fixtures for Student, Company, School and External.
4. Set the canonical `RUNTIME_*` GitHub secrets in the `staging` environment.
5. Trigger `Runtime Supabase Smoke` and `Runtime Security Smoke Tests` manually.
6. Record pass/fail evidence and resolve any RLS or RPC regression before production use.

## Product Extraction

1. Continue splitting Student profile, feed, opportunities and applications data access from shared role-aware components.
2. Move Company opportunity creation and applicant management fully onto canonical `opportunities`.
3. Split School students, imports, validations and internship approvals into smaller feature components.
4. Keep route aliases thin while preserving server actions and canonical account guards.

## Security And Data

1. Narrow authenticated `profiles` reads and replace broad compatibility policy by resource-specific reads.
2. Finish legacy `job_postings` dual-read and dual-write migration.
3. Validate `opportunity_proposals`, evidence, contact mediation, interviews and timeline transitions runtime.
4. Enable leaked-password protection in Supabase Auth; RLS helpers are already private and no longer callable through the public RPC surface.

## UX And Release

1. Run keyboard, screen-reader and mobile viewport checks for all four persona journeys.
2. Add consistent loading, empty, error and not-found states to extracted pages.
3. Run the production Preview smoke test with the non-production staging project.
4. Update deployment runbook, environment inventory and release checklist.

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:identity-access
npm run verify:opportunities
npm run verify:runtime-security
npm run verify:runtime-feed-rpcs
```

For the local release gate, run `npm run verify:release`.
