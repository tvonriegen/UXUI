# Phase 2: Common Opportunities

- Date: 2026-07-26
- Branch: `foundation/identity-access`
- Status: initial model and external publishing flow implemented

## Delivered

- Added canonical `opportunities` with publisher and opportunity type constraints.
- Added reversible `opportunity_legacy_links` mapping for staged migration.
- Backfilled the existing company jobs: 2 jobs and 1 internship.
- Added nullable `job_applications.opportunity_id` and a partial unique applicant constraint.
- Added RLS for public open listings, publisher ownership, company/external type boundaries and open application eligibility.
- Added server actions for external publishing, closing opportunities and student applications.
- Added public freelance listing/detail routes and authenticated external management/create routes.
- Added `npm run verify:opportunities` and CI execution.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build` (33 routes)
- `npm run verify:identity-access`
- `npm run verify:opportunities`
- Anonymous REST listing returned `HTTP 200` with 3 open staged opportunities.

## Pending

- Add an external staging fixture and exercise publish/close/application flows end to end.
- Add proposal records and UI for company/student responses to freelance opportunities.
- Convert legacy company job reads to a dual-read compatibility service before removing direct legacy reads.
- Map school `internship_requests` into the common model only after school approval semantics are covered.
