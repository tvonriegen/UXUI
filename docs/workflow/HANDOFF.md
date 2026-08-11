# TalentHub Project Handoff

- Date: 2026-08-05
- Author: docs agent
- Branch: `stabilization/release-readiness`
- HEAD: `be3ed9e` (`chore: remove remaining ClassLink branding references`) — same commit as `main`; no new commits in this docs pass.
- Base: `main` / `origin/main` — synchronized. The `stabilization/release-readiness` branch sits at `main`'s HEAD; the docs pass produced documentation-only changes. The branch as a whole carries an uncommitted Phase 1 code change (`apps/web/src/test/setup.ts`) authored by the implementer earlier in this same release-readiness mission, plus the documentation changes produced by this docs pass. The docs pass did not introduce that code change — it was on disk already when the docs pass started.
- Worktree state: when the docs pass started, the working tree already carried two modified files — `M apps/web/src/test/setup.ts` (the Phase 1 test:release green-baseline fix implemented by the implementer earlier in this mission: deterministic `localStorage` stub) and `M docs/workflow/HANDOFF.md` (a pre-existing rewrite from the 2026-08-04 session). Both are uncommitted; the documentation-only diff produced by this docs pass is also uncommitted. No commit, no push.
- Scope: full project diagnosis for the next contributor or session, incorporating the QA and security review results from the same mission, the release-readiness Phase 0 (IN PROGRESS) and Phase 1 (APPROVED WITH OBSERVATIONS locally) verdicts, and the corrections to the claims in the previous handoff that drifted relative to the 2026-08-05 re-verification. The Phase 1 implementation (the `setup.ts` change) is the implementer's work in this mission; the documentation changes are the docs pass's work in this mission.

This document is the consolidated handoff for the TalentHub repository. It replaces and supersedes the previous `HANDOFF.md` (dated 2026-07-30 at `f502b9d` and rewritten on 2026-08-04) and brings every workflow record back into a single source of truth. Detailed evidence for each section is linked; nothing in this file is intended to be a copy of those sources, but rather a coordinated summary with explicit pointers.

The discipline of this file follows `docs/git/GIT_WORKFLOW.md`: every section separates **Facts** (verified by reading the repository in this session), **Inferences** (reasonable conclusions drawn from those facts) and **Recommendations** (suggested next steps not yet committed). The corrections made on 2026-08-05 are scoped: the conceptual content of the previous handoff is preserved, and only the claims that drifted relative to the 2026-08-05 re-verification are updated (branch, audit numbers, baseline, Node version, MCP Supabase behaviour, Playwright blocker, Phase 1 result).

---

## 1. Mission and Product Pillars

### 1.1 Fact

TalentHub is a Next.js + Supabase platform that connects technical-professional students, graduates, schools, companies and external clients through explainable matching, verified profiles and assisted applications. The product is in a four-persona restructuring phase (Student, Company, School, External), moving incrementally from a shared role-aware application.

Source: `README.md`, `docs/product/PRODUCT_BRIEF.md`, `docs/product/PRODUCT_DEFINITION.md`, `docs/product/PERSONAS.md`, `docs/architecture/ROLE_MODEL.md`.

### 1.2 Historical

- 2026-07-05: workspace reorganized under `apps/web`, `supabase`, `docs`, `scripts`. Recorded in `CHANGELOG.md`.
- 2026-07-26: integrated the TalentHub workspace, privacy routing, explainable matching, application readiness, interview hardening, `SEED_SECRET` protection and the visual rebrand into `main` via direct merge (`fffcae4` and `34e21205` from `foundation/identity-access`).
- 2026-07-29: production feed RPCs restored through three tracked forward migrations; Supabase Auth leaked-password protection advisor warning remains.
- 2026-07-30: `student_profiles` reconciliation migration applied (`20260730002712_reconcile_student_profiles`).
- 2026-08-04 (this session): final branding references removed, Google Analytics consent restored on reload, public signup aligned to student journey, handoff refreshed.

### 1.3 Recommendation

- Do not refactor the product pillars again. Every new section should map to one of: explainable compatibility, evidence-backed profile, assisted application.

---

## 2. Repository State

### 2.1 Fact (verified 2026-08-05)

```
UXUI/
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── .env.example                    (not read; secrets policy)
├── .gitignore
├── .github/workflows/              ci.yml, runtime-security.yml, runtime-smoke.yml, web-quality.yml
├── apps/
│   └── web/                        Next.js 14 App Router
│       ├── e2e/                    Playwright (auth.spec.ts, public-routes.spec.ts)
│       ├── src/
│       │   ├── app/                64 routes (Next.js build log)
│       │   ├── components/         19 feature folders
│       │   ├── lib/                clients, auth, schemas, services, hooks, utils
│       │   ├── middleware.ts
│       │   └── test/               vitest setup
│       ├── next.config.js
│       ├── package.json
│       ├── playwright.config.ts
│       ├── postcss.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── vitest.config.ts
├── docs/
│   ├── architecture/               (audit, role/route/authorization matrix, data model, ADRs, security model)
│   ├── git/                        (GIT_WORKFLOW.md, COMMIT_CONVENTION.md)
│   ├── product/                    (brief, personas, journeys, decisions, value prop)
│   ├── qa/                         (checklist, runtime security runbook, RLS test matrix, testing strategy, persona test matrix)
│   ├── requirements/               (functional, non-functional, traceability)
│   ├── roadmap/                    ROADMAP.md
│   ├── technical/                  (known issues, tech debt, refactoring plan, runbook, staging setup, supabase feed runtime reconciliation, codebase-memory-mcp)
│   └── workflow/                   (HANDOFF.md, STATUS.md, NEXT_ACTIONS.md, OPEN_QUESTIONS.md, PR_TRACKER.md, SESSION_LOG.md, DECISION_LOG.md)
├── package.json                    workspace root with `npm --prefix apps/web` scripts
├── scripts/                        17 verification scripts (see §6)
├── supabase/
│   ├── config.toml
│   ├── full_reset.sql              controlled reset helper
│   ├── migrations/                 42 files (oldest 20260331000001, newest 20260730002712)
│   ├── schema.sql                  snapshot of the touched/current security sections
│   ├── seed/                       seed.sql
│   └── README.md
└── vercel.json
```

