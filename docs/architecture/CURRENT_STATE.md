# Current State

## Repository

- `apps/web`: Next.js 14 App Router app with a shared client shell.
- `supabase`: 28 chronological migrations, schema snapshot, reset helper and seed data.
- `docs`: product, architecture, requirements, QA, Git and workflow records.
- `scripts`: structural/domain/security verification and maintenance helpers.

## Application

Authentication uses Supabase email/password. The browser loads `profiles.role` and the shared shell uses it to change dashboards, navigation labels and feature visibility. Middleware protects session presence and forced password changes, but not persona route authorization.

Existing role-aware surfaces include student, graduate, company and school components. There is no external surface and no public safe exploration surface.

## Data

The live Supabase database contains 36 public tables centered on a wide `profiles` table and `job_postings`. Evidence, contact routing, interviews, readiness timeline, reputation, gamification and radar are present. The canonical four-account model and common opportunities are not present.

## Known structural and security risks

- `profiles` has broad public reads and contains sensitive columns.
- Many live policies remain assigned to `public` and historical policy variants coexist.
- No institution/member tables isolate school administration.
- `Egresado` is still an independent role in code, schema, policies and seed data.
- No external account or freelance opportunity workflow exists.
- `profile/page.tsx` is 2,951 lines; other high-risk routes are also oversized.
- Runtime authenticated RLS tests are pending even though structural verifiers pass.
- Supabase advisors report callable `SECURITY DEFINER` helpers and disabled leaked-password protection.
- AI chat is optional and must remain disabled unless flags and keys are intentionally configured.
