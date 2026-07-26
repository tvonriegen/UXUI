# ADR-001: Egresado Is a Student Stage

- Status: Proposed in Phase 0
- Date: 2026-07-26

## Context

The current model stores `Egresado` as a fourth role beside `Estudiante`, `Empresa` and `Colegio`. This duplicates student behavior, creates separate dashboard logic and makes graduation look like an authorization change.

## Decision

Keep one student account type. Store academic lifecycle in `student_profiles.student_stage` with `enrolled`, `internship` and `graduated`. Graduation preserves the same identity, profile, evidence, applications, contacts, validations, curriculum and portfolio.

## Consequences

- Role guards use `student`, not a graduate role.
- Student features can branch on stage only when a business rule requires it.
- Existing `profiles.role = 'Egresado'` rows require an audited backfill to `student` plus `graduated`.
- The legacy role column cannot be removed until data, RLS and runtime fixtures are migrated.