- Repository is a small workspace; only one app (`apps/web`) and one database folder (`supabase`) currently exist. `docs/architecture/TARGET_ARCHITECTURE.md` confirms "keep one web app in `apps/web` until another app is justified".
- Top-level `package.json` orchestrates the workspace and exposes 16 `verify:*` scripts plus `install:web`, `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `test:e2e:chromium`, `test:release`, `clean`, and the comprehensive `verify:release`.
- Engines: `node >=22.0.0`, `npm >=10.0.0`.

### 2.2 Fact — codebase-memory-mcp

- The project is indexed in `codebase-memory-mcp` under key `home-brunoc-dev-uxui-UXUI`: **2,316 nodes / 3,702 edges / ~6.7 MB**.
- Indexing is in moderate mode (recommended in `docs/technical/CODEBASE_MEMORY_MCP.md`).
- The local repository does not commit the index; it is intentionally excluded by `.gitignore` (`.codebase-memory/`).

### 2.3 Inference

- The repo is well structured for incremental work; every new feature has an obvious home (`src/app/<persona>`, `src/lib/services/<domain>`, `scripts/verify-<feature>.mjs`).
- The lack of a `packages/` or `services/` layer is intentional for the current scale; introducing one would be premature.

---

## 3. Tech Stack and Architecture Snapshot

### 3.1 Fact — runtime stack

- **Web framework:** Next.js `^14.2.0` with the App Router (`apps/web/src/app`).
- **Language:** TypeScript `^5.4.0` (strict, `tsc --noEmit` for typecheck).
- **UI:** React `^18.3.0`, Tailwind `^3.4.3`, PostCSS, autoprefixer, lucide-react icons.
- **Forms / validation:** Zod `^4.3.6`; `isomorphic-dompurify` and `browser-image-compression` for client-side safety/perf.
- **Backend:** Supabase (`@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.100.1`) split into `src/lib/supabase.ts` (browser) and `src/lib/supabase-server.ts` (server, RLS-bound).
- **Auth:** email/password via Supabase Auth; middleware enforces canonical `account_type`.
- **Optional AI:** `@anthropic-ai/sdk ^0.92.0` gated by `NEXT_PUBLIC_ENABLE_AI_CHAT` and a server flag — currently disabled by default per `apps/web/next.config.js` and `docs/architecture/SECURITY_MODEL.md`.
- **Observability:** Sentry (`@sentry/nextjs ^10.47.0`), Pino logger.
- **Tests:** Vitest `^4.1.10` (unit/component), Testing Library (`@testing-library/react`, `jest-dom`, `user-event`), Playwright `^1.62.0` with two suites (`auth`, `public-routes`).
- **Lint/format:** ESLint 8 with `eslint-config-next`, `tsc` for typecheck.
- **Deployment:** Vercel with committed `vercel.json` (`framework: nextjs`, `installCommand: npm install`, `buildCommand: npm run build`).

Source: `apps/web/package.json`, `apps/web/next.config.js`, `vercel.json`, `docs/architecture/CODEBASE_MAP.md`, `docs/architecture/SECURITY_MODEL.md`.

### 3.2 Fact — application boundaries

- `apps/web/src/app`: 64 routes covering public exploration, auth (login/register/change-password), four persona spaces (student, company, school, external), and legacy aliases (`/profile`, `/muro`, `/empleos`, `/talent`, `/administracion`, `/messages`, `/notifications`, `/settings`).
- `apps/web/src/components`: 19 feature folders — `admin`, `analytics`, `ats`, `chat`, `contact-routing`, `dashboard`, `feed`, `gamification`, `layout`, `messaging`, `notifications`, `opportunities`, `profile`, `radar`, `school`, `settings`, `talent`, `ui` and a dedicated `feed/FeedPage.tsx` driving trending tags, like toggling and comments.
- `apps/web/src/lib`: `supabase.ts`, `supabase-server.ts`, `auth-context.tsx`, `auth-server.ts`, `role-context.tsx`, `data.ts`, `env.ts`, `schemas.ts`, `services/`, `hooks/`, `utils/`, `specialties.ts`, `types.ts`, `rate-limit.ts`, plus unit tests.
- Domain hotspots: `apps/web/src/lib/utils/matching.ts`, `application-readiness.ts`, `services/`, `contact-routing/`, `app/actions/interviews.ts` (see `docs/architecture/CODEBASE_MAP.md`).

### 3.3 Fact — middleware and account guards

- `apps/web/src/middleware.ts` is the canonical entry for session refresh and account-type routing.
- Server actions in `src/app/actions/` perform auth.uid() checks before any mutation.
- `src/lib/auth-server.ts` and `src/lib/role-context.tsx` define the server-side `account_type` resolution; the client-side `AuthContext` reads it for navigation visibility only.

### 3.4 Inference

- The split between `supabase.ts` and `supabase-server.ts` is the architectural seam that keeps `SUPABASE_SERVICE_ROLE_KEY` out of the browser bundle.
- Navigation visibility is presentation only; the Authorization Matrix (`docs/architecture/AUTHORIZATION_MATRIX.md`) is enforced in RLS, server actions and middleware.
- The biggest concentration of risk remains the legacy `/profile` route (2,951 lines), `/muro`, `/administracion` and `/empleos` — all still partially role-aware.

---

## 4. Domain Flows (per persona)

### 4.1 Fact — public flow

Routes: `/`, `/explore`, `/explore/students`, `/explore/students/[id]`, `/freelance`, `/freelance/[id]`, `/how-it-works`, `/login`, `/register`, `/privacy`, `/terms`.

- Anonymous users see a public projection of students and open freelance opportunities (`docs/architecture/DATA_MODEL.md`, `20260726000008_public_student_projection.sql` + `20260726000009_public_student_projection_invoker.sql`).
- Public signup form is restricted to Student and Company; the External flow is reserved for existing client routes (`docs/technical/KNOWN_ISSUES.md`).
- Google Analytics consent is gated by a user-controlled banner; consent state is restored on full reload (`e872844`).
- Playwright smoke suite `apps/web/e2e/public-routes.spec.ts` covers hydration and 404/500 routes.

### 4.2 Fact — Student flow

Routes: `/student/dashboard`, `/student/profile`, `/student/feed`, `/student/opportunities`, `/student/applications`, `/student/activities`, `/student/messages`, `/student/notifications`, `/student/settings`.

- Guard: `account_type = student`, active account, stage-aware policy (`docs/architecture/ROUTE_MAP.md`).
- Stage is `enrolled | internship | graduated`; `graduated` is not a separate account type (`docs/qa/TESTING_STRATEGY.md`).
- The graduated legacy role `Egresado` continues to be represented in the historical DB role column; the migration plan collapses it to `student_stage = graduated` (`docs/architecture/PHASE_0_AUDIT.md`).
- Self-registration temporarily sets `email_confirm = true` to allow immediate login; this is a pre-production shortcut recorded in `docs/technical/KNOWN_ISSUES.md` and must be reverted before production hardening.

### 4.3 Fact — Company flow

Routes: `/company/dashboard`, `/company/profile`, `/company/talent`, `/company/jobs`, `/company/jobs/[id]`, `/company/applicants`, `/company/interviews`, `/company/messages`, `/company/notifications`, `/company/settings`.

- Guard: `account_type = company`, owner/member scope.
- Opportunity creation is on canonical `opportunities`; `job_postings` dual-read/double-write still exists during migration (`docs/technical/KNOWN_ISSUES.md`, `docs/workflow/NEXT_ACTIONS.md`).
- The corporate ATS lives in `apps/web/src/components/ats/`.
- `proposeInterview`, `respondInterview` and `cancelInterview` use the RLS-constrained server-action client bound to `auth.uid()` (`docs/architecture/SECURITY_MODEL.md` PR 1B).
- Interview status transitions are database-enforced (`20260726000001_interviews_status_transitions.sql`, `trg_interviews_guard_status`).

### 4.4 Fact — School flow

Routes: `/school/dashboard`, `/school/students`, `/school/students/[id]`, `/school/import`, `/school/validations`, `/school/contact-requests`, `/school/internships`, `/school/companies`, `/school/metrics`, `/school/feed`, `/school/settings`.

- Guard: active `school_members` membership with the right `member_role`.
- School mediation gates company↔minor contact via `contact_requests` (status `pending`/`approved`/`rejected`) — `20260705000001_contact_requests.sql` and `20260705000002_interviews_privacy_rls.sql`.
- School approval may reuse or create the canonical company↔student conversation on approval (`docs/architecture/SECURITY_MODEL.md` M5 / C2).
- `internship_requests` is still a separate school approval workflow and is not yet mapped to a public `opportunity` (`20260726000014_map_internship_requests.sql`).

### 4.5 Fact — External flow

Routes: `/external/dashboard`, `/external/profile`, `/external/jobs`, `/external/jobs/new`, `/external/jobs/[id]`, `/external/proposals`, `/external/messages`, `/external/settings`.

- Guard: `account_type = external`; verified email required to publish (`docs/architecture/ROUTE_MAP.md`).
- An external publisher may only create `freelance` opportunities and cannot read corporate ATS interviews (`docs/architecture/AUTHORIZATION_MATRIX.md`, `docs/architecture/SECURITY_MODEL.md`).
- Signup is paused for the external persona; existing clients use the existing client routes.

### 4.6 Inference

- Each persona has the same navigation shape, but data authorization and capability surfaces are different. Any future "feature parity" claim must respect the matrix.
- The four personas together cover every table touched in `docs/architecture/AUTHORIZATION_MATRIX.md`. New tables or features must update the matrix before merging.

---

## 5. Supabase State

### 5.1 Fact — schema source

- `supabase/migrations/` is the canonical, executable source. 42 migrations on disk.
- `supabase/schema.sql` is a derived snapshot regenerated only for the sections the active PRs touch; `KNOWN_ISSUES.md` records the residual drift.
- `supabase/full_reset.sql` is a controlled reset helper; it is not meant to be replayed against production.

### 5.2 Fact — local migration history (oldest → newest, abbreviated)

```
20260331000001 indexes_and_rls
20260409000001 step1_missing_columns_and_tables
20260410000001 storage_rls
20260410000002 job_postings_max_candidates
20260410000003 audit_fixes
20260410000004 create_storage_buckets
20260410000005 update_specialties
20260413000001 rubric_features
20260413000002 job_visibility_and_activities
20260415000001 company_follows
20260415000002 reputation_and_triggers
20260415000003 rpcs_and_fixes
20260421000001 ats_and_company_enhancements
20260421000002 fix_award_badge_type
20260423000001 profile_customization
20260424000001 gamification_overhaul
20260424000002 interviews_and_timeline
20260424000003 tech_radar
20260430000001 student_profile_expansion
20260705000001 contact_requests                 (PR 1 contact routing)
20260705000002 interviews_privacy_rls          (PR 1B interview INSERT hardening)
20260713000001 rebrand_existing_notifications
20260726000001 interviews_status_transitions
20260726000002 application_readiness_timeline
20260726000003 phase3_security_alignment
20260726000004 verified_profile_evidence
20260726000005 function_grants_and_search_paths
20260726000006 policy_qualification_and_function_grants
20260726000007 canonical_identity_access
20260726000008 public_student_projection
20260726000009 public_student_projection_invoker
20260726000010 revoke_public_identity_helpers
20260726000011 common_opportunities
20260726000012 lock_legacy_opportunity_links
20260726000013 freelance_proposals
20260726000014 map_internship_requests
20260728000001 harden_profile_reviewer_function
(+ feed RPC restoration migrations applied remotely but not in the local filename list)
20260730002712 reconcile_student_profiles       (referenced by HANDOFF prior, applied remotely)
```

### 5.3 Fact — remote production (per `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md`)

- Project URL: `https://eghskwwupruomiactvji.supabase.co` (per `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md`; this session did not re-verify it live — see §5.4 and §5.6).
- PostgreSQL version: `17.6`.
- Remote migration history: 22 entries; the three feed RPC records are stamped `20260729221936`, `20260729221955`, `20260729222020`.
- Remote public tables have RLS enabled on every inspected table.
- The public view `public_student_profiles` is `security_invoker=true`, `security_barrier=true`.
- `get_trending_tags`, `toggle_post_like`, `add_post_comment` are present in `pg_proc`; mutating RPCs are `SECURITY INVOKER`, with `auth.uid()` enforced against `p_user_id`, fixed `search_path = pg_catalog, public`, `PUBLIC`/`anon` revoked, only `authenticated` granted `EXECUTE`.
- Triggers `sync_likes_count` and `sync_comments_count` own the counter updates and remain `SECURITY DEFINER` with a fixed search path (private path, not callable as RPCs).
- Supabase Auth still reports leaked-password protection disabled (advisor warning only; not a security regression on its own).

