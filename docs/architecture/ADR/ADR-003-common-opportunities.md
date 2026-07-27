# ADR-003: One Opportunity Model With Publisher Constraints

- Status: Accepted and implemented incrementally in Phase 2
- Date: 2026-07-26

## Context

The current database uses `job_postings` for company opportunities and separate `internship_requests` for school workflows. It has no common model for company projects and external freelance work, which makes application and timeline rules inconsistent.

## Decision

Introduce `opportunities` as the canonical publication model with `publisher_type` (`company` or `external`) and `opportunity_type` (`internship`, `job`, `company_project`, `freelance`). Keep legacy `job_postings` during a staged migration and preserve its identifiers through an explicit mapping.

## Constraints

- Companies may publish internship, job and company_project.
- Externals may publish freelance only.
- Only the publisher may edit or close an opportunity.
- Closed or expired opportunities reject new applications.
- A unique `(opportunity_id, applicant_id)` constraint prevents duplicates.
- Matching and readiness are explanatory; they never reject an application automatically.

## Consequences

- Existing company jobs need a reversible backfill and compatibility read path.
- `internship_requests` remains an institutional workflow until its use is mapped to opportunity approval or retired.
- RLS and server actions become simpler after the migration, but the transition requires dual-read verification.

## Phase 2 implementation

- `opportunities` is live with company `job` and `internship` backfills from `job_postings`.
- `opportunity_legacy_links` preserves the reversible relationship to `job_postings`.
- `job_applications.opportunity_id` is nullable during the staged transition; existing `job_id` history remains valid.
- External publishing is restricted to verified-email `freelance` opportunities.
- Public reads expose only open, non-expired opportunities; publisher writes are owner-scoped.
