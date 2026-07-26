# Data Model

## Audited current model

The live schema has one wide `profiles` table with `role` values `Estudiante`, `Egresado`, `Empresa` and `Colegio`. It also contains normalized skills, certifications, portfolio, evidence, feed, jobs, applications, timelines, interviews, contact requests, messaging, notifications, school reports, validation, reputation, gamification and radar tables.

The current source contains 36 live public tables. The live database has no `schools`, `school_members`, `student_profiles`, `company_profiles`, `external_profiles` or `opportunities` table. See `docs/architecture/PHASE_0_AUDIT.md` for the complete inventory and drift notes.

## Target model

- `profiles`: identity, email, display name, `account_type`, status and timestamps.
- `student_profiles`: `profile_id`, `school_id`, `student_stage`, specialty, availability, biography and public visibility.
- `schools`: institution identity, identifier, contact data and status.
- `school_members`: school/profile membership, `member_role` and status.
- `company_profiles`: organization data and verification status.
- `external_profiles`: basic client data and verification status.
- `opportunities`: common publisher-owned opportunity model; see ADR-003.
- `applications`: one row per applicant/opportunity with readiness snapshot and status.
- Existing evidence, portfolio, social, messaging, notification, interview and application-event tables are adapted incrementally.

## Legacy compatibility

Do not drop `profiles.role`, `job_postings`, `student_id` aliases or historical tables in the first migration. Backfill and compare counts first, retain a mapping for IDs, then switch reads and RLS after staging verification.

## Data invariants

- Account type is one of `student`, `company`, `school`, `external`.
- Student stage is one of `enrolled`, `internship`, `graduated`.
- A school member can act only within their active school membership.
- An external publisher can create only `freelance` opportunities.
- `(opportunity_id, applicant_id)` is unique.
- Closed or expired opportunities reject new applications.
- Public reads use an allowlisted projection, never the complete profile table.

## Database source

`supabase/migrations/` is the executable production source. `supabase/schema.sql` is a snapshot and `supabase/full_reset.sql` is a controlled reset helper only. Production changes must be represented as new idempotent migration files and verified against staging.