### 5.4 Fact — MCP Supabase direct access in this session

- `supabase_get_advisors(type=performance)` → `{result:{lints:[]}}` (success, empty lint list).
- `supabase_get_advisors(type=security)` → `Unauthorized`.
- `supabase_get_project_url()` → `Unauthorized`.
- `supabase_list_tables(schemas=[public], verbose=true)` → `Unauthorized`.
- `supabase_list_migrations()` → `Unauthorized`.
- `supabase_list_extensions()` → `Unauthorized`.
- `supabase_execute_sql(...)` was **not invoked** in this docs pass; no result to report.
- **Historical (2026-08-04 handoff, separate call window, not this session):** the same `list_tables` / `list_migrations` / `list_extensions` / `execute_sql` calls previously returned `HttpException: Failed to run sql query: Connection terminated due to connection timeout` per the previous handoff. That timeout class is recorded in `docs/technical/KNOWN_ISSUES.md` for traceability and is **not** the result of any call in the current docs pass.
- The introspection calls did not recover within the docs pass window. The remote production state in §5.3 is therefore the last *known* snapshot from the reconciliation doc dated 2026-07-29 and the previous HANDOFF dated 2026-07-30; the table/migration/extension surface has **not** been re-verified live in this handoff session.
- Codebase-memory-mcp and the local filesystem are the only authoritative sources used to write the structural parts of this document.

### 5.5 Inference

- The 42-vs-22 migration count divergence is the documented **migration drift** (`docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md`, "Migration Drift Diff"). The remote history is the operational baseline; the local folder is not a replayable representation of production.
- Schema snapshots in `supabase/schema.sql` and `supabase/full_reset.sql` contain historical drift outside the current security sections; this is recorded in `docs/technical/KNOWN_ISSUES.md` and not a regression introduced in this handoff.

### 5.6 Recommendation

- Re-run `supabase_list_tables`, `supabase_list_migrations`, `supabase_get_advisors(type=security)` and `supabase_get_advisors(type=performance)` from a fresh session before the next migration. The project URL in `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md` (`https://eghskwwupruomiactvji.supabase.co`) was not re-verified in this session and should be confirmed via `supabase_get_project_url` before any new config or migration depends on it.
- Continue to treat the local migration folder as historically non-replayable; new work must be additive forward migrations only.

---

## 6. Verification, Tests and CI

### 6.1 Fact — verification results from this session (2026-08-05)

- Runtime: **Node v26.2.0 / npm 11.13.0**. This is the only Node baseline available on this machine (`mise` lists `26`, `26.2`, `26.2.0`); **Node 22 is not available locally**, so the green chain achieved this session has not been reproduced on the CI Node 22 baseline. The CI Node 22 re-run is the binding gate for closing Phase 1.
- `npm ci` at the workspace root and in `apps/web`: OK (from the previous handoff; not re-run in this session — the working tree change is documentation-only and `package.json` / `package-lock.json` are unchanged).
- `npm run lint` (Next.js ESLint): OK.
- `npm run typecheck` (`tsc --noEmit`): OK.
- `npm run build` (Next.js production build): OK, **65 pages generated**.
- Vitest unit/component (`npm test`): **31 passed / 31 total**, 8 test files. Re-run immediately after: **31 passed / 31 total** again. No flakes observed. The previous handoff's three `apps/web/src/lib/analytics.test.ts` failures are resolved locally by the uncommitted change to `apps/web/src/test/setup.ts` (Phase 1 implementation, authored by the implementer earlier in this mission), which installs a deterministic in-memory `Storage` on `window.localStorage` and `globalThis.localStorage` with a `beforeEach` clear. The `matchMedia` stub from the prior commit is preserved. The docs pass did not author the `setup.ts` change; it was on disk already when the docs pass started.
- `npm run test:release` (chain: `lint + typecheck + test + build`): **OK** in this session. The previous handoff reported `test:release` as failing for the same `analytics.test.ts` reason; that is no longer the case.
- `npm run verify:release` (chain: `lint + typecheck + test + build` plus the 12 structural verifiers): **OK** in this session. `verify:is-minor` (7 cases), `verify:contact-policy` (8 cases), `verify:interviews-privacy-rls` (25 invariants), `verify:explainable-match` (9 cases), `verify:application-readiness` (15 cases), `verify:readiness-timeline` (9 invariants), `verify:profile-evidence` (3 completeness + 7 migration invariants), `verify:phase3-security` (15 invariants), `verify:function-grants` (6 invariants), `verify:identity-access`, `verify:opportunities`, `verify:feed-rpcs` all pass.
- `git diff --check`: OK on the pre-existing diff (trailing whitespace / conflict-marker clean).
- `npm audit --omit=optional` at the workspace root: **0 vulnerabilities**. The only root dev-dependency is the Supabase CLI and it has no reported advisories in this tree.
- `npm audit --omit=optional` inside `apps/web`: **20 vulnerabilities** — **1 low, 9 moderate, 10 high**. No critical. The previous handoff's "20 vulnerabilities total" line is now split: the binding count for triage is the `apps/web` audit, not the root audit.
- `npm run test:e2e:chromium` (Playwright): **executed and blocked at the `webServer` phase in this session**. Root cause: `apps/web/.env.local` is **absent**, and `playwright.config.ts` boots a local web server with `npm run dev -- --hostname 127.0.0.1 --port 3000`; the dev server requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so the `webServer` phase fails before any browser scenario runs. No browser scenario was executed; the prior Chromium coverage from the 2026-07-30 handoff is not re-affirmed in this session. Provisioning `apps/web/.env.local` from `.env.example` (or from staging secrets) is a precondition for any local Playwright run.
- `npm run verify:runtime-opportunities`, `verify:runtime-feed-rpcs`, `verify:runtime-security`, `verify:runtime-supabase`: **NOT executed**. These run against a separate free staging project that has not been provisioned in this session; they must never target production. See §9.
- Remote Supabase mutations: **NOT performed**. No staging fixtures were created, no `RUNTIME_*` secrets were configured, and the `Runtime Security Smoke Tests` and `Runtime Supabase Smoke` GitHub Actions workflows were not triggered.

### 6.2 Fact — GitHub Actions workflows (`.github/workflows/`)

- `ci.yml`: push/PR CI.
- `web-quality.yml`: lint, typecheck, build, Vitest, Playwright Chromium.
- `runtime-security.yml`: manual trigger; runs `verify:runtime-security`.
- `runtime-smoke.yml`: manual trigger; runs `verify:runtime-supabase` and the `RUNTIME_*` matrix.

### 6.3 Fact — Playwright coverage

- `apps/web/e2e/auth.spec.ts` covers the auth flow hydration and registration selection.
- `apps/web/e2e/public-routes.spec.ts` exercises public landing, exploration, freelance and 404/500 routes against a local web server.

