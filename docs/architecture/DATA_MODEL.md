# Data Model

## Main Concepts

- Profiles: users across Estudiante, Egresado, Empresa and Colegio roles.
- Skills and badges: competencies and achievements tied to student evidence.
- Profile evidence: projects, certificates and other claims with pending, verified or rejected states plus immutable review events.
- Job postings: opportunities published by companies.
- Applications: student or graduate submissions to job postings.
- Interviews and timeline: application process events.
- Messages: communication between allowed participants.
- Reputation and radar: signals that support profile strength and market demand.

## Database Source

Use `supabase/schema.sql` and `supabase/migrations` as the source for current schema details.

## Migration Rule

Production changes must be represented as new migration files. Do not edit production schema directly in Supabase Dashboard and then forget to commit a migration.
