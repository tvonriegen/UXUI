# Phase 0 Audit: Product Contracts

- Date: 2026-07-26
- Branch: `main`
- HEAD: `8674fe8347cdf6f28b5808a36df3c629e96b956f`
- Scope: read-only audit and contracts; no functional code, migration or RLS change made.
- Verdict: **APROBAR CON OBSERVACIONES**

## Evidence inspected

- Git branch, HEAD, status and recent history.
- All tracked repository paths.
- Next.js routes, middleware, auth and role contexts.
- Server actions and API route handlers.
- Supabase schema snapshot, reset helper and 28 chronological migrations.
- Live Supabase public tables, columns, policies, functions and triggers.
- Existing verification scripts, CI, docs and hotspot sizes.

## Repository baseline

- Workspace: `apps/web`, `supabase`, `scripts`, `docs`.
- Next.js 14 App Router, React 18, TypeScript, Tailwind, Supabase SSR/browser clients and Zod.
- Worktree was clean and aligned with `origin/main` at audit start.
- Existing repository verifiers, lint, typecheck and build are the current automated baseline.

## Current role/auth findings

1. `Role` is `Estudiante | Egresado | Empresa | Colegio` in `apps/web/src/lib/types.ts`.
2. `AuthProvider` loads `profiles.role` in the browser and `RoleProvider` exposes it to all client components.
3. `/login` accepts only email/password, which is correct, but success redirects to `/` rather than a server-resolved persona route.
4. `/register` lets the caller select `Empresa` or `Colegio`; public Colegio registration conflicts with the controlled-invitation requirement.
5. Middleware checks session and `must_change_password`, but not account type, membership, ownership, resource status or age.
6. The root page renders four dashboard components from client role state, including a dedicated `DashboardEgresado`.
7. Demo buttons are rendered unconditionally in `/login`; the seed endpoint is guarded outside local development, but the UI is not gated by `NEXT_PUBLIC_DEMO_MODE=true`. **[HISTORICAL — snapshot 2026-07-26]** Los botones demo fueron eliminados de `/login` y la ruta `/api/seed` fue eliminada en el release de estabilización (2026-08-18).
8. Navigation filters links visually but does not protect routes. The existing route surface is shared and role-aware rather than separated by persona.

## Current route and feature findings

Existing working surfaces include login, registration, password change, profiles, portfolio, skills, evidence, feed, jobs, applications, explainable matching, readiness, ATS, interviews, messaging, notifications, school administration, contact mediation, gamification and radar. They are concentrated in large client routes.

Important gaps:

- No public explore/freelance/privacy/terms route family exists.
- No external dashboard, profile, freelance publishing or proposals exist.
- No school member management or institution entity exists; a school is currently a profile row.
- No canonical company/student/external route guard exists.
- `profile/page.tsx` is 2,951 lines; `muro` 1,354; `administracion` 1,292; `empleos` 1,257; `messages` 680; `talent` 659.
- `profile`, `muro`, `empleos` and `administracion` combine loading, mutations, policy assumptions and presentation.

## Database findings

The live public schema contains 36 base tables. It has no `schools`, `school_members`, `student_profiles`, `company_profiles`, `external_profiles` or `opportunities` table, and no `account_type`, `student_stage`, `publisher_type` or `opportunity_type` columns. The live model is centered on one wide `profiles` table and `job_postings`.

Existing relevant tables include profiles, skills, user_skills, certifications, portfolio_items, badges, user_badges, xp_events, posts, post_likes, post_comments, job_postings, job_applications, application_events, interviews, internship_requests, alliances, conversations, messages, notifications, contact_requests, profile_evidence, profile_evidence_events, profile_views, school_reports, skill_validations, activity_results, recommendation_requests, reputation_events, saved_posts, company_follows, quest tables and radar tables.

The migration history is incremental and mostly idempotent, but `schema.sql` and `full_reset.sql` are snapshots with known drift. `full_reset.sql` does not include the later evidence, contact, readiness, interview hardening, radar and quest state. It must not be used as a production schema source.

## RLS and security findings

