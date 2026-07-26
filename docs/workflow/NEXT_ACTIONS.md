# TalentHub Next Actions

## Gate before Phase 1

- Confirm the Phase 0 verdict and canonical role contracts.
- Choose whether the restructuring uses `epic/four-personas` with sequential branches or the current direct-`main` policy.
- Approve the first migration scope: account types, student stages, schools, memberships and external profile.
- Define staging fixtures for Company A/B, School A/B, minor student, adult student, graduated student and External A.

## Phase 1 execution order

1. Write the preflight SQL/report for legacy role and school data.
2. Add idempotent identity/membership migration without deleting legacy columns.
3. Add server account resolver and route guard contract.
4. Add external registration restrictions and demo-mode gate.
5. Add initial RLS policies and negative tests for cross-school/company access.
6. Run structural verifiers, runtime staging tests, lint, typecheck and build.

## Required validation matrix

- `npm run verify:is-minor`
- `npm run verify:contact-policy`
- `npm run verify:interviews-privacy-rls`
- `npm run verify:explainable-match`
- `npm run verify:application-readiness`
- `npm run verify:readiness-timeline`
- `npm run verify:profile-evidence`
- `npm run verify:phase3-security`
- `npm run verify:function-grants`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Runtime RLS and persona matrix against staging fixtures.

## Deferred but tracked

- Create safe public profile projection before anonymous exploration.
- Rewrite broad `public` policies into authenticated, ownership and membership scopes.
- Enable leaked-password protection and resolve advisor findings.
- Migrate `job_postings` to common `opportunities`.
- Decompose the oversized role-aware routes after characterization coverage.
