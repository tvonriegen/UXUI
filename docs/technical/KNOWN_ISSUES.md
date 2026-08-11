# Known Issues

## Authenticated profile boundary hotfix (2026-08-10)

The code and migration are an **atomic pair**: do not deploy code without
`20260810000001_harden_authenticated_profiles.sql`, and do not apply the
migration without the matching code consumers. This PR does not apply the
migration to production. A captured baseline in disposable staging, followed
by an RLS/grants smoke matrix and consumer inventory, is required before either
side can be promoted.

The forward migration `20260810000001_harden_authenticated_profiles.sql` is
**not applied remotely**. It requires a captured staging baseline and an
RLS/grants smoke matrix before promotion. The migration now uses an invoker
view and an owner-only `profiles` policy, but the repository still has many authenticated
reads and nested foreign-key selects against `profiles`; applying it without
the consumer inventory would produce empty or denied reads. The talent
directory now fails closed when the view is absent; it has no compatibility
fallback to `profiles`.

The static consumer inventory is: `middleware.ts`,
`components/layout/SideNavBar.tsx`, `lib/auth-server.ts`,
`lib/auth-context.tsx`, `components/feed/FeedPage.tsx`,
`components/dashboard/{TrustTriangleInsights,DashboardEstudiante,DashboardEmpresa,DashboardColegio,DashboardEgresado}.tsx`,
`components/school/AdministrationPage.tsx`,
`components/opportunities/OpportunitiesPage.tsx`,
`components/messaging/MessagesPage.tsx`,
`components/profile/{ProfilePage,ReputationCard}.tsx`, `app/empresa/[id]/page.tsx`,
`app/external/profile/page.tsx`,
`app/actions/{auth,evidence,interviews,external,school,opportunities,company}.ts`,
and `app/api/{chat,seed}/route.ts`. This includes nested selects through
`profiles!author_id`, `profiles!job_postings_company_id_fkey`,
`profiles!job_applications_*_fkey`, `profiles!contact_requests_*_fkey`,
`profiles!internship_requests_company_id_fkey`,
`profiles!conversations_*_id_fkey`, and `profiles!skill_validations_*_fkey`.
Owner writes/admin-only seed paths are excluded from the non-owner read set;
each listed read still needs column-by-column migration to an allowlisted
projection before the forward migration is eligible for staging promotion.

Contact routing now fails closed before creating a conversation or request.
It does not read `age` or `school_id` from the client-visible profile boundary.

### Contact unlock plan (not implemented)

Contact remains fail-closed. The future implementation must be a domain
function/action with a conceptual signature such as
`authorizeContact({ callerId, targetStudentId, opportunityId? })`, not a generic
profile getter. It must verify `auth.uid()` and caller account status, Company
ownership or membership, opportunity scope, the target student, and active
enrollment/school mediation when required. Every check must fail closed and the
return value must contain only a business decision (for example
`allowed`, `requires_school_approval`, or `denied`), never age, `school_id`, or
another sensitive profile field. Implement and validate this only after a
staging baseline and authenticated runtime smoke test; do not simulate that it
is already resolved.

## Current Verification

