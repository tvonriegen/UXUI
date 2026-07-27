# Current State

## Repository

- `apps/web`: Next.js 14 App Router app with a shared client shell and canonical persona routes.
- `supabase`: chronological migrations, schema snapshot, reset helper and seed data.
- `docs`: product, architecture, requirements, QA, Git and workflow records.
- `scripts`: structural/domain/security verification and maintenance helpers.

## Application

Authentication uses Supabase email/password. Server resolution and middleware use canonical `account_type`; legacy `profiles.role` remains only for compatibility labels and older surfaces.

Persona dashboards, public exploration routes and an initial external freelance publishing surface exist. The larger legacy role-aware routes still coexist during migration.

## Data

The live Supabase database retains the wide `profiles` table and legacy `job_postings`, while also containing canonical identity tables, `opportunities`, legacy mappings and staged application links.

## Known structural and security risks

- Authenticated compatibility reads on `profiles` remain broad while legacy surfaces migrate; anonymous profile reads use the public projection.
- Many live policies remain assigned to `public` and historical policy variants coexist.
- Legacy role and job surfaces remain in code and require staged migration.
- `internship_requests` is still separate from common opportunities.
- `profile/page.tsx` is 2,951 lines; other high-risk routes are also oversized.
- Focused runtime RLS tests pass; the complete cross-persona negative matrix remains pending.
- Supabase advisors report callable `SECURITY DEFINER` helpers and disabled leaked-password protection.
- AI chat is optional and must remain disabled unless flags and keys are intentionally configured.