### 6.4 Inference

- The `verify:release` script chains all structural checks; running it on `main` (or, in this session, on `stabilization/release-readiness` at the same commit) is the closest one-shot local proxy for the production gate. In this session, `verify:release` is **green on Node 26.2.0**. It is **not** the same as a CI green run on Node 22, which is the binding baseline.
- The runtime checks are intentionally not in push CI because they require authenticated staging fixtures; they only run when manually triggered in a `staging` GitHub environment.
- The `analytics.test.ts` fix lives in the test harness: a deterministic `Storage` stub installed in `apps/web/src/test/setup.ts` so that `window.localStorage` and `globalThis.localStorage` resolve under Node 26 / jsdom. The production `analytics.ts` call to `window.localStorage` works in real browsers (the consent banner is verified manually in production per `e872844 fix: restore Google Analytics consent after reload`); the stub is therefore a test-environment fix, not a product change. See §10.2.

### 6.5 Fact — what this docs pass did and did not do (2026-08-05)

- **Executed in this docs pass:** `npm run lint`, `npm run typecheck`, `npm test` (twice, 31/31 each time), `npm run build` (65 pages), `npm run test:release`, `npm run verify:release` (all 12 structural verifiers), `git diff --check`, `npm audit --omit=optional` at the root and inside `apps/web`, `npm run test:e2e:chromium` (executed, blocked at the Playwright `webServer` phase — see §6.1), MCP Supabase `get_advisors(type=security)` (→ `Unauthorized`), `get_advisors(type=performance)` (→ `{result:{lints:[]}}`), `get_project_url()` (→ `Unauthorized`), `list_tables` (→ `Unauthorized`), `list_migrations` (→ `Unauthorized`), `list_extensions` (→ `Unauthorized`). Documentation-only updates to `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, `docs/workflow/SESSION_LOG.md`, `docs/technical/KNOWN_ISSUES.md` and `docs/workflow/HANDOFF.md`. No code, schema, configuration, dependency, migration or workflow command was modified by this docs pass.
- **Phase 1 (code change, on disk when the docs pass started, authored by the implementer earlier in this mission):** the uncommitted modification to `apps/web/src/test/setup.ts` that installs the deterministic `localStorage` stub. The docs pass did not author it; it was on disk already. It must be committed together with this documentation under a `test:` prefix.
- **Blocked / skipped:** all `verify:runtime-*` scripts (no staging project), manual GitHub Actions triggers, remote mutations of any kind.
- **Not invoked in this docs pass:** `supabase_execute_sql(...)` — the docs pass did not call `execute_sql`, so there is no result to report for that tool. The `Unauthorized` / empty-lint split above is the complete picture for the MCP tools that were actually called.

### 6.6 Recommendation

- Before the next code change, re-run the local static verification chain (`npm run lint && npm run typecheck && npm test && npm run build && npm run test:release && npm run verify:release`) and `git diff --check` to confirm the green baseline survives the new commit. The CI Node 22 baseline must be re-run separately; the local Node 26 baseline is not a substitute.

---

## 7. Git State

### 7.1 Fact — branches and remotes (2026-08-05)

> The current working branch is `stabilization/release-readiness`, sitting at the same commit as `main` (`be3ed9e`). The branch has no new commits in this session; the only changes on the branch are uncommitted (pre-existing `M apps/web/src/test/setup.ts` and the documentation diff produced by this session). See §13.1 and the header for the nuance.

```
$ git status
On branch stabilization/release-readiness
Changes not staged for commit:
  modified:   apps/web/src/test/setup.ts
  modified:   docs/workflow/HANDOFF.md
  modified:   docs/workflow/STATUS.md
  modified:   docs/workflow/NEXT_ACTIONS.md
  modified:   docs/workflow/SESSION_LOG.md
  modified:   docs/technical/KNOWN_ISSUES.md

$ git branch --show-current
stabilization/release-readiness

$ git branch -a
* stabilization/release-readiness
  main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/origin/fix/supabase-feed-runtime-reconciliation
  remotes/origin/foundation/identity-access

$ git log --oneline -10 main
be3ed9e chore: remove remaining ClassLink branding references
e872844 fix: restore Google Analytics consent after reload
1b6ba13 docs: refresh project handoff
f502b9d docs: record external deployment checks
1819f90 feat: align public signup with student journey
b3bfd2b Update vercel.json
df9d0bb Update vercel.json
9e8596d Revert "fix: elimina package-lock para forzar npm install en Vercel"
513d96d fix: elimina package-lock para forzar package-lock forzado en Vercel
5201c0b fix: align password policy and identity guards
```

- `git rev-parse HEAD`: `be3ed9e` (same as `main`). No new commits on `stabilization/release-readiness` in this session.
- `git diff main..HEAD`: empty. The branch is at `main`; the only differences are uncommitted working-tree changes.
- Remote `fix/supabase-feed-runtime-reconciliation` HEAD: `aacad8f fix: prepare production release and feed runtime` (ahead of `main` at the time of writing; not merged).
- Remote `foundation/identity-access` HEAD: `64e16fd docs: define runtime security gate` (fully merged into `main` via `fffcae4`).
- `git reflog` shows only the initial clone and the current branch checkout; no local rebases/amends recorded.
- `git stash list` is empty.
- `git shortlog -sn --all` (top 5): replenque 80, Bruno Caro Maturana 76, tvonriegen 7, Vicente Rodríguez 2, ijaenc 2.

### 7.2 Fact — commit convention

`docs/git/COMMIT_CONVENTION.md` is enforced: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`. The recent `main` history follows this convention with two exceptions: the `Update vercel.json` and `Revert "fix: elimina package-lock para forzar npm install en Vercel"` commits (`b3bfd2b`, `df9d0bb`, `9e8596d`, `513d96d`) are merged via the Vercel GitHub integration and use a different format.

### 7.3 Inference

- The two-format commit history is a side effect of the Vercel GitHub app pushing config updates directly. Consider documenting that exception in `COMMIT_CONVENTION.md` if it continues.
- `fix/supabase-feed-runtime-reconciliation` is the only active remote feature branch; it must be either merged (after the migration history baseline strategy) or removed in a future cleanup.

### 7.4 Recommendation

- Do not start new work on `main` until the next contributor reviews §5 and §6 with a working Supabase MCP connection. New work should land on a short-lived branch from `main` and be integrated via a `git merge --no-ff` per `docs/git/GIT_WORKFLOW.md`.
- Clean up `fix/supabase-feed-runtime-reconciliation` once the production feed RPC verification is complete and the branch is either merged or rebased onto a verified baseline.

---

## 8. Known Risks and Open Questions

### 8.1 Fact — consolidated known risks

#### 8.1.a Operational / data risks (from `docs/technical/KNOWN_ISSUES.md`, this session, and prior HANDOFF)

- Authenticated `profiles` SELECT compatibility reads remain broad during dual-read migration; only anonymous reads use the public projection.
- `apps/web/src/app/profile/page.tsx` (2,951 lines), `muro/page.tsx`, `administracion/page.tsx` and `empleos/page.tsx` are oversized legacy routes still coexisting with the new persona routes.
- Dedicated persona routes re-export tested legacy components in several places; the extraction is incremental.
- Legacy `job_postings` reads/writes still exist during dual-read migration; the canonical `opportunities` and the `opportunity_legacy_links` mapping backfill them.
- The local Supabase CLI is unavailable; remote migrations use Supabase MCP, which returned `Unauthorized` in this docs pass (§5.4) for `get_project_url`, `list_tables`, `list_migrations`, `list_extensions` and `get_advisors(type=security)` (and `{result:{lints:[]}}` for `get_advisors(type=performance)`; `execute_sql` was not invoked). The `connection timeout` class recorded in the previous handoff is historical and is not the result of any call in the current docs pass.
- Supabase Auth leaked-password protection is disabled (advisor warning); the RLS helper surface is private and not callable through the public RPC endpoints.
- The connected Supabase project is production. The second free staging project is documented in `docs/technical/STAGING_SETUP.md` but has not been provisioned yet.
- Production feed RPCs are restored through three tracked forward migrations, but authenticated write smoke testing remains pending because no staging project exists.
- The local migration directory is not a replayable copy of production; do not run `db push` or `migration repair` against production until the baseline strategy in `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md` is completed.
- Supabase Preview fails because remote migration versions are absent under the local filenames; this is migration-history drift, not a proven application regression.
- Vercel deployment `uxui-sxfl` failed; the primary `uxui` and `uxui-jad2` checks succeed. The failure appears to be an external project-specific issue and requires Vercel project access to diagnose.
- The dependency tree currently reports **20 vulnerabilities** via `npm audit --omit=optional` **inside `apps/web`** (1 low, 9 moderate, 10 high). The workspace root reports 0 vulnerabilities because its only dev-dep is the Supabase CLI, which has no advisories in this tree — see §6.1. The 20 / 0 split was re-verified 2026-08-05; the previous "20 total" line conflated the two scopes. They were not auto-fixed to avoid unplanned upgrades (`docs/workflow/OPEN_QUESTIONS.md` Q3).
- The current GitHub OAuth token lacks the `workflow` scope, so `git push origin main` is rejected while publishing `.github/workflows/ci.yml` (`docs/technical/KNOWN_ISSUES.md`).
- Public self-registration temporarily sets `email_confirm = true` so users can log in immediately; restore email verification before production hardening.
- Public registration is temporarily limited to Student and Company; external client routes remain reserved and not exposed by the signup form.
- The Vercel check associated with historical PR #2 failed under a project owned by another account. The privacy implementation was locally validated and is now integrated; the old deployment issue is not treated as a current code failure.

