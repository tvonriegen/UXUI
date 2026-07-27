# Phase 2: Common Opportunities

- Date: 2026-07-26
- Branch: `foundation/identity-access`
- Status: initial model, publishing, proposal and institutional mapping implemented

## Delivered

- Added canonical `opportunities` with publisher and opportunity type constraints.
- Added reversible `opportunity_legacy_links` mapping for staged migration.
- Backfilled the existing company jobs: 2 jobs and 1 internship.
- Added nullable `job_applications.opportunity_id` and a partial unique applicant constraint.
- Added RLS for public open listings, publisher ownership, company/external type boundaries and open application eligibility.
- Added server actions for external publishing, closing opportunities and student applications.
- Added `opportunity_proposals` with student submission, external review and withdrawal boundaries.
- Added public freelance listing/detail routes and authenticated external management/create routes.
- Added a dual-read compatibility service for canonical opportunities plus legacy job postings.
- Mapped institutional internship requests to draft/open/closed opportunities without removing school approval.
- Added `npm run verify:opportunities` and CI execution.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build` (33 routes)
- `npm run verify:identity-access`
- `npm run verify:opportunities`
- Anonymous REST listing returned `HTTP 200` with 3 open staged opportunities.
- Staging contains 1 mapped internship request and 0 proposals before fixture seeding.

## Pending

- Run `npm run verify:runtime-opportunities` with the seeded external fixture credentials.
- Exercise publish/close/application/proposal flows end to end with the external fixture.
- Convert remaining legacy company job reads to the dual-read compatibility service before removing direct legacy reads.
- Extend school approval tests to cover transitions after the initial mapping.
