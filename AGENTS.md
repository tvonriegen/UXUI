# Repository Agent Notes

TalentHub is a Next.js and Supabase project organized as a small workspace.

## Structure

- `apps/web`: Next.js web application.
- `supabase`: database schema, migrations and seed data.
- `docs`: product, architecture, technical, Git and QA documentation.
- `scripts`: repository-level maintenance scripts.

## Rules

- Do not commit real secrets, `.env.local`, Supabase service keys, private dumps or generated outputs.
- Prefer `git mv` for structural moves to preserve history.
- Keep changes small, reviewed and traceable.
- Document unresolved breakage in `docs/technical/KNOWN_ISSUES.md`.
