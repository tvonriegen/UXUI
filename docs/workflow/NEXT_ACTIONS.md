# TalentHub Next Actions

## Immediate Gate

1. Configure isolated staging fixtures for Student, Company, School and External.
2. Set the `RUNTIME_*` GitHub secrets from `docs/qa/RUNTIME_SECURITY_RUNBOOK.md`.
3. Trigger `Runtime Security Smoke Tests` manually.
4. Record pass/fail evidence and resolve any RLS regression before production use.

## Product Extraction

1. Extract Student profile, feed, opportunities and applications from legacy pages.
2. Extract Company opportunity creation and applicant management onto canonical `opportunities`.
3. Extract School students, imports, validations and internship approvals into dedicated components.
4. Replace route re-exports with feature-owned components while preserving server actions.

## Security And Data

1. Narrow authenticated `profiles` reads and replace broad compatibility policy by resource-specific reads.
2. Finish legacy `job_postings` dual-read and dual-write migration.
3. Validate `opportunity_proposals`, evidence, contact mediation, interviews and timeline transitions runtime.
4. Review callable `SECURITY DEFINER` helpers and enable leaked-password protection in Supabase Auth.

## UX And Release

1. Run keyboard, screen-reader and mobile viewport checks for all four persona journeys.
2. Add consistent loading, empty, error and not-found states to extracted pages.
3. Run production smoke tests with a non-production fixture set.
4. Update deployment runbook, environment inventory and release checklist.

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:identity-access
npm run verify:opportunities
npm run verify:runtime-security
```