#### 8.1.b Security review findings from this session (open, NOT yet validated against a live Supabase)

> **Status: review findings requiring validation and fix. They are not resolved.** They come from the security agent's static review of the repository in this session. Each item needs (a) confirmation against a live staging environment where applicable, and (b) an explicit fix commit before the production gate.

**CRITICAL — broad authenticated `profiles` SELECT.**
The current authenticated `profiles` SELECT policy is broad enough to expose sensitive student fields to any signed-in user, not just the owning student or authorized accounts. The Phase 0 audit (`docs/architecture/PHASE_0_AUDIT.md`) and the live Supabase advisors recorded this in earlier sessions. The previous HANDOFF dates it as "broad compatibility reads during dual-read migration" but the migration has not yet narrowed it. **Required:** tighten the policy to the Authorization Matrix (`docs/architecture/AUTHORIZATION_MATRIX.md`) and re-run `verify:identity-access` and `verify:runtime-security` against staging.

**CRITICAL — `updateApplicationStatusSA` updates by `applicationId` without binding `jobId`.**
Located in `apps/web/src/app/actions/company.ts` (around line 106). The action signature receives `applicationId` and `jobId`, validates the job against the calling company, then performs the application update **via the admin client** (line 146 `createAdminClient()`, line 156 `admin.from("job_applications").update(...).eq("id", applicationId)`). The admin client does not enforce the RLS that ties an `applicationId` to a `jobId` owned by the caller. A company that knows or guesses an `applicationId` from a job it does not own can potentially update the status. The `jobId` parameter is fetched and validated for `max_candidates`, but the update itself is not constrained to that `jobId`. **Required:** constrain the update to `eq("id", applicationId).eq("job_id", jobId)` on the RLS-constrained server-action client, drop the admin-client branch on this path, and add a structural verifier case.

**HIGH — in-memory rate limiter.**
The rate limiter (`apps/web/src/lib/rate-limit.ts`) is in-memory. It does not survive process restarts and does not share state between Vercel serverless instances; an attacker can multiply the budget by the number of concurrent cold starts. **Required:** replace with a shared store (Supabase table, Upstash, or Vercel KV) before production.

**HIGH — `/api/chat` is not covered by the rate limiter.**
Even when the in-memory rate limiter is in place, the chat API route does not consume it. Combined with optional AI feature flags, this can become a cost-amplification vector. **Required:** add the rate limiter (or a stricter one) to `/api/chat` and gate it on the AI feature flags as defined in `apps/web/next.config.js`.

**HIGH — `/api/seed` and `DEMO_PASSWORD` in response.**
`apps/web/src/app/api/seed/route.ts` (line 16 `const DEMO_PASSWORD = "Demo1234!";`; lines 88, 502–505 include the password in the response). The endpoint is **guarded** by `SEED_SECRET` outside local development (line 38: `if (!isLocalDevelopment && !envSecret) ...`), and `isLocalDevelopment` is `NODE_ENV === "development" && !VERCEL`. So in any deployed environment the endpoint returns 503 when `SEED_SECRET` is missing, and the credentials are only echoed when the caller presents the secret. **Nuance for this finding:** the current guard is correct for the documented deployment topology, but the response still contains plaintext demo credentials, which is a real risk if `SEED_SECRET` is ever leaked or the guard is bypassed in a future refactor. **Required:** keep the guard, but log and audit every successful `POST /api/seed` call, and consider returning only account IDs (not passwords) in the response.

**HIGH — `contact_requests` ownership delegated only to RLS.**
The contact-routing server actions rely on the RLS policies for company/school visibility, insert, update and the minor-student's `pending` invisibility. There is no server-side double-check that the `school_members` membership is still active or that the company matches the request's `company_id` at the moment of the read. The current policies are sound in isolation, but a single future migration that loosens a predicate would be invisible to the application. **Required:** add a server-side guard in the school approval and company cancel actions that re-asserts ownership and active membership before any state change, and add a structural verifier for it.

**MEDIUM — CORS localhost fallback.**
A CORS policy that whitelists `http://localhost:*` for development can leak into deployed environments if the allowlist is read from a single environment variable. **Required:** review the CORS configuration and make the localhost fallback conditional on `NODE_ENV === "development"`; production must use an explicit origin allowlist.

**MEDIUM — service role marked optional.**
Where the service-role key is treated as optional in the client/server bootstrap, the application can silently fall back to the anon key with broader RLS consequences for the calling path. **Required:** make the service role a hard requirement on every server-only path that uses it, and fail fast with a clear error when it is missing.

**MEDIUM — HSTS header absent.**
The Next.js `apps/web/next.config.js` does not currently emit a `Strict-Transport-Security` header. **Required:** add HSTS (and re-verify the other security headers in `docs/architecture/SECURITY_MODEL.md`) before the production hardening phase.

### 8.2 Fact — open questions (`docs/workflow/OPEN_QUESTIONS.md`)

- Q1 — Supabase staging verification (open, external validation).
- Q2 — Deployment configuration (`SEED_SECRET` in every deployed environment).
- Q3 — Dependency vulnerabilities (20 reported in `apps/web`: 1 low, 9 moderate, 10 high; 0 reported at the workspace root because its only dev-dep is the Supabase CLI — re-verified 2026-08-05).
- Q4 — Schema snapshot drift (regenerate `supabase/schema.sql` for historical sections still out of sync).
- Q5 — Automated runtime tests (disposable Supabase integration tests for authorization-sensitive paths).

### 8.3 Fact — security signals observed in this docs pass (2026-08-05)

- MCP Supabase `get_advisors(type=performance)` **was invoked** in this docs pass and returned `{result:{lints:[]}}` (success, empty lint list). This is **not** equivalent to "no advisories": the linter may have nothing to report on the current remote at this moment, but the historical advisories recorded in `docs/technical/KNOWN_ISSUES.md` and `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md` (leaked-password protection disabled; pre-restoration feed RPC defects) are not erased by an empty response.
- MCP Supabase `get_advisors(type=security)`, `get_project_url()`, `list_tables`, `list_migrations` and `list_extensions` **were invoked** in this docs pass and all returned `Unauthorized`. `supabase_execute_sql(...)` was **not invoked** in this docs pass. The previous (2026-08-04) handoff recorded the same database-introspection calls returning `HttpException: Failed to run sql query: Connection terminated due to connection timeout`; that observation is preserved in `docs/technical/KNOWN_ISSUES.md` as **historical** and is **not** the result of any call in the current docs pass.
- This docs pass is **consistent** with the request-prompt framing "ahora responde Unauthorized salvo performance advisor vacío" — that is the observed behaviour in the current session.
- The remote production snapshot in §5.3 is the reconciliation-doc baseline, not a live re-verification in this docs pass.
- The prior `KNOWN_ISSUES.md` still records the leaked-password protection advisor as the only outstanding Auth warning on the dashboard.
- Local security review of the codebase (the audit findings consolidated by the security agent in the previous handoff session and listed in §8.1.b) is still open; no security review was re-run in the 2026-08-05 docs pass. The findings reference the application code and the migration folder directly.

### 8.4 Inference

- The risk profile is dominated by the **dual-read migration** and the **missing staging environment**. Either one resolved would unlock most of the remaining release gate.
- The author identity history shows a mix of `replenque` (top contributor) and `Bruno Caro Maturana`; review coordination for new work should reference `AGENTS.md` and `docs/git/GIT_WORKFLOW.md`.

### 8.5 Recommendation

