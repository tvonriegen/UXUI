# TalentHub Open Questions

## Q1 - Supabase staging verification

- Type: External validation.
- Status: Open.
- Apply the contact-routing, interview privacy and interview status-transition migrations to staging.
- Verify company minor contact requests, school approval/rejection, message soft-locking, interview INSERT invariants, immutable identity fields and allowed status transitions.

## Q2 - Deployment configuration

- Type: Operational.
- Status: Open.
- Configure `SEED_SECRET` in every deployed environment and confirm `/api/seed` returns `503` when deployment configuration is incomplete.

## Q3 - Dependency vulnerabilities

- Type: Maintenance.
- Status: Open.
- Triage the 21 vulnerabilities reported by the existing dependency tree in a controlled maintenance change.

## Q4 - Schema snapshot drift

- Type: Maintenance.
- Status: Open.
- Keep migrations canonical and schedule a complete regeneration of `supabase/schema.sql` for historical sections still out of sync.

## Q5 - Automated runtime tests

- Type: Quality.
- Status: Open.
- Add disposable Supabase integration tests for authorization-sensitive paths after staging roles and fixtures are defined.
