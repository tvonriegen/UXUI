# Supabase

This directory contains database assets for TalentHub.

## Structure

- `schema.sql`: full schema snapshot for reference and controlled resets.
- `migrations/`: chronological database migrations.
- `seed/seed.sql`: demo seed data.
- `full_reset.sql`: full reset helper for controlled environments.
- `../docs/technical/STAGING_SETUP.md`: separate free staging project and fixture workflow.

## Rules

- Treat migrations as the source of production database changes.
- Do not commit service role keys or private dumps.
- Review RLS changes before applying to shared or production environments.
- Do not run reset scripts against production.
- Do not use the production project for runtime fixtures or mutating smoke tests.
- Establish a reviewed schema baseline before applying migrations to a new staging project.