- Prioritize (in order): (1) provision the second free Supabase project, (2) capture the remote schema baseline, (3) run the staging RLS/RPC matrix, (4) reconcile the migration history, (5) address leaked-password protection, (6) triage the 20 `apps/web` dependency vulnerabilities (1L/9M/10H) in a controlled maintenance change (root audit is 0; see §6.1 and `docs/technical/KNOWN_ISSUES.md`).

---

## 9. Runtime Gate (must be passed before production)

The procedure is reproduced from the previous `HANDOFF.md` and `docs/technical/STAGING_SETUP.md`; it has not been re-executed in this session.

1. Provision a second free Supabase project named `TalentHub Staging`. Never use production for fixtures. The Free plan offers two active projects per organization; Branching is a paid feature.
2. Capture a schema/functions/policies/grants baseline from production and review it against the intended application contract.
3. Do not replay the historical local migrations, run `db push` or `migration repair` against production until the baseline mapping is approved and tested in staging.
4. Apply only reviewed forward migrations after the staging baseline.
5. Set `SEED_SECRET` in the staging deployment environment; verify `/api/seed` returns `503` when deployment configuration is incomplete.
6. Run the protected `/api/seed` endpoint against disposable staging.
7. Configure the canonical `RUNTIME_*` GitHub secrets listed in `docs/qa/RUNTIME_SECURITY_RUNBOOK.md` (`RUNTIME_APP_URL`, `RUNTIME_SUPABASE_URL`, `RUNTIME_SUPABASE_ANON_KEY`, `RUNTIME_PENDING_CONTACT_REQUEST_ID`, `RUNTIME_FEED_POST_ID`, and the email/password pairs for student, company, school, external, optional second school and optional second student).
8. Trigger the `Runtime Security Smoke Tests` and `Runtime Supabase Smoke` workflows manually; record the RLS/RPC matrix and the feed RPC smoke test results.
9. Revisit the GitHub Supabase Preview check only after migration history is reconciled through the reviewed baseline.
10. Promotion gate: lint + typecheck + production build pass; all staging runtime workflows pass; Vercel Preview login and `/api/health` checks pass; production migration SQL has been reviewed separately.

---

## 10. Next Implementation Order

Re-ordered by remaining risk. The first three items are preconditions for everything else. Items 1 and 2 are now **done locally** on Node 26.2.0; the binding gate (CI Node 22, staging, runtime, security) is item 3 onwards.

### 10.1 Release-readiness hygiene (immediate)