- Live RLS policy inventory has policies on all 36 public tables, but many are assigned to `public`, including profiles, posts, jobs, applications, messaging-adjacent tables and school data.
- `profiles_select_all` currently allows broad profile reads. This is incompatible with minors and the required public projection.
- Several update policies lack a complete canonical `WITH CHECK` contract or are duplicated under historical names.
- The database has `can_converse`, evidence guards and interview transition triggers; structural scripts verify their SQL, but runtime negative tests are still pending.
- Supabase security advisors report authenticated execution of `public.can_converse` and `public.profile_evidence_school_reviewer` as `SECURITY DEFINER`, plus leaked-password protection disabled.
- `createAdminClient` is used by school account creation and company ATS actions. It is server-only, but each privileged write must be narrowed and covered by an authorization test.
- The current frontend selects complete `profiles` rows in profile and directory flows, so privacy cannot rely on UI omission.

## Server action/API inventory

- `actions/school.ts`: create/import students, password flag clearing, graduation, school profile edits, reports and skill validation.
- `actions/company.ts`: application status, internship requests and school request decisions; uses an admin client for writes after partial checks.
- `actions/evidence.ts`: student evidence submission/resubmission and school review.
- `actions/contact-requests.ts`: contact request creation, approval, rejection and cancellation.
- `actions/interviews.ts`: proposal, response and cancellation; proposal uses the RLS-bound client.
- API handlers: health, seed, chat, XP, streak and quest progress. **[HISTORICAL — snapshot 2026-07-26]** `/api/seed` fue eliminado en el release 2026-08-18.

## Implemented vs partial vs absent

| Capability | State | Evidence |
|---|---|---|
| One email/password login | implemented with wrong post-login contract | `login/page.tsx`, `auth-context.tsx` |
| Student creation/import | partial | `actions/school.ts`, legacy profile columns |
| Egresado as student state | absent | `profiles.role` and `DashboardEgresado` still exist |
| Company profile and corporate jobs | partial | `profiles`, `job_postings`, `/empleos` |
| School institution/memberships | absent | no dedicated tables |
| External account/freelance | absent | no account type, routes or table |
| Evidence validation/audit | partial/structural | evidence tables, triggers and verifier exist |
| Minor contact mediation | partial/structural | contact requests, RLS and verifier exist; runtime matrix pending |
| Safe public profile projection | absent | broad `profiles` SELECT policy |
| Explainable matching/readiness | implemented locally | utility modules and verifiers |
| Application timeline | implemented locally/structural | migration and verifier; runtime pending |

## Contradictions and debt

- Product target has four account types; code and DB have three plus legacy Egresado.
- Target role names are canonical lowercase account types; code uses display strings as authorization values.
- Target institution is an entity with members; current school identity is a profile ID.
- Target has common opportunities; current model splits jobs and internship requests.
- Target anonymous browsing is read-only and filtered; current profile policy is broad and authenticated-oriented.
- Target routes are server-guarded; current pages are client-guarded or only session-guarded.
- Existing docs describe Egresado as a role and claim broader verification than the code proves.
- Current Git workflow says direct work on `main`, while the requested restructuring calls for a sequential integration branch strategy. This must be resolved before Phase 1 branch work.

## Incremental migration plan

1. Identity contract: add canonical account types, student stage, schools, memberships and external profile with backfill/reporting; keep legacy columns until runtime verification.
2. Server authorization: add session/account/membership/resource guards and canonical redirect resolver; remove role choice from registration flows and gate demos.
3. Route foundations: add public and persona layouts while keeping existing routes as compatibility surfaces.
4. Student space: move existing profile, feed, evidence, opportunities, applications, messages and notifications behind the student contract.
5. School space: move administration, import, validation and contact workflows to institution membership scope.
6. Company space: split company profile, talent, opportunities, applicants, interviews and messaging.
7. External/public space: add safe public projection, external registration and freelance publishing/proposals.
8. Opportunity unification: create `opportunities`, backfill company jobs, add freelance, map applications and preserve timeline IDs.
9. Hardening: runtime RLS, public-data audit, E2E persona matrix, accessibility/mobile checks, CI and deployment runbook.

Every schema step must be a new idempotent migration with preflight counts, rollback notes and staging verification. No historical migration or reset snapshot is deleted.

## Phase 1 gate

Phase 1 may start only after this audit package is accepted and the branch policy is explicitly selected. It must begin with identity/membership schema design and its negative RLS tests, not dashboards or broad UI redesign.