- 2026-08-10 (authenticated profile boundary): direct verifier passed; `npm test` passed with 39/39 tests, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:release`, `npm run verify:release` and `git diff --check` passed locally. No Supabase SQL, remote migration, staging smoke test or deployment was performed; runtime validation and legacy profile consumers remain staging prerequisites.
- 2026-08-05 (release-readiness stabilization, this machine): `npm test` 31/31 passed twice, `npm run lint` OK, `npm run typecheck` OK, `npm run build` OK with 65 pages, `npm run test:release` OK, `npm run verify:release` OK, `git diff --check` OK. The green test:release / verify:release chain is achieved locally for the first time since the previous handoff and is the Phase 1 result of release-readiness. Node baseline on this machine is **Node 26.2.0 / npm 11.13.0**; only Node 26 is installed locally, Node 22 is not available, so the green chain has not been re-run on the CI Node 22 baseline. Phase 1 therefore remains **APPROVED WITH OBSERVATIONS** locally and is not yet fully closed.
- 2026-08-05 (release-readiness stabilization, this machine): the uncommitted change to `apps/web/src/test/setup.ts` installs a deterministic in-memory `Storage` stub on `window.localStorage` and `globalThis.localStorage` with a `beforeEach` clear, which restores the three `apps/web/src/lib/analytics.test.ts` cases that were failing under Node 26 / jsdom. The diff is the Phase 1 implementation; it was authored by the implementer earlier in this same release-readiness mission (it was already on disk when the docs pass started), and is uncommitted on the branch. It must be reviewed together with the documentation diff.
- 2026-08-05 (release-readiness stabilization, this machine): `npm audit --omit=optional` at the workspace root reports **0 vulnerabilities**, while `npm audit --omit=optional` inside `apps/web` reports **20 vulnerabilities** (1 low, 9 moderate, 10 high). No critical. The previous handoff's "20 vulnerabilities" line referred to the `apps/web` audit; the root number is now 0 because the only root dev-dependency is the Supabase CLI, which has no reported advisories in this tree.
- 2026-08-05 (release-readiness stabilization, this machine): MCP Supabase `get_advisors(type=performance)` returned `{result:{lints:[]}}` (success, empty lint list). `supabase_get_advisors(type=security)`, `supabase_get_project_url`, `supabase_list_tables`, `supabase_list_migrations` and `supabase_list_extensions` all returned `Unauthorized` in this session. `supabase_execute_sql` was **not executed** in this session. The `HttpException: Failed to run sql query: Connection terminated due to connection timeout` class recorded in the previous (2026-08-04) handoff is **historical** and is not the result of any call in this session — it is preserved here for traceability and is explicitly not the current behaviour.
- 2026-08-05 (release-readiness stabilization, this machine): Playwright (`npm run test:e2e:chromium`) was **executed and blocked**. `apps/web/.env.local` is absent; `playwright.config.ts` boots a local web server with `npm run dev -- --hostname 127.0.0.1 --port 3000` and the dev server requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The `webServer` phase therefore fails before any browser scenario runs. No browser scenario was executed this session. Provisioning `apps/web/.env.local` from `.env.example` (or from staging secrets) is a precondition for any local Playwright run.
- 2026-08-05 (release-readiness stabilization, this machine): the working branch is `stabilization/release-readiness`. HEAD `be3ed9e` matches `main`; no new commits, no new migration files, no dependency changes have been added in this session. The docs pass is documentation-only; the uncommitted Phase 1 `apps/web/src/test/setup.ts` change was authored by the implementer earlier in this same mission.
- 2026-07-26: all five repository verification scripts passed.
- 2026-07-26: `npm run typecheck` passed.
- 2026-07-26: `npm run lint` passed without warnings.
- 2026-07-26: `npm run build` passed and generated 20 pages.
- 2026-07-26: `git diff --check` passed before integration.
- 2026-07-26: Phase 0 and Phase 1 branch validation passed before local merges; CI workflow added but not yet run remotely.
- 2026-07-26: Phase 2 evidence and Phase 3 readiness/security validations passed locally; Supabase schema and policy migrations were applied and verified remotely.
- 2026-07-26: Phase 1 canonical identity migrations are applied to Supabase production; focused authenticated RLS checks pass, while the complete negative matrix remains pending.
- 2026-07-26: Common opportunities migration backfilled 3 company opportunities and 1 application link; external runtime publishing fixtures are still pending.
- 2026-07-27: Freelance proposals and institutional internship mappings are deployed structurally; runtime proposal tests require running the seed fixture with `cliente@demo.cr`.
- 2026-07-27: `verify:runtime-security` and the manual `Runtime Security Smoke Tests` workflow are available; staging fixture secrets have not yet been configured, so the full matrix remains unexecuted.
- 2026-07-28: Supabase RLS helpers were moved to the non-exposed `private` schema; security advisors now report only the Auth leaked-password setting.
- 2026-07-29: Production has no separate staging project; the free staging setup is documented in `docs/technical/STAGING_SETUP.md` and has not been provisioned yet.
- 2026-07-29: Production feed RPCs were restored through three tracked forward migrations; authenticated write smoke testing remains pending because no staging project exists.
- 2026-07-29: Feed RPC security was hardened in production; only the Auth leaked-password protection advisor warning remains.
- 2026-07-30: The GitHub Supabase Preview check fails before deployment because remote migration versions are not present under the local filenames; do not run `db push` or `migration repair` until the reviewed baseline strategy in `SUPABASE_FEED_RUNTIME_RECONCILIATION.md` is completed.

## External Verification Pending

- Supabase schema alignment is complete for the reviewed production sections, but no separate staging project currently exercises RLS, evidence review, timeline triggers and interview transitions end to end.
- Deployment configuration must define `SEED_SECRET`; `/api/seed` now returns `503` outside local development when the secret is missing.
- The current GitHub OAuth token lacks the `workflow` scope, so `git push origin main` is rejected while publishing `.github/workflows/ci.yml`.

## Technical Debt

- `supabase/schema.sql`, `supabase/full_reset.sql` and older migrations still contain historical snapshot drift outside the current security sections. Migrations remain canonical.
- The dependency tree previously reported 21 vulnerabilities; the 2026-08-05 release-readiness session re-measured the apps/web tree at 20 vulnerabilities (1 low, 9 moderate, 10 high) while the workspace root reports 0. They were not auto-fixed to avoid unplanned upgrades.
- `apps/web/src/app/profile/page.tsx` remains a large role-aware route and needs a separate decomposition effort.
- There is no disposable Supabase integration test suite yet; current scripts are hermetic structural/domain checks.
- Runtime Supabase smoke testing is now available as an opt-in manual workflow, but the free staging project, fixtures and GitHub environment secrets still need to be configured.
- The local Supabase CLI is unavailable (`supabase: command not found`); remote migration execution currently uses Supabase MCP.
- The current Vercel integration reports one failed `uxui-sxfl` deployment while the primary `uxui` and `uxui-jad2` checks succeed; this appears to be an external project-specific deployment issue and requires Vercel access to diagnose.
- Supabase Auth leaked-password protection remains disabled and requires a dashboard setting change: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- The student profile route remains large despite the persistence and actionable-anchor improvements; keep its decomposition separate from product UX changes.
- Public self-registration temporarily sets `email_confirm = true` so users can log in immediately; restore email verification before production hardening.
- Public registration is temporarily limited to Estudiante and Empresa; external client routes remain reserved and are not exposed by the signup form.

## Phase 0 Four-Persona Findings (2026-07-26)

- `Egresado` is still a database and TypeScript role; it must become `student_stage = graduated` without losing history.
- `Externo` is not implemented in identity, routes, UI, database or RLS.
- The live schema has no institution/member model or common `opportunities` model.
- The live `profiles` SELECT policy is broad and exposes a table containing sensitive student fields; a safe public projection is required before anonymous exploration.
- Many live policies are assigned to `public` and need a resource-by-resource rewrite to the authorization matrix.
- The requested sequential integration branch policy differs from the current repository policy of direct work on `main`; resolve before Phase 1.
- No runtime negative RLS suite covers cross-company, cross-school, external publisher restrictions or public sensitive-field absence.

## Historical External Issue

- The Vercel check associated with historical PR #2 failed under a project owned by another account. The privacy implementation was locally validated and is now integrated into `main`; the old deployment issue is not treated as a current code failure.

## Open Contradictions (2026-08-05)

- The request prompt described the Supabase MCP as "ahora responde Unauthorized salvo performance advisor vacío" (i.e. responding `Unauthorized` for everything except the performance advisor, which returns an empty list). This session confirmed that exactly: `supabase_get_project_url`, `supabase_list_tables`, `supabase_list_migrations`, `supabase_list_extensions` and `supabase_get_advisors(type=security)` all returned `Unauthorized`; `supabase_get_advisors(type=performance)` returned `{result:{lints:[]}}` (success, empty lint list). `supabase_execute_sql` was **not** invoked in this session and therefore is not a result. No contradiction on this point. The previous handoff (2026-08-04) recorded the same calls returning `HttpException: Failed to run sql query: Connection terminated due to connection timeout`; that observation is preserved here as **historical** and is not the result of any call in the current session.
- The request prompt stated the workspace-root `npm audit` reports **0 vulnerabilities** and the `apps/web` audit reports **20 vulnerabilities** (1L/9M/10H). This session confirmed that exactly: root = 0, `apps/web` = 20 (1L/9M/10H), no critical. No contradiction on this point.
- The request prompt stated that Node 26 is the local baseline and Node 22 is not available. This session confirmed that exactly: `mise` lists `26`, `26.2`, `26.2.0`; no Node 22 install. No contradiction on this point.
- The request prompt stated Playwright is blocked by missing Supabase variables. This session confirmed that exactly: `apps/web/.env.local` is absent, the dev server `webServer` phase of `playwright.config.ts` therefore cannot start, `npm run test:e2e:chromium` was **executed and blocked at the `webServer` phase**, and no browser scenario ran. No contradiction on this point.
- The request prompt stated that `apps/web/src/test/setup.ts` was a pre-existing uncommitted change at the start of the docs pass. This is consistent with the docs pass observation: when the docs pass started, `setup.ts` was already on disk as an uncommitted modification. However, the Phase 1 implementation itself was authored by the implementer earlier in this same release-readiness mission (not in a prior session), so the docs pass must not be characterised as "the entire session was documentation-only": the branch as a whole carries both a code change (Phase 1) and a documentation change (this docs pass). The session that picks up from this handoff must review and commit both together. No contradiction on this point.

## Read-Only Inventories (2026-08-05)

> **Status: documentation-only pass.** No code, no migrations, no dependencies, no lockfile, and no workflow file was changed by this docs pass. No commit, no push. All edits are uncommitted working-tree changes.
>
> **Release status preserved:** Phase 0 = **IN PROGRESS** / Phase 1 = **APPROVED WITH OBSERVATIONS** locally. The free Supabase staging project and the reviewed schema baseline are still **preconditions for any RLS-related work** (per `docs/technical/STAGING_SETUP.md`); they are not relaxed by this inventory.
>
> **Severity rule:** every claim below is split into **FACTS** (what was actually observed in the tree today, with file paths and line numbers), **INFERENCES** (reasonable conclusions drawn from those facts without claiming remediation), and **PENDIENTES** (open work that does not yet have a fix in this branch). No CVE identifier is invented; no advisory is re-cited as a CVE; no fix is claimed. Where the audit reports advisory identifiers, the count, the severity, the source tool (`npm audit --omit=optional`), and the verbatim "fix available" / "no fix available" line are the only quoted facts.

### A. `createAdminClient` distribution

#### A.1 FACTS

- Definition: `apps/web/src/lib/supabase-server.ts:11` — the only `createAdminClient` in the codebase; throws if `SUPABASE_SERVICE_ROLE_KEY` is missing.
- Call sites (runtime):
  - `apps/web/src/app/actions/auth.ts:26` — `registerAccount` (public registration).
  - `apps/web/src/app/actions/school.ts:58, 138, 185, 242, 351, 378, 443` — `createStudent`, `clearMustChangePassword`, `graduateStudent`, and four other school-side actions.
  - `apps/web/src/app/actions/company.ts:80, 146, 198, 276` — `updateApplicationStatus`, `updateApplicationStatusSA`, `createInternshipRequest`, `updateInternshipRequest`.
  - `apps/web/src/app/api/seed/route.ts:64` — `POST /api/seed` (guarded by `SEED_SECRET`).
  - `apps/web/src/app/api/xp/route.ts:40` — `POST /api/xp` (rate-limited).
  - `apps/web/src/app/api/quests/progress/route.ts:34` — `POST /api/quests/progress` (rate-limited).
  - `apps/web/src/app/api/streak/touch/route.ts:18` — `POST /api/streak/touch` (rate-limited).
  - `apps/web/src/app/api/chat/route.ts:127, 232` — `runCompanyTool` and `runSchoolTool` (not rate-limited).
- Test-only call site: `apps/web/src/app/actions/auth.test.ts:12` (a Vitest mock, not a runtime use).
- Total runtime call sites: **18** (auth × 1, school × 7, company × 4, seed × 1, xp × 1, quests × 1, streak × 1, chat × 2). The two chat call sites are distinct tool executors, each opening its own admin client per invocation.

#### A.2 INFERENCES

- The admin client is the only path to the Supabase Auth admin API (`auth.admin.createUser`, `auth.admin.updateUserById`, `auth.admin.deleteUser`) and to writes that depend on cross-row invariants (e.g. seeding the four demo accounts, posting a notification after a job-application update, awarding XP, incrementing quest progress, touching the streak). Every other write in the codebase that needs to bypass RLS goes through the same client.
- The pattern is uniform across all four persona surfaces (auth, school, company, gamification) and across the API surface (chat, xp, quests, streak, seed). The only "special" users of the admin client are the public registration action and the seed endpoint, both of which require admin because they create or mutate auth users outside the caller's session.
- The split is **not yet documented** in `docs/architecture/SECURITY_MODEL.md`. A future docs pass can capture it; this docs pass does not.

#### A.3 PENDIENTES

- Document the admin-client distribution and the validate-with-RLS / mutate-with-admin contract in `SECURITY_MODEL.md` in a follow-up docs pass.
- No code change proposed in this docs pass.

### B. Validate-with-RLS / mutate-with-admin pattern

#### B.1 FACTS

- `apps/web/src/app/actions/company.ts:65–86` (`updateApplicationStatus`): RLS client reads `job_applications` and verifies `job_postings.company_id === company.userId` (lines 70–78); admin client then updates the application by `applicationId` only (line 86), without re-binding `job_id`.
- `apps/web/src/app/actions/company.ts:117–161` (`updateApplicationStatusSA`): RLS client validates the job belongs to the calling company (lines 122–129) and enforces `max_candidates` (lines 132–144); admin client then updates the application by `applicationId` only (line 159), without re-binding `job_id`, even though `jobId` is a parameter and is already used for the cap.
- `apps/web/src/app/actions/school.ts:34–126` (`createStudent`): RLS client validates the caller is a `school` (lines 34–55); admin client then runs `auth.admin.createUser` + `profiles.upsert` + `student_profiles.upsert` (lines 58+).
- `apps/web/src/app/actions/school.ts:152–185` (`graduateStudent`): same pattern — RLS validates caller, admin mutates the student row.
- `apps/web/src/app/api/chat/route.ts:309–322` (auth + profile read with RLS client) and `:127`, `:232` (admin queries in tool executors).
- `apps/web/src/app/api/xp/route.ts:14–25` (auth + rate-limit) and `:40` (admin insert).
- `apps/web/src/app/api/quests/progress/route.ts:13–22` and `:34`.
- `apps/web/src/app/api/streak/touch/route.ts:9–18`.

#### B.2 INFERENCES

- The pattern is intentional and uniform: a single RLS-bound read is the gate, and the admin client performs the trusted mutation. The RLS read enforces ownership / caller-scope **only at read time**; the subsequent admin write does not re-check it at the database level.
- The application layer — not the database — owns the "this user owns this row" check on the write path. The CRITICAL finding on `updateApplicationStatusSA` in the previous handoff (`docs/workflow/HANDOFF.md` §8.1.b) is the same finding stated generically: when an admin client is used, the database does not re-assert ownership on the write.
- The pattern is consistent across the codebase; no callsite silently skips the RLS read.

#### B.3 PENDIENTES

- Document the validate-with-RLS / mutate-with-admin contract in `SECURITY_MODEL.md`. Include a warning that the admin path bypasses RLS by design.
- No code change proposed in this docs pass.

### C. `updateApplicationStatus` and `updateApplicationStatusSA` — open work

#### C.1 FACTS

- `apps/web/src/app/actions/company.ts:58` exports `updateApplicationStatus(applicationId, newStatus, studentId, jobTitle)` — the legacy accept/reject path (statuses `"accepted" | "rejected"`). RLS read at line 70 verifies the application belongs to a job of the calling company; admin write at line 83 is scoped only by `.eq("id", applicationId)` at line 86, **without** a `.eq("job_id", …)` constraint. The function does not receive a `jobId` parameter at all.
- `apps/web/src/app/actions/company.ts:109` exports `updateApplicationStatusSA(applicationId, jobId, newStatus)` — the full ATS pipeline (six `AtsStatus` values). RLS read at line 122 validates the job belongs to the calling company; admin write at line 156 is scoped only by `.eq("id", applicationId)` at line 159, **without** a `.eq("job_id", jobId)` constraint, even though `jobId` is a parameter and is already used for `max_candidates` enforcement.
- Both functions write to the same `job_applications` row via the admin client. `jobId` is fetched only to enforce `max_candidates` and to populate the notification body, not to constrain the write.

#### C.2 INFERENCES

- The CRITICAL finding recorded in the previous handoff (`docs/workflow/HANDOFF.md` §8.1.b) — "`updateApplicationStatusSA` updates by `applicationId` without binding `jobId`" — applies to **both** `updateApplicationStatus` and `updateApplicationStatusSA`. The legacy `updateApplicationStatus` does not even take a `jobId` parameter; the ATS variant receives `jobId` but does not pass it to the `.update().eq(...)` chain.
- Both paths land in the same `job_applications` table with the same admin-write pattern, so a caller that knows or guesses an `applicationId` for an application that does not belong to one of the caller's postings could potentially update the status on either path.

#### C.3 PENDIENTES

- Add `.eq("job_id", jobId)` (or use the RLS-bound server-action client and a RLS-enforced predicate) on both writes. The handler should drop the admin branch on this path and add a structural verifier case.
- Treat `updateApplicationStatus` (legacy) as the same finding, not just the SA variant.
- Do not change code in this docs pass.

### D. `/api/chat` — service-role tool calls and no rate limit

#### D.1 FACTS

- `apps/web/src/app/api/chat/route.ts:13` imports both `createServerSupabaseClient` and `createAdminClient`.
- `apps/web/src/app/api/chat/route.ts:127` (`runCompanyTool`) and `:232` (`runSchoolTool`) instantiate the admin client and use it to query `job_postings`, `job_applications`, `profiles`, `user_skills`, `internship_requests`.
- The auth and profile resolution at the route handler (`:309–322`) uses the RLS client to validate `account_type ∈ {company, school}` and bind `orgId`.
- `apps/web/src/app/api/chat/route.ts` does **not** import or call `rateLimit` (no matches for `rateLimit` anywhere in `apps/web/src/app/api/chat/`).
- The route is gated by `ENABLE_AI_CHAT === "true"` (line 21) and the presence of `ANTHROPIC_API_KEY` (line 25); when either is missing, the route returns 503.
- The Anthropic tool loop is bounded by `MAX_ITERATIONS = 5` (line 362). The maximum history depth is `30` messages (line 341).

#### D.2 INFERENCES

- The chat tool executors use admin client because they apply `eq("company_id", companyId)` / `eq("school_id", schoolId)` at the query level. RLS would also enforce that, but the tool function is structured as a single admin query.
- The HIGH finding recorded in the previous handoff (`docs/workflow/HANDOFF.md` §8.1.b) — "`/api/chat` is not covered by the rate limiter" — is **confirmed** by this read-only inventory: there is no `rateLimit(...)` call anywhere in the file.
- `/api/chat` is the only `/api/*` route that performs outbound paid calls (Anthropic) when enabled, and the only one with a missing rate limit that also amplifies cost.

#### D.3 PENDIENTES

- Add `rateLimit(...)` (or a stricter limiter) to `POST /api/chat` keyed by `user.id`, conditioned on `ENABLE_AI_CHAT === "true"`. The exact limit and window are not decided in this docs pass.
- Keep the existing `MAX_ITERATIONS = 5` bound; tightening the per-session tool-loop budget is a separate decision.
- Do not change code in this docs pass.

### E. `/api/seed` — no automatic consumers; plaintext credentials in response

#### E.1 FACTS

- `apps/web/src/app/api/seed/route.ts:16` defines `const DEMO_PASSWORD = "Demo1234!";`.
- `apps/web/src/app/api/seed/route.ts:38–50` is the guard: `isLocalDevelopment = (NODE_ENV === "development" && !VERCEL)`; if deployed and `SEED_SECRET` is missing → 503; if `SEED_SECRET` is set, the request must include a matching `x-seed-secret` header → 403 otherwise.
- `apps/web/src/app/api/seed/route.ts:88` uses `DEMO_PASSWORD` as the password when calling `admin.auth.admin.createUser` for each demo user.
- `apps/web/src/app/api/seed/route.ts:498–507` is the success response shape (verified by reading the file):
  ```json
  {
    "ok": true,
    "log": ["..."],
    "accounts": {
      "school":   { "email": "colegio@demo.cr", "password": "Demo1234!", "name": "Colegio Técnico San José" },
      "student1": { "email": "alan@demo.cr",    "password": "Demo1234!", "name": "Alan García" },
      "student2": { "email": "ian@demo.cr",     "password": "Demo1234!", "name": "Ian Mora" },
      "company":  { "email": "google@demo.cr",  "password": "Demo1234!", "name": "Google CR" }
    }
  }
  ```
  The `external` demo account (`cliente@demo.cr`) is also seeded but is **not** echoed in the response.
- No automatic consumer of `/api/seed` was found in this read-only inventory. The only references in the source tree are:
  - `apps/web/src/middleware.ts:7` — lists `"/api/seed"` in the public-bypass set.
  - `apps/web/src/app/login/page.tsx:71` — user-facing hint `"Asegúrate de haber ejecutado /api/seed primero."` (a hint, not a call).
  - `docs/qa/RUNTIME_SECURITY_RUNBOOK.md:18` — the manual workflow that calls `/api/seed` against staging.
  - `supabase/full_reset.sql:7` — a comment instructing the operator to call the endpoint.
  - No file in `scripts/`, `.github/workflows/`, or `apps/web/src/**` invokes `/api/seed` programmatically.

#### E.2 INFERENCES

- `/api/seed` is exclusively a **manual** operator endpoint: it has no automated caller, no scheduled job, no CI workflow, and no client-side trigger.
- The response shape that includes the plaintext `password` is consistent across all four documented personas, and the password is the same `DEMO_PASSWORD` for all of them. There is no per-account rotation in the response.
- The HIGH finding recorded in the previous handoff (`docs/workflow/HANDOFF.md` §8.1.b) — "`/api/seed` and `DEMO_PASSWORD` in response" — is **confirmed**: the response includes the password (lines 502–505), and the deployed-environment guard is correct only because `SEED_SECRET` is enforced when `VERCEL` is set.

#### E.3 PENDIENTES

- Decide whether the response should return only account IDs (and not passwords) on success, and document the decision in `SECURITY_MODEL.md` and `RUNTIME_SECURITY_RUNBOOK.md`. The decision is not made in this docs pass.
- Audit-log every successful `POST /api/seed` call (the previous handoff recommended this; the recommendation is preserved here).
- Do not change code in this docs pass.

### F. In-memory `rateLimit` scope

#### F.1 FACTS

- `apps/web/src/lib/rate-limit.ts` defines `rateLimit({ key, limit, windowMs })` backed by a single in-process `Map<string, RateLimitEntry>` (line 9). Cleanup runs every 5 minutes via `setInterval` (line 38). The `Map` is process-local; it does not survive a Vercel cold start and is not shared across serverless instances.
- The only call sites of `rateLimit` in `apps/web/src` are:
  - `apps/web/src/app/api/xp/route.ts:25` — `key: \`xp:${user.id}\``, `limit: 30`, `windowMs: 60_000`.
  - `apps/web/src/app/api/quests/progress/route.ts:22` — `key: \`quest:${user.id}\``, `limit: 60`, `windowMs: 60_000`.
  - `apps/web/src/app/api/streak/touch/route.ts:15` — `key: \`streak:${user.id}\``, `limit: 10`, `windowMs: 60_000`.
- `/api/chat`, `/api/seed`, `/api/health`, all `apps/web/src/app/actions/*` server actions, and the rest of the API surface are **not** covered by the in-memory limiter.

#### F.2 INFERENCES

- The in-memory limiter only protects the three gamification endpoints (XP, quests, streak). It does not protect any other API route or server action.
- The HIGH finding recorded in the previous handoff (`docs/workflow/HANDOFF.md` §8.1.b) — "in-memory rate limiter" — is **confirmed** by this inventory and applies to the three endpoints above only.
- `/api/health` and `/api/seed` are intentionally not rate-limited (the seed endpoint is guarded by `SEED_SECRET`; the health endpoint is a no-op probe).

#### F.3 PENDIENTES

- Decide whether to keep the in-memory limiter for the three gamification endpoints and add a shared-store limiter for the rest, or to retire the in-memory implementation entirely. The decision is not made in this docs pass.
- Do not change code in this docs pass.

### G. Dependency audit (apps/web only)

#### G.1 FACTS

- `npm audit --omit=optional` at the workspace root: **0 vulnerabilities** (the only root dev-dep is the `supabase` CLI, no advisories in this tree).
- `npm audit --omit=optional` inside `apps/web`: **20 vulnerabilities** (1 low, 9 moderate, 10 high). No critical. Re-verified 2026-08-05.
- The 20 advisories distribute across 16 distinct advisory entries reported by `npm audit`. The packages reported as `isDirect: true` are: **`xlsx`, `next`, `eslint-config-next`, `@sentry/nextjs`**. The remaining 12 are transitive effects of these direct packages and of their sub-tree.
- Notable observations from the audit output (no CVE invented; no fix claimed):
  - `xlsx` is direct, pinned at `^0.18.5` in `apps/web/package.json:30`. The audit reports **`No fix available`** for the advisories listed against the package. The repository depends on a maintainer-published fix; the project cannot remediate it via `npm audit fix`.
  - `next` and `eslint-config-next` are direct, pinned at `^14.2.0` (lines 26 and 44 of `apps/web/package.json`). The audit reports `fixAvailable` for both, **but the only available fix is a major bump** (the audit output marks `isSemVerMajor: true`).
  - `@sentry/nextjs` is direct, pinned at `^10.47.0` (`apps/web/package.json:19`). The audit reports `fixAvailable: true` for it through the `@sentry/node` effect chain (which in turn pulls `@opentelemetry/instrumentation-http`).
  - `dompurify` is **not** a direct dependency. The direct packages that bring DOMPurify-related code are `isomorphic-dompurify ^3.8.0` (`apps/web/package.json:24`) and the dev-time types `@types/dompurify ^3.0.5` (`apps/web/package.json:22`). The audit reports `dompurify` only via the transitive path of these packages.
  - OpenTelemetry packages (`@opentelemetry/core`, `…/instrumentation-http`, `…/resources`, `…/sdk-trace-base`, and a long tail of `…/instrumentation-*`) appear in the audit as **transitive** effects through `@sentry/node` and `@sentry/webpack-plugin`. None are direct dependencies of `apps/web`.
  - The remaining transitive advisories (e.g. `brace-expansion`, `ws`, `uuid`, `glob`, `js-yaml`, `semver`, etc.) reach the app through the `eslint-config-next` / `next` / Sentry stack and through `jsdom`/Playwright tooling.

#### G.2 INFERENCES

- Of the 20 advisories, **only 4** are attached to packages the project pins directly; the other 16 are transitive. Any triage must therefore target a small set of direct dependencies (`xlsx`, `next`, `eslint-config-next`, `@sentry/nextjs`) and accept that the transitive effects will be remediated as a side effect.
- For `xlsx`, the audit explicitly reports "No fix available" — the project cannot upgrade the pinned range to a remediated version without a maintainer-published release. The remediation, if any, is replacement of the dependency, not a version bump.
- For `next` and `eslint-config-next`, the audit reports the only available fix is a major version bump. Whether the project takes that path depends on a separate compatibility review, not on the audit itself.
- The DOMPurify-related advisory surface is currently shielded from direct exploitation by being only a transitive and dev-types dependency; the live runtime import in `apps/web/src` is the `isomorphic-dompurify` package, which the project pins directly.
- The Sentry / OpenTelemetry cluster is the single largest transitive effect chain. A Sentry upgrade would also retire several OpenTelemetry advisories at the same time.
- The audit numbers do not assert exploitation. The audit prints advisory identifiers that map to GitHub Security Advisories; this docs pass does not re-cite those identifiers as CVE numbers and does not invent any.

#### G.3 PENDIENTES

- The audit inventory is recorded for the next triage pass. No upgrade, no `npm audit fix --force`, no lockfile change in this docs pass.
- A separate maintenance change should triage the four direct packages in this order, after the staging and RLS work closes:
  1. `xlsx` — replacement is the only path; the audit does not have a fix.
  2. `next` + `eslint-config-next` — major-version bump; requires a separate compatibility review.
  3. `@sentry/nextjs` — minor/patch bump available; transitive OpenTelemetry advisories retire as a side effect.
  4. Re-run `npm audit --omit=optional` inside `apps/web` after each change to confirm the count drops.
- The remaining 12 transitive advisories should be tracked as "follow-the-direct" — they are not independently actionable while the direct package is pinned.

### H. Cross-cutting constraints preserved

- **Release status:** `BLOCKED` (Phase 0) / `IN PROGRESS` (Phase 1). The inventories above do not change either verdict. No release is declared.
- **Staging + baseline as preconditions for RLS work:** the free staging project is still unprovisioned, the schema baseline is still pending, and the migration folder is still historically non-replayable. Any RLS-related fix that depends on a live Supabase connection (e.g. tightening the authenticated `profiles` SELECT, addressing the `updateApplicationStatusSA` admin-client path) cannot be validated in this branch; it must wait for the staging gate in `docs/technical/STAGING_SETUP.md`.
- **No commit / no push in this docs pass.** All edits are uncommitted working-tree changes.