1. **Stage and commit the documentation diff** (this file plus `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `KNOWN_ISSUES.md`) under a `docs:` prefix, together with the Phase 1 `apps/web/src/test/setup.ts` diff (authored by the implementer earlier in this mission) under a `test:` prefix. Do not push (see §13.3 step 1). The branch as a whole carries both; they are the same release-readiness change.
2. **Re-run the local static verification chain on top of the commit** to confirm the green baseline survives (`lint`, `typecheck`, `test`, `build`, `test:release`, `verify:release`, `git diff --check`) — see §13.3 step 2.
3. **Open the CI Node 22 re-run** of `.github/workflows/ci.yml` and `.github/workflows/web-quality.yml`. The local machine is Node 26 only; the green chain achieved here has not been reproduced on Node 22. The CI re-run is the binding gate for closing Phase 1 — see §13.3 step 3.

### 10.2 Test / Node compatibility (carry-over from previous handoff)

4. Re-attempt `npm run test:e2e:chromium` once `apps/web/.env.local` is in place (or against a deployed Preview). The local Supabase reachability issue is the env-file absence, not a project-side outage.
5. Audit other Node 26 surface area in the dependency tree before the next Node bump.

### 10.3 Supabase staging, baseline and RLS

6. **Provision the second free Supabase staging project** and produce the reviewed schema baseline (see §5.6 and §9).
7. **Run the staging fixture, RLS matrix and feed RPC smoke tests** (see §9).
8. **Reconcile Supabase Preview migration history** without destructive production operations.
9. **Address the security review findings** in §8.1.b in priority order: CRITICAL `profiles` SELECT and `updateApplicationStatusSA` first, then HIGH rate limiter + chat guard + `/api/seed` response shape + `contact_requests` double-check, then MEDIUM CORS / service-role / HSTS.
10. **Complete profile privacy tightening and advisor remediation** (leaked-password, broad authenticated `profiles` reads, etc.).

### 10.4 Product extraction and UX

11. **Continue Student feature extraction** from legacy pages.
12. **Split `apps/web/src/app/profile/page.tsx` and `empleos/page.tsx`** into smaller domain components and hooks (`docs/technical/REFACTORING_PLAN.md`).
13. **Add disposable Supabase integration tests** for RLS, triggers and authenticated server actions.
14. **Restore email verification** on public self-registration before production hardening.
15. **Re-enable the external signup** in `/register` once the runtime staging matrix is green.

### 10.5 Deployment and dependency hygiene

16. **Diagnose the failing `uxui-sxfl` Vercel project** or remove the stale integration.
17. **Triage the 20 `apps/web` dependency vulnerabilities** in a controlled maintenance change after staging is in place. The root 0 / `apps/web` 20 split is recorded in `STATUS.md`, `KNOWN_ISSUES.md` and `NEXT_ACTIONS.md`.

---

## 11. Future Platform Strategy (Ionic / Flutter / Laravel + React)

> **Status of this section: Recommendation, not a committed decision.**
> The repository, the product definition and the roadmap explicitly exclude native mobile apps and a full stack rewrite for the current restructuring phase. There is no in-repo decision on Ionic, Flutter or a Laravel backend. This section proposes three independent tracks the team can consider after the four-persona migration is released. Tracks are mutually compatible; the team may adopt zero, one or more than one.

### 11.1 Why this section exists

`docs/product/PRODUCT_DEFINITION.md` says: "Excluded for this restructuring: native mobile apps, payments, invoicing, digital signatures, direct transfers, digital contracts, automatic AI rejection and a full stack rewrite." The strategic conversation about whether to add a mobile surface or a backend split is a deliberate next-phase decision and is not in scope of the current restructuring. This handoff records the conversation so the next contributor does not have to rebuild it from scratch.

### 11.2 Fact — current technical baseline relevant to any future track

- The web app is a single Next.js 14 App Router project on Vercel.
- The database is a single Supabase project (Postgres 17, RLS on every inspected public table, helpers in a private schema, anon key safe to publish).
- The business logic lives in three layers: Next.js server actions (UX entrypoint), Postgres RLS (authorization), and SQL functions/triggers (state transitions).
- All four personas share the same Supabase instance and the same auth provider; the data boundary is the `account_type` column and the `account_status` column.
- 64 routes, 19 component folders, 17 verification scripts, 42 migrations, 2,316 nodes / 3,702 edges in the codebase-memory-mcp index.

### 11.3 Inference

- A second client (mobile, alternate web) can be added without changing the database boundary, because every authorization invariant is already expressed in RLS and triggers. New clients only need a Supabase anon key, a service-role key (server-only) and the same `account_type` discipline.
- A second backend (Laravel) only makes sense if a use case requires server-rendered HTML, queues, scheduled jobs, payments or a non-Supabase datastore. None of those are current product requirements; this is a deferred decision.

### 11.4 Recommendation — Track A: keep Next.js, add a PWA / Capacitor / Ionic shell

- **What it is:** wrap the existing Next.js app in a thin webview shell and add an installable PWA manifest plus push notifications. Capacitor is a natural fit because the Next.js bundle can be served from any static host while Capacitor provides native plugins (camera, share, push, biometrics).
- **Why it could work:** zero change to the database boundary, zero change to the four-persona contract, zero change to RLS. Capacitor is maintained by Ionic, so the "Ionic" label and the "Next.js + Capacitor" implementation are not mutually exclusive.
- **When to choose it:** when the team needs installable mobile apps with push notifications and the existing web app is good enough as the UI.
- **Cost:** Capacitor adds a native build pipeline (Xcode + Android Studio) and a small set of plugins. There is no change to the Supabase auth, RLS, or migration plan.
- **Open questions:** do we need push notifications? Do we need deep links into persona routes? Do we need offline draft for student evidence uploads? The answers determine the plugin set.

### 11.5 Recommendation — Track B: build a Flutter mobile app

- **What it is:** a new Dart/Flutter app that talks to the same Supabase project via `@supabase/supabase-js` (or the official `supabase-flutter` package), reusing the public projection, the canonical `account_type` and the existing RLS.
- **Why it could work:** Supabase has first-class Flutter support; the auth and data layers can be shared. Flutter gives native-feeling UI on iOS and Android without maintaining two codebases.
- **When to choose it:** when the team decides to invest in a true mobile-first experience (offline evidence, push, camera, share, geolocation) and accepts that the web app and the mobile app will diverge over time.
- **Cost:** the team must learn Dart/Flutter; CI must build iOS and Android; release pipelines must publish to App Store and Play Store. The web app remains the source of truth for the canonical four-persona contract and the RLS contract; if those contracts change, the mobile app must follow.
- **Open questions:** does the team have Flutter experience? Do we accept two release trains? Do we need the mobile app to be feature-equivalent on day one, or is Student-only acceptable for v1?

### 11.6 Recommendation — Track C: split the backend into Laravel and keep React on the front

- **What it is:** introduce a Laravel API as the canonical server-side entrypoint; keep React (Next.js or a Vite SPA) on the front; keep Supabase as a database (Laravel talks to it over the Postgres wire protocol or via REST).
- **Why it could work:** Laravel is mature for queues, scheduled jobs, payments, complex authorization, audit logs and admin tooling. The React front can stay as the canonical UX surface.
- **When to choose it:** when the product grows beyond what Next.js server actions should bear (background jobs, billing, large admin surfaces) and when Supabase's serverless functions are no longer the right home for the orchestration logic.
- **Cost:** introduces a new runtime, a new deploy pipeline, a new auth model (or a thin shim over Supabase Auth), and a new migration discipline (Laravel migrations AND Supabase migrations). This is a meaningful operational cost.
- **Open questions:** is there a concrete workload (queue + billing + admin) that justifies a second backend? If not, this track is premature. If yes, decide whether Laravel replaces Supabase entirely or co-exists with it; co-existence is the safer first step.

### 11.7 Recommendation — cross-track guardrails

If any of these tracks is adopted, the following invariants must remain:

- The canonical `account_type` / `account_status` / `student_stage` model and the Authorization Matrix in `docs/architecture/AUTHORIZATION_MATRIX.md` remain the source of truth.
- RLS stays primary. No new client may bypass RLS.
- The migration strategy remains additive: new forward migrations only, no `db push` or `migration repair` against production without a reviewed baseline.
- Public reads continue to use the safe projection (`public_student_profiles`); clients never select the full `profiles` row.
- The `verify:*` scripts and the `Runtime Security Smoke Tests` must pass against the new client as well. New clients get a new verifier in the same spirit.
- The `AGENTS.md` and `docs/git/GIT_WORKFLOW.md` policies remain in force: small, reviewable, traceable changes; no secrets in Git; no commits without verification.

### 11.8 Recommendation — decision procedure

1. Do not adopt any of the three tracks before the four-persona migration is released and the staging matrix is green.
2. If a mobile need is real, prefer Track A first (web shell) before Track B (Flutter) — it reuses the existing UI and the existing CI.
3. If a backend split is real, prefer Track C with Laravel co-existing with Supabase for one quarter before any cutover.
4. Whatever is chosen, document the decision as an ADR in `docs/architecture/ADR/` and update the roadmap.

---

## 12. Safety Rules (must not be violated)

- Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code or `NEXT_PUBLIC_*` variables.
- Never run runtime fixtures against production users.
- Treat `supabase/migrations/` as the executable schema source. Treat the current migration folder as historically non-replayable until the baseline strategy is completed.
- Never use `supabase migration repair` to hide drift without verifying the actual schema in disposable staging.
- Keep legacy tables until dual-read counts and runtime behavior are verified.
- Use server actions and RLS for authorization; navigation visibility is not authorization.
- Do not commit real secrets, `.env.local`, Supabase service keys, private dumps or generated outputs. The `.gitignore` already excludes `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, `*.codebase-memory/`, `graphify-out/`, `*.dump`, `*.sql.gz`, `*.bak`.
- Use `git mv` for structural moves to preserve history.
- Keep changes small, reviewed and traceable; one concern per commit.

---

## 13. Handoff Self-Review

### 13.1 Fact — what was changed in this docs pass (2026-08-05)

- The uncommitted rewrite of this document (`docs/workflow/HANDOFF.md`) was refined in place to correct the claims that drifted relative to the 2026-08-05 re-verification: branch, audit numbers, baseline test results, Node version, MCP Supabase behaviour, Playwright blocker, and Phase 1 verdict. The conceptual content (four-persona restructuring, Supabase state, security review findings, runtime gate, future platform strategy, safety rules, change log) is preserved.
- `docs/workflow/STATUS.md` was replaced: the previous `fix/supabase-feed-runtime-reconciliation` entry was retired and the current `stabilization/release-readiness` entry was written, including Phase 0 (release-readiness) IN PROGRESS, Phase 1 (test:release green baseline) APPROVED WITH OBSERVATIONS locally, the local verification table, and the historical baseline references.
- `docs/workflow/NEXT_ACTIONS.md` was rewritten to put the release-readiness gate first: stage and commit the documentation-only diff together with the Phase 1 `setup.ts` diff (both produced by this same release-readiness mission, but by different agents: `setup.ts` by the implementer, the docs by the docs pass), re-run the local static verification chain, open the CI Node 22 re-run, then move on to staging and the security review findings.
- `docs/workflow/SESSION_LOG.md` was appended at the top with a new `## 2026-08-05 — Release-readiness stabilization (Phase 0 + Phase 1)` entry that records the goal, the initial inspection, the Phase 0 / Phase 1 verdicts, the commands run, the MCP behaviour observed, the files modified, the `HANDOFF.md` corrections, the validation, the risks and the next-session plan.
- `docs/technical/KNOWN_ISSUES.md` was extended: the 2026-08-05 verification block was added at the top of "Current Verification", the dependency-tree line was refreshed to record the new root 0 / `apps/web` 20 split, and a new "Open Contradictions (2026-08-05)" section was added to flag the MCP `Unauthorized` observation in this docs pass and the historical `timeout` class from the previous handoff.
- No code, schema, configuration, dependency, migration or workflow command was modified by this docs pass. No secrets were read. No commit was made. No push was attempted.
- The Phase 1 `apps/web/src/test/setup.ts` modification is **not** part of the docs pass diff; it was authored by the implementer earlier in this release-readiness mission and was on disk when the docs pass started. The branch as a whole carries the Phase 1 code change (uncommitted, on disk) and the docs-pass change (uncommitted, on disk). The session that picks up from this handoff will see both modifications and must review, accept or revert them together (§13.3 step 1).

### 13.2 Fact — what was and was not verified in this docs pass (2026-08-05)

**Verified in this docs pass:**

- Runtime: `node --version` → **v26.2.0**; `npm --version` → **11.13.0**. This is the only Node baseline on this machine; **Node 22 is not available locally**, so the green chain achieved here has not been reproduced on the CI Node 22 baseline.
- `npm run lint`, `npm run typecheck`, `npm run build`: OK (build generated **65 pages**).
- `npm test`: **31 / 31 passed** (first run, 8 test files). Re-run: **31 / 31 passed** (second run, no flakes).
- `npm run test:release` (chain `lint + typecheck + test + build`): **OK**.
- `npm run verify:release` (chain adds the 12 structural verifiers): **OK** — `verify:is-minor` 7 cases, `verify:contact-policy` 8, `verify:interviews-privacy-rls` 25, `verify:explainable-match` 9, `verify:application-readiness` 15, `verify:readiness-timeline` 9, `verify:profile-evidence` 3+7, `verify:phase3-security` 15, `verify:function-grants` 6, `verify:identity-access`, `verify:opportunities`, `verify:feed-rpcs`.
- `git diff --check`: OK on the uncommitted diff.
- `npm audit --omit=optional` at the workspace root: **0 vulnerabilities**.
- `npm audit --omit=optional` inside `apps/web`: **20 vulnerabilities** (1 low, 9 moderate, 10 high). No critical.
- MCP Supabase `get_advisors(type=performance)`: invoked, returned `{result:{lints:[]}}` (success, empty lint list).
- MCP Supabase `get_advisors(type=security)`, `get_project_url()`, `list_tables`, `list_migrations`, `list_extensions`: invoked, all returned `Unauthorized`.
- Historical (not the result of any call in this docs pass): the previous (2026-08-04) handoff recorded the same database-introspection calls returning `HttpException: Failed to run sql query: Connection terminated due to connection timeout`. That observation is preserved in `docs/technical/KNOWN_ISSUES.md` and is **not** a result of the current docs pass.

**Not verified in this docs pass (intentionally skipped or blocked):**

- `npm run test:e2e:chromium`: **executed and blocked at the `webServer` phase**. `apps/web/.env.local` is absent, so `playwright.config.ts` cannot start `npm run dev -- --hostname 127.0.0.1 --port 3000` (the dev server requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and Playwright fails before any browser scenario runs. The block is recorded in §6.1 and in `docs/technical/KNOWN_ISSUES.md`.
- All `verify:runtime-*` scripts: not run (no staging project).
- Manual GitHub Actions triggers: not run.
- Remote Supabase mutations: not performed.
- `supabase_execute_sql(...)`: not invoked in this docs pass; no result to report.
- The CI Node 22 baseline has not been re-run with the Phase 1 fix in this docs pass; it is the binding gate for closing Phase 1 and is the next concrete action in §13.3.
- The MCP Supabase project URL in `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md` (`https://eghskwwupruomiactvji.supabase.co`) was attempted via `supabase_get_project_url()` in this docs pass and returned `Unauthorized`; it therefore could not be re-confirmed live. Any new workflow that depends on the project URL must call `supabase_get_project_url` from a session where the MCP token has not expired / is not unauthorised.

### 13.3 Recommendation — first action for the next contributor (re-ordered)

The next session must, in this order:

1. **Preserve and review the handoff + Phase 1 diff.** `git status` will show `M apps/web/src/test/setup.ts` (Phase 1 implementation, authored by the implementer earlier in this mission: deterministic `localStorage` stub) and `M` entries for the documentation files written by the docs pass (`STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `HANDOFF.md`, `KNOWN_ISSUES.md`). The contributor must review the documentation diff and the test-harness diff together, then commit with the appropriate `docs:` / `test:` prefixes per `docs/git/COMMIT_CONVENTION.md`. The documentation and the Phase 1 implementation are a single release-readiness change; they should land in the same commit (or in a single reviewable change) and must not be edited casually. The handoff file is the contract for the rest of the session.
2. **Re-run the local static verification chain on top of the commit** to confirm the green baseline survives: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:release && npm run verify:release && git diff --check`.
3. **Open the CI Node 22 re-run.** The local machine is Node 26 only. Open `.github/workflows/ci.yml` and `.github/workflows/web-quality.yml`, push the branch, and confirm the Phase 1 fix reproduces on Node 22. Until that lands, Phase 1 is APPROVED WITH OBSERVATIONS locally, not fully closed.
4. **Refresh the remote Supabase snapshot.** Open a fresh session with a working Supabase MCP connection and re-run `supabase_get_project_url`, `supabase_list_tables`, `supabase_list_migrations` and `supabase_list_extensions` to confirm the production drift recorded in `docs/technical/SUPABASE_FEED_RUNTIME_RECONCILIATION.md`. In this docs pass, all of those calls returned `Unauthorized`; in a fresh session the calls must succeed (or fall back to the historical `timeout` class from the 2026-08-04 handoff) before the snapshot can be re-confirmed.
5. **Provision the second free Supabase staging project** (`docs/technical/STAGING_SETUP.md`) and produce the reviewed schema baseline.
6. **Triage the 20 `apps/web` dependency vulnerabilities** in a controlled maintenance change after staging is in place. The root 0 / `apps/web` 20 split is now recorded in `STATUS.md`, `KNOWN_ISSUES.md` and `NEXT_ACTIONS.md`.
7. **Address the security review findings** in §8.1.b in priority order: CRITICAL `profiles` SELECT and `updateApplicationStatusSA` first, then HIGH rate limiter + chat guard + `/api/seed` response shape + `contact_requests` double-check, then MEDIUM CORS / service-role / HSTS.
8. **Create `apps/web/.env.local` from `.env.example`** (or from staging secrets) before any local Playwright run. The absence of this file is the root cause of the Playwright block in §6.1 / §13.2.
9. **Read `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `PR_TRACKER.md`, `OPEN_QUESTIONS.md` and `docs/technical/KNOWN_ISSUES.md`** for the day-1 task list, and resume from §10 below.

---

## 14. Change Log of this Handoff

- 2026-08-05 — `docs`: refined `HANDOFF.md` to correct the claims that drifted relative to the 2026-08-05 re-verification, while preserving the conceptual content of the 2026-08-04 rewrite. Updated the header (branch `stabilization/release-readiness`, base `main` / `origin/main`, worktree state showing the uncommitted `M apps/web/src/test/setup.ts` Phase 1 code change authored by the implementer earlier in this mission plus the `M docs/workflow/HANDOFF.md` rewrite, scope extended to release-readiness Phase 0 / Phase 1; the docs pass is documentation-only, the branch as a whole carries both a Phase 1 code change and a documentation change produced by different agents). Replaced the §6.1 verification table with the 2026-08-05 numbers: `npm test` 31/31 passed twice, `npm run lint` OK, `npm run typecheck` OK, `npm run build` OK with 65 pages, `npm run test:release` OK, `npm run verify:release` OK, `git diff --check` OK, `npm audit --omit=optional` reported as **workspace root 0 vs apps/web 20 (1L/9M/10H)**, `npm run test:e2e:chromium` **executed and blocked at the `webServer` phase**. Updated §6.4 to record that the previous `test:release` failure is now resolved locally by the Phase 1 `apps/web/src/test/setup.ts` deterministic `localStorage` stub (attributed to the implementer, not the docs pass). Updated §6.5 to record what was actually executed in this docs pass and what was blocked (Playwright was executed and blocked, not skipped; `supabase_execute_sql` was not invoked). Renumbered §6.6 as the recommendation. Updated §5.4 / §8.3 to align with the 2026-08-05 MCP behaviour: `get_advisors(type=performance)` returned `{result:{lints:[]}}` (success, empty lint list); `get_advisors(type=security)`, `get_project_url`, `list_tables`, `list_migrations`, `list_extensions` all returned `Unauthorized`; `execute_sql` was not invoked. The previous handoff's `connection timeout` class is preserved as **historical** and is **not** the result of any call in the current docs pass. Updated §10 to mark items 1 and 2 as **done locally on Node 26.2.0** and to add the CI Node 22 re-run as item 3 (the binding gate for closing Phase 1). Replaced §13.1/§13.2/§13.3 with the 2026-08-05 verified-vs-skipped split and the new re-ordered next steps (commit the diff, re-run the local chain, open the CI Node 22 re-run, refresh the remote Supabase snapshot, provision staging, triage `apps/web` 20, address §8.1.b, create `apps/web/.env.local` before any local Playwright run). Companion changes: replaced `docs/workflow/STATUS.md` (new `stabilization/release-readiness` entry, Phase 0 IN PROGRESS / Phase 1 APPROVED WITH OBSERVATIONS, local verification table, root 0 / `apps/web` 20 split, MCP `Unauthorized` observation), rewrote `docs/workflow/NEXT_ACTIONS.md` (release-readiness gate first, root 0 / `apps/web` 20 split, `apps/web/.env.local` precondition for Playwright, Phase 1 commit under `test:` prefix), prepended a new `## 2026-08-05` entry to `docs/workflow/SESSION_LOG.md`, and extended `docs/technical/KNOWN_ISSUES.md` (2026-08-05 verification block, refreshed dependency-tree line, new "Open Contradictions (2026-08-05)" section reconciling the request-prompt MCP `Unauthorized` framing with the historical `timeout` class from the 2026-08-04 handoff). No code, schema, configuration, dependency, migration or workflow command was modified by this docs pass; no secrets were read; no commit was made; no push was attempted.
- 2026-08-04 (pass 1) — `docs`: rewrote `HANDOFF.md` to consolidate the four-persona state, Supabase drift, MCP timeouts, Git state, verification, runtime gate, and the future platform strategy (Ionic / Flutter / Laravel + React). Replaces the previous 2026-07-30 handoff at `f502b9d`. No code or schema changes.
- 2026-08-04 (pass 2) — `docs`: revised `HANDOFF.md` to incorporate the QA and security review results from the same session. Replaced the placeholder verification table in §6.1 with the real results (Node v26.2.0/npm 11.13.0, 12/12 verifiers OK, build 65 pages, 28/31 unit tests with 3 `analytics.test.ts` failures, `test:release` failing for the same reason, Playwright blocked, `npm audit --omit=optional` reporting 20 vulnerabilities split 1L/9M/10H). Added the security review findings in §8.1.b (2 CRITICAL, 4 HIGH, 3 MEDIUM) as open review findings. Distinguished the MCP timeouts (table/migration/extension/SQL) from the MCP successes (get_advisors security + performance). Re-ordered the next actions in §10 and §13.3 to start with handoff diff preservation, then test/Node compatibility, then staging/baseline/RLS. Removed the "worktree clean" claim from the header. Replaced §13.1/§13.2 with the verified-vs-skipped split. No code, schema, configuration or workflow command was modified; no secrets were read; no commit was made.
