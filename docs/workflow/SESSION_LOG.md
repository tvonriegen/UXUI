# TalentHub Session Log

## Canonical active state (ADR-004 Accepted 2026-08-05 — replaces prior pre-acceptance state)

- **FASE 0 COMPLETE.**
- **GAP ANALYSIS APPROVED**; companion ADR **Accepted**.
- **ADR-004 rev. 4.2 Accepted**; owner acceptance completed 2026-08-05.
- **OWNER ACCEPTANCE COMPLETED** (exact quote recorded in ADR-004 and `DECISION_LOG.md`).
- **CORE SCHEMA DESIGN (Gate B1) — READY / OPENED DOCUMENTALLY**. B1 is not implemented.
- **CORE MIGRATION READINESS (Gate B2) — BLOCKED**. B2 is a prerequisite of any migration; staging is **not** a B1 requirement.
- **B2 future risk / criterion:** the Core migration plan must include a concurrent-transfer test for the at-least-one active-owner invariant. `student_profiles.school_id` remains compatibility-only and is reconciled with `student_enrollments` by one synchronization layer; it is not authority. This does not change the conceptual decision or authorize SQL.
- **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
- **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
- **GATE D MIGRATIONS: BLOCKED** (until A / B1 / C / B2 closed; Gate D is never "in parallel" with A, B1, B2 or C).
- **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
- **D-01..D-43 fixed and preserved**; **D-OD-1..D-OD-7 deferred and open**.
- **Canonical gate sequence:** **A → B1 → C → B2 → D**. B2, C and D remain blocked; C is blocked exclusively by D-OD-1. No B2/C/D gate is opened by this acceptance.
- **Files in the acceptance/versioning set.** The seven files are `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md`, `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md`, `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, `docs/workflow/OPEN_QUESTIONS.md`, `docs/workflow/SESSION_LOG.md` and `docs/workflow/DECISION_LOG.md`. `DECISION_LOG.md` is part of the acceptance record. `apps/web/src/test/setup.ts`, `docs/workflow/HANDOFF.md` and `docs/technical/KNOWN_ISSUES.md` are outside this documentary commit.

## 2026-08-05 — Release-readiness stabilization (Phase 0 + Phase 1)

### Goal

- Re-establish the local test:release green baseline ahead of CI Node 22 and ahead of staging.
- Correct the documentation that drifted relative to the previous handoff (branch, audit numbers, Node baseline, MCP behaviour, Playwright blocker, baseline test results).
- This docs pass is documentation-only: do not touch product code, migrations, dependencies or workflow files. The Phase 1 `apps/web/src/test/setup.ts` change was implemented by the implementer earlier in this same release-readiness mission and was already on disk when this docs pass started. Do not commit, do not push.

### Initial Inspection

- Branch: `stabilization/release-readiness` (HEAD `be3ed9e`, same commit as `main`; no new commits in this session).
- Working tree at start: `M apps/web/src/test/setup.ts` (the Phase 1 fix implemented by the implementer earlier in this mission, uncommitted on the branch) and `M docs/workflow/HANDOFF.md` (pre-existing rewrite from the 2026-08-04 session, uncommitted). The docs pass is documentation-only and recognises the `setup.ts` Phase 1 fix without re-applying it.
- Runtime: Node `v26.2.0` / npm `11.13.0`. `mise` lists only `26`, `26.2`, `26.2.0`; **Node 22 is not available locally**, so the CI Node 22 baseline cannot be reproduced from this machine.
- Apps: `apps/web` only; the only root dev-dependency is the Supabase CLI.
- `apps/web/.env.local`: **absent**. Playwright's `webServer` phase therefore cannot start the local dev server.

### Phase 0 (release-readiness) — IN PROGRESS

- Read the previous `docs/workflow/HANDOFF.md` (2026-08-04) and the existing `STATUS.md`, `NEXT_ACTIONS.md`, `OPEN_QUESTIONS.md`, `PR_TRACKER.md`, `KNOWN_ISSUES.md` to ground the corrections.
- Re-ran the local static verification chain to confirm the actual baseline before documenting it.
- Listed the obsolete claims that need to be corrected in this session: branch name, root vs `apps/web` audit numbers, current Node baseline and the absence of Node 22, MCP Supabase behaviour, Playwright blocker root cause, and the Phase 1 baseline (test 31/31, lint, typecheck, build 65, test:release, verify:release, git diff --check).
- Phase 0 (release-readiness) verdict: **IN PROGRESS**. Phase 1 implementation recognised; Phase 2 (staging, runtime, security) not started; no release declared.

### Phase 0 (identity / organizations / resource ownership — gap analysis, parallel docs pass) — IN PROGRESS

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING.** The following initial-pass statements are preserved for traceability; they are not the active gate, ownership, enrollment or projection criteria.

- Authored `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` and the companion `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` (Status: **Proposed**). The two documents formalize the structural target implied by the mandate's D-01..D-43 and register them as approved decisions. The gap analysis covers scope, sources, identity, organizations, external, posts, opportunities, applications/proposals (alternatives A–D, no decision), school ↔ student, minor protection per channel, current authorization sources, target model, gap matrix, migration order, gates and open decisions. The ADR formalizes drivers, alternatives A–K, invariants, ownership matrix, consequences, compatibility, migration, rollback, security, deferred decisions and acceptance criteria.
- Mandate's D-01..D-43 are treated as **fixed inputs** and are restated in the gap analysis §14 (gap matrix) and the ADR §5 (mandate summary). None of them is reopened. The four open decisions in the gap analysis §16 / ADR §14 (D-OD-1..D-OD-5) are explicitly **not adopted** in this pass and gate the Phase 1B schema work.
- This pass is documentation-only. No migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no workflow file, no commit and no push are produced.
- Phase 1B (schema-only) is **BLOCKED** until ADR-004 is **Accepted** and the four open decisions are resolved. The free staging project and the CI Node 22 Phase 1 result remain binding preconditions for any RLS-related work; this pass does not relax them.
- The two new files were created and the four workflow files (`docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, `docs/workflow/OPEN_QUESTIONS.md`, `docs/workflow/SESSION_LOG.md`) received surgical, additive references only. ROLE_MODEL.md, DATA_MODEL.md, AUTHORIZATION_MATRIX.md and SECURITY_MODEL.md are **not** modified in this session.
- Verifications run at the end of the pass: `git diff --check` (clean) and `git status --short --branch` (records only the two new files and the four surgical references). No `npm`, no `test`, no SQL and no Supabase call was executed.

### Phase 1 (test:release green baseline) — IMPLEMENTED LOCALLY BY THE IMPLEMENTER EARLIER IN THIS MISSION

- The uncommitted diff to `apps/web/src/test/setup.ts` adds a deterministic in-memory `Storage` (`DeterministicStorage`) and stubs it on both `window.localStorage` and `globalThis.localStorage`, with a `beforeEach` clear. The `matchMedia` stub from the prior commit is preserved. This is the Phase 1 fix that unblocks the three `apps/web/src/lib/analytics.test.ts` cases that were failing under Node 26 / jsdom. The diff was authored by the implementer earlier in this release-readiness mission; when the docs pass started, it was already on disk as an uncommitted modification.
- The diff is uncommitted at the time of this handoff and must be reviewed together with the documentation diff in the same commit.
- Phase 1 verdict: **APPROVED WITH OBSERVATIONS** locally. Full closure requires the GitHub Actions CI re-run on its Node 22 baseline; the local machine is Node 26 only.

### Commands Run (this session)

```bash
git status
git branch --show-current
git log --oneline -10
git diff --stat HEAD
git diff --check
node --version
npm --version
ls /home/brunoc/.local/share/mise/installs/node/
npm run test            # 31/31 passed (first run)
npm run test            # 31/31 passed (second run)
npm run lint            # OK (no ESLint warnings or errors)
npm run typecheck       # OK (tsc --noEmit clean)
npm run build           # OK, 65 pages
npm run test:release    # OK (lint + typecheck + test + build)
npm run verify:release  # OK (lint + typecheck + test + build + 12 verifiers)
npm audit --omit=optional                              # root: 0 vulnerabilities
(cd apps/web && npm audit --omit=optional)             # apps/web: 20 vulnerabilities (1L/9M/10H)
npm run test:e2e:chromium                              # executed, BLOCKED at webServer phase
supabase_get_advisors(type=security)                   # Unauthorized
supabase_get_advisors(type=performance)                # {result:{lints:[]}} (empty, success)
supabase_get_project_url()                             # Unauthorized
supabase_list_tables(schemas=[public], verbose=true)   # Unauthorized
supabase_list_migrations()                             # Unauthorized
supabase_list_extensions()                             # Unauthorized
# supabase_execute_sql was NOT executed in this session.
```

`npm run test:e2e:chromium` was **executed** but blocked at the `webServer` phase: `apps/web/.env.local` is absent, so `playwright.config.ts` cannot start `npm run dev -- --hostname 127.0.0.1 --port 3000` (the dev server requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The block reason is recorded in `KNOWN_ISSUES.md` and is consistent with the request prompt.

### MCP Supabase Observed Behaviour (this session)

- `get_advisors(type=performance)` → `{result:{lints:[]}}` (success, empty lint list).
- `get_advisors(type=security)` → `Unauthorized`.
- `get_project_url()` → `Unauthorized`.
- `list_tables(schemas=[public], verbose=true)` → `Unauthorized`.
- `list_migrations()` → `Unauthorized`.
- `list_extensions()` → `Unauthorized`.
- `execute_sql` was **not** invoked in this session.

This matches the request prompt's framing "ahora responde Unauthorized salvo performance advisor vacío". The `HttpException: Failed to run sql query: Connection terminated due to connection timeout` class reported in the previous handoff (2026-08-04) is **historical** and is not the result of any of the calls above; it is preserved separately in `KNOWN_ISSUES.md` for traceability.

### Files Modified In This Session (documentation only — docs pass)

- `docs/workflow/STATUS.md` — replaced previous `fix/supabase-feed-runtime-reconciliation` status with the current `stabilization/release-readiness` status, added Phase 0 / Phase 1 verdicts, added the local verification table, kept the historical baseline references.
- `docs/workflow/NEXT_ACTIONS.md` — re-ordered to put the release-readiness gate first (commit Phase 1 + docs diff, re-run local verification, open CI Node 22, create `apps/web/.env.local`), and refreshed the dependency-vulnerabilities line to reference the new root 0 / `apps/web` 20 split.
- `docs/technical/KNOWN_ISSUES.md` — added the 2026-08-05 verification block at the top of "Current Verification", refreshed the dependency-tree line to record the 20 / 0 split, and added a new "Open Contradictions (2026-08-05)" section flagging the MCP `Unauthorized` observations and the historical timeout class from the previous handoff.
- `docs/workflow/SESSION_LOG.md` — this entry.
- `docs/workflow/HANDOFF.md` — corrected the obsolete claims listed in Phase 0 without rewriting the conceptual content. See "HANDOFF.md corrections" below.

The Phase 1 `apps/web/src/test/setup.ts` modification is **not** part of the docs pass; it was authored by the implementer earlier in this mission and was on disk before the docs pass started. It is included in this handoff for traceability and is the only uncommitted code change on the branch.

### HANDOFF.md corrections (this session)

The pre-existing rewrite of `docs/workflow/HANDOFF.md` is conceptually correct but contains five claims that are now out of date. The conceptual content (four-persona restructuring, Supabase state, verification matrix, security review findings, runtime gate, future platform strategy, safety rules, change log) is preserved. The corrections are:

- **Branch:** the header now records `Branch: stabilization/release-readiness`, `Base: main / origin/main`, and the worktree state at start (pre-existing uncommitted setup.ts + handoff diff) instead of `Branch: main` with a "starts clean" claim.
- **Audit numbers:** the `npm audit` figures are now reported as **workspace root 0 vs apps/web 20 (1 low, 9 moderate, 10 high)**, replacing the previous "20 vulnerabilities total" framing that conflated the two scopes.
- **Baseline:** the verification table now records the actual 2026-08-05 numbers (31/31 tests twice, lint OK, typecheck OK, build 65 pages, test:release OK, verify:release OK, `git diff --check` OK) and Phase 0 (release-readiness) IN PROGRESS / Phase 1 APPROVED WITH OBSERVATIONS, instead of the prior "28 / 31 with 3 analytics.test.ts failures" snapshot that was the open Phase 1 gap.
- **Node baseline:** the runtime stack now states "**Node 26.2.0 / npm 11.13.0 is the only local baseline. Node 22 is not installed on this machine; CI Node 22 is the binding gate and has not been re-run with the Phase 1 fix in this session.**"
- **MCP Supabase behaviour:** §5.4 / §6.5 / §8.3 are aligned with the actual observed responses in this docs pass (`Unauthorized` for `get_advisors(type=security)` / `get_project_url` / `list_tables` / `list_migrations` / `list_extensions`; `{result:{lints:[]}}` for `get_advisors(type=performance)`; `execute_sql` not invoked). The previous (2026-08-04) handoff's "timeouts for table/migration/extension/SQL, empty lints for advisors" framing is preserved as **historical** in `KNOWN_ISSUES.md` and is **not** the result of any call in this docs pass. The current docs pass is consistent with the request prompt's "ahora responde Unauthorized salvo performance advisor vacío" framing.
- **Playwright blocker:** §6.1 / §6.5 / §13.2 now state that the immediate root cause of the Playwright block is the absence of `apps/web/.env.local` (so the dev server `webServer` phase cannot start), and that creating the file from `.env.example` is a precondition for any local Playwright run.

The future platform strategy (Track A / B / C) and the safety rules are preserved unchanged. The Change Log at the bottom of `HANDOFF.md` is appended with a new 2026-08-05 entry documenting this session.

### Validation

- `npm run lint` ✓ — no ESLint warnings or errors.
- `npm run typecheck` ✓ — `tsc --noEmit` clean.
- `npm test` ✓ — 31/31 passed (first run).
- `npm test` ✓ — 31/31 passed (second run, no flakes).
- `npm run build` ✓ — Next.js production build compiled successfully, **65 pages** generated.
- `npm run test:release` ✓ — chain `lint + typecheck + test + build` passes.
- `npm run verify:release` ✓ — chain adds the 12 structural verifiers; all pass.
- `git diff --check` ✓ — pre-existing diff is whitespace / conflict-marker clean.
- `npm audit --omit=optional` at root: 0 vulnerabilities.
- `npm audit --omit=optional` in `apps/web`: 20 vulnerabilities (1 low, 9 moderate, 10 high).

### Risks / Follow-up

- The green test:release / verify:release chain is achieved **only on Node 26**. The CI Node 22 baseline has not been re-run with the Phase 1 fix. Until that re-run lands, Phase 1 is APPROVED WITH OBSERVATIONS locally, not fully closed.
- The Phase 1 `apps/web/src/test/setup.ts` diff is uncommitted. It must be reviewed before being committed alongside the documentation diff; do not push.
- `apps/web/.env.local` is absent. Without it, the dev server will not start, so any local Playwright run will fail at the `webServer` phase. The `Runtime Supabase Smoke` and `Runtime Security Smoke Tests` workflows are not affected (they are not local).
- MCP Supabase database-introspection calls (`get_project_url`, `list_tables`, `list_migrations`, `list_extensions`, `get_advisors(type=security)`) returned `Unauthorized` in this docs pass; `get_advisors(type=performance)` returned `{result:{lints:[]}}` (empty lint list, success); `execute_sql` was not invoked. The remote production snapshot in the previous handoff (last known state from the 2026-07-29 reconciliation) is therefore still the authoritative remote snapshot until a fresh session restores MCP connectivity. The `connection timeout` class from the 2026-08-04 handoff is historical and is not the result of any call in the current docs pass.
- The free Supabase staging project is still unprovisioned. The security review findings from the previous handoff (broad `profiles` SELECT, `updateApplicationStatusSA` admin-client path, in-memory rate limiter, `/api/chat` rate limit, `/api/seed` response shape, `contact_requests` ownership double-check, CORS localhost fallback, optional service role, HSTS) are all still open.
- The 20 `apps/web` dependency vulnerabilities (1L/9M/10H) are still on the list and have not been triaged.

### Next Session

- Stage and commit the documentation diff (and the Phase 1 setup.ts diff) under a `docs:` and `test:` prefix respectively. Do not push.
- Re-run the local static verification chain on top of the commit to confirm the green baseline survives.
- Open `.github/workflows/ci.yml` and `.github/workflows/web-quality.yml` and confirm the Phase 1 fix reproduces on the CI Node 22 baseline. Until that lands, Phase 1 is not fully closed.
- Provision the free Supabase staging project per `docs/technical/STAGING_SETUP.md` and trigger `Runtime Supabase Smoke` and `Runtime Security Smoke Tests` manually.
- Address the security review findings in priority order (CRITICAL first).

## 2026-07-26 — Merge and handoff

### Result

- Merged `foundation/identity-access` into `main` with merge commit `fffcae4`.
- Local `main` is ready to publish to `origin` after this handoff commit.
- Added the runtime security workflow, runbook and current handoff records.

### Delivered scope

- Canonical identity and initial RLS.
- Common opportunities, freelance proposals and internship mapping.
- Persona route tree, shared navigation and external profile flow.
- Structural verifiers plus a manual runtime security matrix.

### Validation

- `npm run lint` passed.
- `npm run build` passed with 64 routes.
- `npm run verify:identity-access` passed.
- `npm run verify:opportunities` passed.
- Runtime security workflow is pending isolated staging fixture secrets.

### Handoff

- Read `docs/workflow/HANDOFF.md` before continuing.
- First action: configure fixtures and run `Runtime Security Smoke Tests`.

## 2026-07-26 — Phase 0 four-persona audit

### Goal

- Audit the current TalentHub repository before implementing the four experiences Student, Company, School and External.
- Produce the product, architecture, authorization, privacy, route, migration and QA contracts.
- Do not modify application functionality, schema or RLS.

### Initial inspection

- Confirmed branch `main`, HEAD `8674fe8` and clean worktree at start.
- Indexed codebase graph was ready with 1,536 nodes and 2,250 edges.
- Confirmed Next.js 14 App Router, React 18, TypeScript, Tailwind and Supabase clients.
- Inspected all tracked routes, middleware, auth contexts, server actions, API handlers, schema snapshot, reset helper and migrations.

### Findings

- Current authorization role union is `Estudiante | Egresado | Empresa | Colegio`.
- `Egresado` is implemented as a separate dashboard and role, not a student stage.
- There is no External account, institution/member model, safe public projection or common opportunity model.
- Live Supabase has 36 public tables, broad profile reads and multiple policies assigned to `public`.
- Live advisors report callable `SECURITY DEFINER` helpers and disabled leaked-password protection.
- High-risk route sizes: profile 2,951 lines, muro 1,354, administration 1,292, jobs 1,257.

### Documentation changes

- Added `docs/architecture/PHASE_0_AUDIT.md`.
- Added role, route, authorization, privacy, QA and three ADR documents.
- Added product definition and user journeys.
- Updated personas, requirements, data model, current state, roadmap, known issues and workflow state.

### Validation

- `git diff --check` passed.
- All nine repository verification scripts passed.
- Live Supabase introspection queries returned tables, policies, functions, triggers and target-model absence evidence.
- `npm run lint` passed without warnings.
- `npm run typecheck` passed after the production build generated `.next` types.
- `npm run build` passed and generated 20 routes.

### Verdict

- **APROBAR CON OBSERVACIONES.** The baseline is incrementally migratable, but Phase 1 must address identity, public privacy, policy scope and runtime negative tests before persona dashboards.

### Next session

- Wait for explicit Phase 1 approval and branch-policy decision. Do not implement Phase 1 automatically.

## 2026-07-05 — Session 1

### Goal

- PR 0: create the persistent workflow state tracking system in `docs/workflow/` and update `docs/git/GIT_WORKFLOW.md`.

### Initial Inspection

- Confirmed current branch is `chore/workflow-state`, off base branch `caro-maturana`.
- `git status` shows a clean working tree.
- `docs/workflow/` does not exist yet.
- Read existing docs to align style and conventions:
  - `docs/git/GIT_WORKFLOW.md`
  - `docs/git/COMMIT_CONVENTION.md`
  - `docs/roadmap/ROADMAP.md`
  - `docs/technical/KNOWN_ISSUES.md`
  - `docs/technical/RUNBOOK.md`
  - `docs/technical/REFACTORING_PLAN.md`
- Confirmed PR target base: `caro-maturana` (integration branch).

### Commands Inspected (not executed by the orchestrator)

- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -10`
- `git remote -v`
- `git branch -a`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run install:web`
- `git pull` (failed with SSH `Permission denied (publickey)`; local already in sync with `origin` per status)

### Validation Result

- Status: **passed** (2026-07-05 QA session).
- `npm run lint` ✓ — no ESLint warnings or errors.
- `npm run typecheck` ✓ — `tsc --noEmit` clean.
- `npm run build` ✓ — Next.js 14.2.35 production build compiled successfully, 20/20 static pages generated, no dummy env values required.
- `npm run install:web` reported 21 dependency vulnerabilities on the baseline (not re-run in this session; tracked in `docs/technical/KNOWN_ISSUES.md`).

### Commits

- Local commit `e01cecf chore: add persistent workflow state tracking` created on `chore/workflow-state` after QA validation passed.
- Local commit `f15550b docs: finalize workflow state after PR 0 setup` added on the same branch (`chore/workflow-state`) after PR 0 setup; documentation-only follow-up.
- Push: blocked on SSH credential issue (see `OPEN_QUESTIONS.md`); the local `chore/workflow-state` branch head (carrying both `e01cecf` and `f15550b`) is not yet on `origin`.

### Risks

- New workflow files could drift out of sync with the actual branch and PR state if the discipline to update them on every session is not followed. Mitigation: `docs/git/GIT_WORKFLOW.md` mandates the read/update ritual.
- Validations did run in the QA session and all passed: `npm run lint`, `npm run typecheck`, and `npm run build` were clean. The build only covers the Next.js app, so any malformed workflow doc would only be caught by review, not by the build.
- The SSH `Permission denied (publickey)` issue is environmental and out of scope for this PR; it could delay sharing the PR with reviewers.

### Next Session

- Restore SSH credentials and push the full local branch head of `chore/workflow-state` to `origin` (carries both `e01cecf` and `f15550b`; do **not** push/cherry-pick only `e01cecf`); open PR 0 against `caro-maturana` and update the remote tracking line in this entry.
- If SSH remains blocked, integrate the full local `chore/workflow-state` branch head into `caro-maturana` (both `e01cecf` and `f15550b`, not just `e01cecf`) to unblock PR 1.
- Once PR 0 is integrated into `caro-maturana`, start PR 1: `fix/privacy-contact-routing` from `caro-maturana` (see `NEXT_ACTIONS.md`).

## 2026-07-05 — PR 1 Start

### Goal

- Start PR 1 (`fix/privacy-contact-routing`): create the branch off the locally integrated `caro-maturana`, explore the contact-routing surface area, and update the workflow documentation to reflect that implementation is **blocked** pending the architecture-audit findings.

### Branch

- `fix/privacy-contact-routing`, branched from `caro-maturana` after PR 0 was integrated via fast-forward (`e01cecf`, `f15550b`, `adb64cf` are all reachable from the new base).
- `git status` at session start: clean working tree on `fix/privacy-contact-routing`; HEAD is `adb64cf docs: clarify workflow branch handoff`.

### Actions Run

- **PR 0 integration confirmation.** Verified the local fast-forward of `chore/workflow-state` into `caro-maturana` includes all three commits (`e01cecf`, `f15550b`, `adb64cf`); no commit was dropped.
- **Branch creation.** Created `fix/privacy-contact-routing` from the integrated `caro-maturana`.
- **PR 1 exploration (read-only).** Identified direct contact-surface points to be reworked in PR 1:
  - `apps/web/src/app/talent/page.tsx` — creates conversations on behalf of a company toward candidates (client-side init).
  - `apps/web/src/app/messages/page.tsx` — opens the company↔student conversation route, including the school↔student direct-message path.
  - `apps/web/src/app/actions/interviews.ts` — uses the **admin** Supabase client to create interview proposals, bypassing RLS.
  - Supabase RLS on `conversations` — currently validates only participant membership; it does **not** gate against minor-student contact exposure.
- **Architecture audit.** The architecture-auditor returned a **block** verdict on PR 1 implementation until findings C1–C4 are resolved. Findings (high level):
  - **C1** — `supabase/schema.sql` drifts from `supabase/migrations/`. Pick a canonical source.
  - **C2** — Enforcement must combine strong RLS **and** a server action; the server action alone is insufficient.
  - **C3** — `proposeInterview` uses the admin client and bypasses RLS; remove the bypass.
  - **C4** — `notifications.type` CHECK does not include `contact_request`; must be extended.
  - **M1 / M5 / secondary** — open decisions: `isMinor(role, age) = role === 'Estudiante' && (age === null || age < 18)`; treatment of existing Empresa↔minor conversations; whether the student sees `contact_requests`; notification source (DB trigger vs. server action). See `OPEN_QUESTIONS.md` Q10–Q11 and the secondary block in `NEXT_ACTIONS.md`.

### Files Changed (this session)

- `docs/workflow/STATUS.md` — moved to PR 1, noted branch created and implementation blocked.
- `docs/workflow/NEXT_ACTIONS.md` — replaced the PR 0 immediate list with the PR 1 executable checklist (C1–C4 / M1 / M5); pointed `After Current PR` at a follow-up refactor PR.
- `docs/workflow/SESSION_LOG.md` — added this entry.
- `docs/workflow/PR_TRACKER.md` — PR 0 marked integrated locally (push to `origin` left to the user); PR 1 marked started and blocked by the architecture review, validation not run.
- `docs/workflow/OPEN_QUESTIONS.md` — added Q6–Q11 capturing the architecture-audit findings and PR 1 open decisions.
- No code, RLS, or migration files were touched on `fix/privacy-contact-routing` in this session, by design (block verdict).

### Validation

- Not run. PR 1 makes no code changes in this session; the workflow documentation update is the only diff on the working tree. Lint / typecheck / build were not re-executed because there is nothing to validate yet on `fix/privacy-contact-routing` (and running them would be premature before the architectural decisions are made).

### Risks / Blockers

- **Implementation blocker.** PR 1 cannot start coding until C1–C4 are resolved and M1 / M5 / the secondary decisions are answered. Until then, the only safe edits on this branch are the workflow documentation files (`docs/workflow/**`) and design notes.
- **SSH push still blocked.** The local fast-forward of PR 0 into `caro-maturana` is in place, but the push of the integrated branch head to `origin` is the user's call. Pushing `fix/privacy-contact-routing` is likewise blocked until SSH credentials are restored.
- **Drift risk.** Resolving C1 (schema vs. migrations) must be done before drafting any RLS changes, otherwise the new policies may not match the deployed schema.

### Next Session

- Resolve C1–C4 and answer M1 / M5 / the secondary decisions (see `OPEN_QUESTIONS.md` Q6–Q11 and `NEXT_ACTIONS.md`).
- Once decisions are made, draft the PR 1 implementation plan (RLS policies, server actions, tests), commit on `fix/privacy-contact-routing`, run `npm run lint` / `npm run typecheck` / `npm run build` plus the minor-student routing test, and update `SESSION_LOG.md`, `PR_TRACKER.md`, and `DECISION_LOG.md`.

## 2026-07-05 — PR 1 decision / audit consolidation

### Goal

- Document the architectural decisions that resolve the architecture-auditor's **Aprobar con observaciones** verdict on PR 1, so that implementation can proceed with the auditor's guardrails baked in. Documentation only — no code, no RLS, no migrations, no commit, no push.

### Audit consolidation (2026-07-05)

- Re-read the architecture-auditor's findings (CR-1, CR-2, M-1, M-2, M-3, M-4, M-5, M-6 and the residual implementation questions) and the previously open Q6–Q11 in `OPEN_QUESTIONS.md`.
- Verified verdict: **Aprobar con observaciones**. The auditor's required ajustes imprescindibles are:
  - `proposeInterview` must run entirely through the RLS-constrained / `auth.uid()`-bound client; the admin client is out of scope for the PR 1 contact/interview path (CR-1 / C3).
  - `can_converse` must gate `conversations INSERT` and `messages INSERT`; `conversations SELECT` may remain participant-based for history (CR-2 / C2).
  - `contact_requests` RLS — SELECT for company / school; INSERT for company; UPDATE for company (cancel `pending`) and school (approve / reject); DELETE denied; a minor student does not see `pending` rows in PR 1 (M-1).
  - `SECURITY DEFINER` functions: explicit `search_path`, minimum grants, `STABLE`, no mutations (M-2 / M-8).
  - `contact_requests` indexes: pair/status for `can_converse` lookup; school/status queue (M-3).
  - `schema.sql` alignment for the sections PR 1 touches (C1, M-4).
  - `notifications.metadata jsonb NOT NULL DEFAULT '{}'` with a CHECK that allows `contact_request`; idempotent migration (M-5 / M-7).
  - `is-minor` verification mechanism: choose a concrete mechanism at implementation time (preferred: minimal test if viable; fallback: documented verifiable cases) (M-6).
- Recorded every accepted decision in `DECISION_LOG.md` ADR-002 with sub-decision IDs C1–C4, M1–M8, and the secondary decisions.

### Actions Run

- Authored `DECISION_LOG.md` ADR-002 with the C1–C4, M1–M8, and secondary decisions (status: Accepted, 2026-07-05, branch `fix/privacy-contact-routing`).
- Updated `OPEN_QUESTIONS.md` Q6–Q11 to "Answered" pointers into `DECISION_LOG.md` ADR-002; added a "Residual implementation questions (PR 1)" section with Q12 (test / verification mechanism), Q13 (approval trigger mechanics), and Q14 (`respondInterview` / `cancelInterview` admin-client scope).
- Replaced the "blocked" framing in `NEXT_ACTIONS.md` with a "ready for implementation after committing the decision docs / with guardrails" plan, including a pre-implementation docs-commit gate, the ADR-002 guardrails inlined, and a high-level implementation plan with eleven steps and the validation criteria.
- Updated `STATUS.md` "Current PR / Task", "Current Working State", "Known Breakages", and "Next Recommended Action" to reflect: docs decisions updated, code not yet touched, implementation ready pending explicit implementation approval and/or commit of the docs state.
- Updated `PR_TRACKER.md` PR 1 row in the table to "decision package approved with guardrails / ready for implementation planning"; updated the PR 1 detail section accordingly; corrected the three file paths to `apps/web/src/app/talent/page.tsx`, `apps/web/src/app/messages/page.tsx`, and `apps/web/src/app/actions/interviews.ts`.
- Added a brief "PR 1 Contact Routing Decisions" pointer section to `docs/architecture/SECURITY_MODEL.md` (no implementation details, only the decision references).
- Added this entry to `SESSION_LOG.md`.

### Files Changed (this session)

- `docs/workflow/DECISION_LOG.md` — added ADR-002.
- `docs/workflow/OPEN_QUESTIONS.md` — Q6–Q11 marked answered; added residual implementation questions Q12–Q14.
- `docs/workflow/NEXT_ACTIONS.md` — replaced blocked framing with ready-for-implementation plan and guardrails.
- `docs/workflow/STATUS.md` — updated Current PR / Task, Current Working State, Known Breakages, Next Recommended Action.
- `docs/workflow/SESSION_LOG.md` — added this entry.
- `docs/workflow/PR_TRACKER.md` — PR 1 status updated; file paths corrected.
- `docs/architecture/SECURITY_MODEL.md` — brief decision summary appended.

### Validation

- Not run. Per the task brief, no validations are executed in this session. The uncommitted diff is documentation only.

### Risks / Blockers

- **The decision-documentation state is not yet committed.** Implementation must wait for an explicit implementation approval and / or a commit of the docs state.
- **Residual implementation questions in `OPEN_QUESTIONS.md` (Q12–Q14)** must be resolved in the implementation plan before the code commit lands. They are not blockers for the ADR.
- **SSH push remains blocked** on credentials (`Permission denied (publickey)`).

### Next Session

- Commit the decision-documentation state on `fix/privacy-contact-routing` (docs only) per the pre-implementation gate in `NEXT_ACTIONS.md`.
- Draft the PR 1 implementation plan with the ADR-002 guardrails inlined; resolve Q12–Q14 in the plan.
- Begin implementation per the plan and run `npm run lint` / `npm run typecheck` / `npm run build` plus the chosen verification mechanism. Update `SESSION_LOG.md`, `PR_TRACKER.md`, and `DECISION_LOG.md` as the work lands.

## 2026-07-05 — PR 1 Implementation Pass

### Context

- Branch: `fix/privacy-contact-routing`.
- Start state: clean working tree at `7a2b42f docs: document privacy contact routing decisions`.
- User explicitly approved implementation and requested no commit/push.

### Actions Run

- Added `supabase/migrations/20260705000001_contact_requests.sql` with `contact_requests`, RLS, `is_minor_profile`, `can_converse`, notification metadata/check update, contact request notifications, approval conversation trigger, and conversation/message insert gates.
- Added `apps/web/src/lib/utils/is-minor.ts` and `scripts/verify-is-minor.mjs`; added root `verify:is-minor` script.
- Added `apps/web/src/app/actions/contact-requests.ts` and wired the talent directory plus school dashboard queue to the server actions.
- Refactored `apps/web/src/app/actions/interviews.ts::proposeInterview` to remove admin-client usage from the proposal path. Minor applicants without approved contact create/reuse a pending `contact_requests` row and do not create interview/conversation/message/status updates.
- Updated `supabase/schema.sql` for PR 1 touched sections and documented residual broader snapshot drift.
- Resolved `OPEN_QUESTIONS.md` Q12–Q14 in implementation notes.

### Validation

- `npm run verify:is-minor` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` not run in this pass.

### Risks / Follow-up

- Apply the new migration to a Supabase instance and QA RLS paths: company minor request insert, school approve/reject, conversation reuse/create on approval, message soft-lock before approval, and direct non-minor contact.
- `respondInterview` / `cancelInterview` still use the admin client and remain out of PR 1 scope; schedule a follow-up admin-client review.
- Broader schema snapshot drift remains outside PR 1 touched sections.

## 2026-07-05 — PR 1 QA + Security Pass

### Context

- Branch: `fix/privacy-contact-routing`.
- Working tree at the start: uncommitted PR 1 implementation from the previous session.
- Goal: complete the local QA matrix (build), run a security review of the uncommitted diff, fix any findings, document the verdict, and surface the recommended commit grouping. No commit / push.

### Commands Run (local)

- `npm run verify:is-minor` — 7/7 canonical cases pass (`Estudiante` unknown age, under 18, 18+, adult, `Egresado`, `Empresa`, `Colegio`).
- `npm run lint` — pass, no warnings / errors.
- `npm run typecheck` — pass, `tsc --noEmit` clean.
- `npm run build` — pass, Next.js 14.2.35 production build compiled successfully, all static pages generated, no dummy env values required.

### Security Review

- Initial review surfaced two findings:
  - **B1 — BLOCKER.** The pre-existing `profiles_update` policy allowed an authenticated client to `UPDATE` `profiles.role` and `profiles.age` directly, which would silently bypass the PR 1 minor-routing logic. A TS check on the server action is not a security boundary; the column write has to be locked at the database.
  - **M1 — HIGH.** The talent directory page selected the `email` column for every public row, which leaked the student's direct contact data on the public route. Out of scope for a strict interpretation of the PR 1 server-action / RLS work, but the same threat surface, so fixed in the same pass.
- B1 fix: added `trg_fn_profiles_guard_role_age()` BEFORE UPDATE trigger on `profiles` that raises if `NEW.role` / `NEW.age` change while `COALESCE(auth.role(), '') <> 'service_role'`. Replaced the permissive `profiles_update` policy with one that uses both `USING (auth.uid() = id)` and `WITH CHECK (auth.uid() = id)`. Both pieces ship in the same migration as the rest of the PR 1 changes.
- M1 fix: removed `email` from the talent directory `profiles.select(...)` (`apps/web/src/app/talent/page.tsx`).
- Follow-up review after the fixes: **APROBAR, sin BLOCKER / HIGH**. No new findings. `proposeInterview` and the new `contact-requests` server actions use the RLS-constrained `auth.uid()`-bound client only; `can_converse` and the approval-time trigger gate the message / conversation flow; `SECURITY DEFINER` helpers declare `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC`, and (where read-only) `STABLE`.

### Files Changed (categories, this pass)

- **DB migration** (new): `supabase/migrations/20260705000001_contact_requests.sql` (now also includes the B1 trigger and the tightened `profiles_update` policy).
- **DB schema snapshot** (modified): `supabase/schema.sql` (PR 1 touched sections; B1 trigger / policy included).
- **Server actions** (new): `apps/web/src/app/actions/contact-requests.ts` (`requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest`).
- **Server actions** (modified): `apps/web/src/app/actions/interviews.ts` (`proposeInterview` refactor, admin client removed from the proposal path).
- **Shared helper** (new): `apps/web/src/lib/utils/is-minor.ts`.
- **Verify script** (new): `scripts/verify-is-minor.mjs`; root script `verify:is-minor` in `package.json`.
- **UI** (modified): `apps/web/src/app/talent/page.tsx` (server-action call, `email` removed from the client select as the M1 fix), `apps/web/src/components/dashboard/DashboardColegio.tsx` (school approve / reject queue).
- **Docs** (modified): `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md` (this entry), `PR_TRACKER.md`, `OPEN_QUESTIONS.md`, `DECISION_LOG.md` (ADR-002 implementation note), `docs/architecture/SECURITY_MODEL.md`, `docs/requirements/TRACEABILITY_MATRIX.md`, `docs/technical/KNOWN_ISSUES.md`.

### Risks / Follow-up (after the QA + Security pass)

- Runtime Supabase migration / RLS / trigger verification on a live instance is **not** a blocker for merge / commit, but is a recommended follow-up: apply `20260705000001_contact_requests.sql` to a Supabase instance and exercise company minor insert, school approve / reject, conversation reuse / create on approval, message soft-lock before approval, direct non-minor contact, and the B1 trigger rejecting a non-service `profiles.role` / `profiles.age` update.
- `respondInterview` / `cancelInterview` still use the admin client and remain out of PR 1 scope; schedule a follow-up admin-client review (already tracked in `OPEN_QUESTIONS.md` Q14 and `KNOWN_ISSUES.md`).
- Broader schema snapshot drift (`supabase/schema.sql` vs. `supabase/full_reset.sql` vs. older migrations) remains outside PR 1 touched sections; tracked in `KNOWN_ISSUES.md`.

### Next Session

- User reviews the uncommitted diff; optionally splits into the six atomic commit groups listed in `NEXT_ACTIONS.md` (Immediate) and `STATUS.md` (Next Recommended Action). Push to `origin` is the user's call; SSH credentials are still blocked.
- Schedule the runtime Supabase smoke test as a follow-up before merge / deploy (not a blocker).

## 2026-07-05 — PR #2 opened / Vercel external blocker

### Context

- Branch: `fix/privacy-contact-routing` (HEAD `7a881f6 docs: record privacy contact routing implementation`).
- Working tree at the start of the session: clean (per `git status --short --branch`).
- The previous session (PR 1 QA + Security Pass) ended with the implementation uncommitted. In this session the user committed and pushed the PR 1 work and opened PR #2 against `caro-maturana`.

### Branch state at session start

- `git status --short --branch`:
  ```
  ## fix/privacy-contact-routing...origin/fix/privacy-contact-routing
  ```
  clean working tree on `7a881f6 docs: record privacy contact routing implementation` (already pushed to `origin` by the start of this session).
- Commits added on top of the previous docs-only state `7a2b42f docs: document privacy contact routing decisions`:
  - `bfbe3d5 feat(db): add mediated contact requests RLS`
  - `7843e1b feat(web): add minor contact policy helper`
  - `0bf3ecc feat(web): add school-mediated contact flow`
  - `4a86621 refactor(web): route interview proposals through privacy checks`
  - `62b7f56 chore(db): align schema snapshot for contact routing`
  - `7a881f6 docs: record privacy contact routing implementation`

### Commands User Ran (and observed results)

- **Push of the branch (by the user, before this documentation pass).** `origin/fix/privacy-contact-routing` is in sync with the local HEAD `7a881f6` per `git status --short --branch`. SSH credentials for further pushes remain blocked (`Permission denied (publickey)`).
- **PR opened on GitHub.** PR **#2** opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`.
- **GitHub checks observed on PR #2.** `Vercel` **failed**, `Vercel Preview Comments` **passed`.
- **Local validations run earlier (PR 1 QA + Security Pass).** `npm run verify:is-minor` ✓ (7/7), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env). Local code validation is green.
- **Attempted Vercel inspect (failed in this workspace).** The user attempted `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` from this workspace. Result: `No existing credentials found` — the Vercel project is owned by a teammate / partner's GitHub account, so it is not visible / fixable from this user's account. The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner.

### Decision

- The blocker is **external** (Vercel project ownership / access), not local code validation. Local validation passed; the only failing check is the external one.
- **Owner action required.** Teammate / partner who owns the Vercel project must inspect the failing deployment, share the build logs, fix the build if actionable, or grant the user access. Exact command for the owner to run from a machine with valid Vercel credentials:
  ```
  npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs
  ```
- **Merge policy.** Whether to merge PR #2 into `caro-maturana` despite the failing external Vercel check is the owner's call. If the Vercel failure is a real code issue it must be fixed in this PR; if it is a Vercel project / environment / access issue, it is out of scope for the PR #2 code diff.
- **Do not start PR 2 (`refactor/feature-boundaries`)** until the merge policy for PR #2 is decided, so the next branch is based on the correct `caro-maturana` state. Stacked branch off local `caro-maturana` is acceptable only if explicitly accepted by the owner.

### Files Changed (this documentation pass)

- `docs/workflow/STATUS.md` — fixed stale "uncommitted" framing; recorded PR #2 opened / pushed, local validation passed, Vercel external blocker; updated "Current Working State" with the new commits and PR state; updated "Known Breakages" with the Vercel external blocker; updated "Next Recommended Action" with the Vercel owner action and the merge-policy decision flow.
- `docs/workflow/NEXT_ACTIONS.md` — Immediate section now reflects PR #2 opened / pushed; added the Vercel external blocker sub-section with the exact `vercel inspect` command and the merge-policy decision flow; "After Current PR" notes the PR 2 (`refactor/feature-boundaries`) branch is planned but not startable yet; "Blocked" section adds the Vercel external blocker.
- `docs/workflow/PR_TRACKER.md` — PR 1 row status updated to "PR #2 opened / pushed / local validation passed / Vercel external failing"; added PR 2 row in the table; added PR 2 detail section.
- `docs/workflow/SESSION_LOG.md` — added this entry.
- `docs/technical/KNOWN_ISSUES.md` — recorded the Vercel external deployment check failure as a known external deployment issue with owner action required.
- `docs/workflow/OPEN_QUESTIONS.md` — added Q16 for Vercel owner access and merge policy when external preview check is failing but local validation passes.
- No code, RLS, migration, server action, helper, script, UI, or `package.json` files were touched. No commit, no push.

### Validation

- Not run in this session, by design (documentation-only pass, per task brief).
- Local validation status (PR 1 QA + Security Pass, 2026-07-05): **green** — `npm run verify:is-minor` ✓ (7/7), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env).

### Risks / Follow-up

- **External Vercel blocker.** Tracked in `KNOWN_ISSUES.md` (External deployment issues) and `OPEN_QUESTIONS.md` Q16. Owner action: teammate / project owner must inspect / fix Vercel or grant access.
- **SSH push still blocked.** The push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier in this session; further pushes remain blocked by credentials (`Permission denied (publickey)`).
- **PR 2 (`refactor/feature-boundaries`) is on hold** until the merge policy for PR #2 is decided.

### Next Session

- Owner / teammate resolves the Vercel external blocker (or grants access) and the merge-policy decision for PR #2 is captured here.
- If PR #2 is merged into `caro-maturana`, start PR 2 (`refactor/feature-boundaries`) per `NEXT_ACTIONS.md` "After Current PR" and `PR_TRACKER.md`. If PR #2 is held by the Vercel fix, do not start PR 2.

## 2026-07-12 — Privacy PR #2 merged to `caro-maturana` (merge from `origin/caro-maturana` into `refactor/feature-boundaries` in progress)

### Context

- Branch: `refactor/feature-boundaries` (HEAD `c795e14` at the merge base, with stacked PR 2 architecture + service-boundary work on top).
- Goal: a **merge sync** from `origin/caro-maturana` into `refactor/feature-boundaries` to sync the privacy PR #2 that landed on `caro-maturana` on 2026-07-12 (`T23:12:36Z`, merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`, including the PR 1B RLS commit `8f39ce63b67f43f11d5dd49a23d28876c4413d05`). The conflict resolution was mostly documentation / `package.json`, but the integration brings in the privacy PR #2 code, including the PR 1B migration (`supabase/migrations/20260705000002_interviews_privacy_rls.sql`). Only the allowlisted documentation files are being edited by this docs-only resolution; `package.json`, `apps/web`, `supabase`, and `scripts` are out of scope and are left to the owner.

### What landed on `caro-maturana` (privacy PR #2)

- **Merge commit:** `6f2be0f5740bc37764e360c4298b8adbcd64fa5f Merge pull request #2 from tvonriegen/fix/privacy-contact-routing` (2026-07-12 `T23:12:36Z`).
- **PR 1B RLS commit (in the merge):** `8f39ce63b67f43f11d5dd49a23d28876c4413d05 fix(security): enforce interview privacy at RLS`.
- **PR 1 commits reachable from the merge:** `bfbe3d5`, `7843e1b`, `0bf3ecc`, `4a86621`, `62b7f56`, `7a881f6`.
- **What the merge brought in:** the PR 1 implementation on `fix/privacy-contact-routing` (HEAD `7a881f6 docs: record privacy contact routing implementation`); the PR 1B interview privacy RLS hardening (`8f39ce6`), which includes `supabase/migrations/20260705000002_interviews_privacy_rls.sql` (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger), `scripts/verify-interviews-privacy-rls.mjs`, root `verify:interviews-privacy-rls` script, and the PR 1B-touched `supabase/schema.sql` sections.
- **Vercel check on PR #2 at merge time:** `Vercel` **failed**, `Vercel Preview Comments` **passed**. That failure is now **historical for PR #2** and remains tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16. The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner.

### Technical PR 2 posture after the merge

- The technical PR 2 (`refactor: split high-risk feature pages into modules`) is **not** asserted as merged. The local `refactor/feature-boundaries` branch holds the stacked Phase A + Phase B presentational work and is now being synced against the new `caro-maturana` HEAD via this merge sync.
- The stacked-branch policy and the retarget / rebase procedure remain in `DECISION_LOG.md` ADR-003 and `OPEN_QUESTIONS.md` Q18. The merge is the trigger to revisit Q18 in a follow-up session: the technical PR 2's base is now drifting from `fix/privacy-contact-routing` to the new `caro-maturana` HEAD (which includes the privacy PR #2 merge commit), and a retarget or rebase is the open question.
- `main` is **not** asserted as updated in this workflow state. The PR 1B INSERT/immutable-trigger correction (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger on identity columns) is already applied in `supabase/migrations/20260705000002_interviews_privacy_rls.sql`. The **mandatory pre-`main` follow-up** is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — this is **not** the INSERT/immutable trigger correction. Structural verification via `npm run verify:interviews-privacy-rls` passed locally, but the runtime Supabase **staging** smoke test for both PR 1 migrations is **pending** and is tracked in `OPEN_QUESTIONS.md` Q15.

### Files Changed (this docs-only resolution)

- `docs/workflow/STATUS.md` — `Current Phase`, `Current PR / Task`, `Last Completed Work`, `Current Working State`, `Known Breakages`, and `Next Recommended Action` resolved to reflect the privacy PR #2 merge and the technical PR 2 stacked posture. No commit, no push.
- `docs/workflow/PR_TRACKER.md` — PR 1 row status updated to **Merged to `caro-maturana` via GitHub PR #2 (merge commit `6f2be0f`)**; PR 2 row updated to reflect the sync against `origin/caro-maturana` and the open retarget / rebase question.
- `docs/workflow/NEXT_ACTIONS.md` — Immediate section now leads with the privacy PR #2 merge state (2026-07-12); the runtime Supabase staging smoke test is reframed as a **follow-up before `main`**, not a blocker for the privacy PR merge; the `interviews.status` UPDATE transition hardening is the mandatory pre-`main` follow-up (differentiated from the INSERT/immutable trigger correction already applied in PR 1B); `package.json` script-ordering is outside the docs-only allowlist and is left to the owner.
- `docs/workflow/SESSION_LOG.md` — this entry.
- `docs/requirements/TRACEABILITY_MATRIX.md` — FR-041 evidence row now reflects both PR 1 and PR 1B migrations reaching `caro-maturana` (no functional requirement change).
- **`package.json`, `apps/web`, `supabase`, and `scripts` are out of scope for this docs-only resolution and were not edited.** `package.json` script-ordering (between `verify:contact-policy` and `verify:interviews-privacy-rls`) is outside the docs-only allowlist and is the owner's call.

### Validation

- Not run in this session, by design (this Phase 1D docs-only pass).
- Privacy PR 1 / PR 1B local validation (2026-07-05): **green** — `npm ci --prefix apps/web` (21 baseline vulnerabilities), `npm run verify:is-minor` ✓ (7/7), `npm run verify:interviews-privacy-rls` ✓, `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (`.env.local` detected but no values read/displayed), `git diff --check` ✓. Security review verdict after the B1 and M1 fixes: **APROBAR, sin BLOCKER / HIGH**.
- Technical PR 2 local validation (2026-07-06, pre-sync): `npm run verify:is-minor` ✓ (7/7), `npm run verify:contact-policy` ✓ (8/8), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓. No regression introduced by this docs-only pass.

### Risks / Follow-up

- **Runtime Supabase staging smoke test is a follow-up before `main`**, not a blocker for the privacy PR #2 merge. Tracked in `OPEN_QUESTIONS.md` Q15. Required to promote `caro-maturana` → `main`.
- **`package.json` script-ordering** (between `verify:contact-policy` and `verify:interviews-privacy-rls`) is outside the docs-only allowlist. The desired post-merge state keeps both scripts; the resolution is the owner's call.
- **External Vercel blocker is historical for PR #2** but still tracked for future reference in `KNOWN_ISSUES.md` and `OPEN_QUESTIONS.md` Q16. No action required from this user's account.
- **SSH push still blocked.** Local `caro-maturana` post-merge is the user's call to push once credentials are restored; this docs-only pass did not stage or commit any of the resolved documentation files.
- **Technical PR 2 retarget / rebase policy (Q18) is now live.** The technical PR 2 branch's base needs a decision: retarget to the new `caro-maturana` HEAD, or rebase, or accept the stacked approach frozen at `fix/privacy-contact-routing` `7a881f6`. To be answered before the first Phase A commit on `refactor/feature-boundaries` lands.

### Next Session

- Resolve any remaining `package.json` script-ordering (between `verify:contact-policy` and `verify:interviews-privacy-rls`) outside the docs-only allowlist, as the owner's call.
- Decide and capture the technical PR 2 retarget / rebase policy in `DECISION_LOG.md` ADR-003 (follow-up) and `OPEN_QUESTIONS.md` Q18, then reflect it in `NEXT_ACTIONS.md` and `PR_TRACKER.md`.
- Schedule the runtime Supabase **staging** smoke test (privacy PR 1 / PR 1B migrations) as a **follow-up before `main`**, per `OPEN_QUESTIONS.md` Q15. Not a blocker for the privacy PR merge; a blocker for promoting `caro-maturana` → `main`.
- The user must explicitly ask before any commit or push on `refactor/feature-boundaries`. Do not auto-commit.

## 2026-07-05 — PR 2 architecture setup (stacked on PR 1)

### Goal

- PR 2 (`refactor/feature-boundaries`): set up the complete documentation architecture for the upcoming refactor of the high-risk feature pages (`profile`, `muro`, `empleos`, `administracion`, `messages`, `DashboardColegio`, `talent`, `apps/web/src/app/actions/contact-requests.ts`) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable. **Documentation only — no code, no commit, no push.**

### Branch

- `refactor/feature-boundaries`, cut from `fix/privacy-contact-routing` (HEAD `7a881f6`) as a **stacked** branch because the privacy PR #2 against `caro-maturana` was held by the external Vercel check at the time. The user accepted the stacked approach (2026-07-05). PR 2 was to be opened against `fix/privacy-contact-routing` (not `caro-maturana`) until the privacy PR #2 landed; the privacy PR #2 was subsequently **merged to `caro-maturana`** on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f` (see the 2026-07-12 entry below), and the retarget / rebase policy is in `OPEN_QUESTIONS.md` Q18 and `DECISION_LOG.md` ADR-003.
- `git status` at session start: clean working tree on `refactor/feature-boundaries`; HEAD is `c795e14 docs: record external Vercel blocker for PR 1`. The `c795e14` commit is on `refactor/feature-boundaries` only and is not on `fix/privacy-contact-routing`.

### High-risk files (baseline measurement, 2026-07-05)

- `apps/web/src/app/profile/page.tsx` — 2888 lines, complexity 61. **Deferred to a dedicated PR (PR 3 or later); out of PR 2 scope.**
- `apps/web/src/app/muro/page.tsx` — 1373 lines, complexity 36. Phase B (optional) in PR 2.
- `apps/web/src/app/empleos/page.tsx` — 1036 lines, complexity 29. Phase B (optional) in PR 2.
- `apps/web/src/app/administracion/page.tsx` — 1309 lines, complexity 19. Phase B (optional) in PR 2.
- `apps/web/src/app/messages/page.tsx` — 680 lines, complexity 20. Only touched in PR 2 if the conversations / messages surface starts sharing helpers with the contact-routing services; otherwise left alone.
- `apps/web/src/components/dashboard/DashboardColegio.tsx` — 443 lines. PR 1 privacy-sensitive (school approve / reject queue). Phase A in PR 2.
- `apps/web/src/app/talent/page.tsx` — 659 lines. PR 1 privacy-sensitive (server-action call). Phase A in PR 2.
- `apps/web/src/app/actions/contact-requests.ts` — 155 lines. PR 1 server action. Phase A in PR 2.

### Architect verdict (2026-07-05)

- **Plan / docs:** Aprobar con observaciones.
- **Implementation:** BLOQUEAR until the gate conditions in `docs/architecture/PR2_FEATURE_BOUNDARIES.md` are met.
- **Sub-decisions (captured in `DECISION_LOG.md` ADR-003):** stacked branch policy (accepted by the user 2026-07-05); test mechanism (open — `OPEN_QUESTIONS.md` Q17); Phase A scope (recommended first: low-risk extractions around the PR 1 contact-routing flow); Phase B scope (optional, only if Phase A is small and green: route-local presentational splits for `muro` / `empleos` / `administracion`); **ProfilePage deep split explicitly deferred** to a dedicated PR (PR 3 or later); no schema / RLS / migration / `package.json` dependency changes except a minimal pure-service test runner if explicitly approved.

### Actions Run

- **Authored the PR 2 architecture entry point.** `docs/architecture/PR2_FEATURE_BOUNDARIES.md` (new). Goals, non-goals, target folder tree, layer contracts (lib/services, components/contact-routing, lib/hooks), extraction order, risk matrix, acceptance criteria, validation checklist, commit plan (Phase A five commits, Phase B three commits), gate conditions (Phase A Gate 1–4, Phase B Gate B1–B4), deferred work (ProfilePage deep split, `respondInterview` / `cancelInterview` admin-client review, broader schema snapshot drift, dependency vulnerability triage, `talent/page.tsx` deeper refactor), risk register, open decisions, references.
- **Updated the codebase map.** `docs/architecture/CODEBASE_MAP.md` now lists the PR 1 contact-routing additions (committed and pushed to `fix/privacy-contact-routing` HEAD `7a881f6`) and the PR 2 planned boundaries (architecture only). High-risk file list includes line counts (2026-07-05) and PR 2 phase mapping (Phase A / Phase B / Deferred).
- **Updated the refactoring plan.** `docs/technical/REFACTORING_PLAN.md` now includes Phase 4 (PR 2 phases A / B with gate conditions) and Phase 5 (follow-up chore PRs: dependency vulnerability triage, broader schema snapshot drift, `respondInterview` / `cancelInterview` admin-client review, ProfilePage deep split, runtime Supabase migration / RLS / trigger smoke test). ProfilePage deep split is explicitly deferred.
- **Updated the workflow state.** `docs/workflow/STATUS.md` reads `refactor/feature-boundaries` as the current branch and PR 2 architecture planning as the current phase. The stacked branch posture is recorded.
- **Updated the next actions.** `docs/workflow/NEXT_ACTIONS.md` Immediate section now leads with the PR 2 architecture setup; the decision flow for Gate 2 (test mechanism) is documented; the Phase A commit plan is recorded; the guardrails (no schema / RLS / migration changes; no behavior / UI changes; no ProfilePage deep split; server action public exports stay byte-identical; no new `package.json` dependencies by default; stacked branch policy) are inlined.
- **Updated the PR tracker.** `docs/workflow/PR_TRACKER.md` PR 2 row: status = architecture planning in progress / stacked on PR 1; base = `fix/privacy-contact-routing` until PR #2 lands. PR 2 detail section expanded with phase scopes, gate conditions, file list for this pass, and PR 3 (ProfilePage deep split) row added.
- **Updated the decision log.** `docs/workflow/DECISION_LOG.md` ADR-003 added (stacked branch policy accepted; test mechanism pending; Phase A scope; Phase B scope optional; ProfilePage deep split deferred; no schema / RLS / migration / `package.json` dependency changes; server action public exports stay byte-identical).
- **Updated the open questions.** `docs/workflow/OPEN_QUESTIONS.md` Q17 (test mechanism decision — open) and Q18 (PR 2 base / retarget policy — open) added.
- **Updated the traceability matrix.** `docs/requirements/TRACEABILITY_MATRIX.md` PR 2 added as a technical-enabler row (no functional requirement change).
- **Updated this file.** Added this entry.

### Files Changed (this pass)

- **Created:** `docs/architecture/PR2_FEATURE_BOUNDARIES.md`.
- **Updated:** `docs/architecture/CODEBASE_MAP.md`.
- **Updated:** `docs/technical/REFACTORING_PLAN.md`.
- **Updated:** `docs/workflow/STATUS.md`.
- **Updated:** `docs/workflow/NEXT_ACTIONS.md`.
- **Updated:** `docs/workflow/PR_TRACKER.md`.
- **Updated:** `docs/workflow/DECISION_LOG.md` (ADR-003).
- **Updated:** `docs/workflow/OPEN_QUESTIONS.md` (Q17, Q18).
- **Updated:** `docs/requirements/TRACEABILITY_MATRIX.md`.
- **Updated:** `docs/workflow/SESSION_LOG.md` (this entry).
- No code, RLS, migration, server action, helper, script, UI, or `package.json` file was touched. No commit, no push.

### Validation

- Not run in this session, by design (documentation-only pass, per task brief).
- Local validation status (PR 1 QA + Security Pass, 2026-07-05): **green** — `npm run verify:is-minor` ✓ (7/7), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env).
- PR 2 implementation validation is defined in `PR2_FEATURE_BOUNDARIES.md` (validation checklist + acceptance criteria) and is gated on `OPEN_QUESTIONS.md` Q17 (test mechanism).

### Risks / Blockers

- **External Vercel blocker on the privacy PR #2 was a carried-over context for the architecture setup, not a current blocker for the technical PR 2.** The privacy PR #2's `Vercel` GitHub check was failing at the time of the architecture setup, which is why the technical PR 2 branch was stacked on `fix/privacy-contact-routing`. Tracked in `KNOWN_ISSUES.md` (External deployment issues) and `OPEN_QUESTIONS.md` Q16. The privacy PR #2 has since been merged to `caro-maturana` on 2026-07-12 (see 2026-07-12 entry); the Vercel failure is now historical for that PR.
- **PR 2 implementation is gated on Gate 2 (test mechanism).** Until the owner picks a test mechanism (`OPEN_QUESTIONS.md` Q17), Phase A code cannot land. The architecture pass does not require Gate 2 to be resolved; only the implementation pass does.
- **Stacked branch may need to retarget.** If `caro-maturana` advances (e.g. dependency triage PR) before the technical PR 2 lands, the stacked branch will need a rebase. The rebase risk is low because the technical PR 2 does not touch `supabase/`, `package.json`, or `apps/web/src/app/api/`, but it is real and is tracked in `OPEN_QUESTIONS.md` Q18. With the privacy PR #2 now merged, Q18 is the live open question for the technical PR 2 branch.
- **Phase B growth risk.** If Phase A is larger than the "small and reversible" tolerance, Phase B is dropped. The gate is the commit count and the diff size, not a calendar date.
- **ProfilePage deep split deferred.** The largest single file in the repo stays large after PR 2. Tracked in `OPEN_QUESTIONS.md` (follow-up) and `PR_TRACKER.md` PR 3 (planned, not started).
- **SSH push still blocked.** The push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier; further pushes remain blocked by credentials (`Permission denied (publickey)`).

### Next Session

- Owner reviews `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and `DECISION_LOG.md` ADR-003, confirms Phase A scope and the stacked branch policy, and picks a test mechanism (Gate 2 — `OPEN_QUESTIONS.md` Q17).
- Commit the PR 2 architecture docs on `refactor/feature-boundaries` with a `docs:` prefix per `docs/git/COMMIT_CONVENTION.md`. Push to `origin/refactor/feature-boundaries` once SSH credentials are restored (or wait for the user to push). Open PR 2 against `fix/privacy-contact-routing` (not `caro-maturana`) per the stacked branch policy.
- Once Gate 2 is resolved, implement Phase A per the commit plan in `PR2_FEATURE_BOUNDARIES.md` (five atomic commits, in order). Update `SESSION_LOG.md`, `PR_TRACKER.md`, `CODEBASE_MAP.md`, `REFACTORING_PLAN.md`, and `TRACEABILITY_MATRIX.md` as commits land.
- If Phase A is small and green, consider Phase B (optional, three independent commits, one per route).
- Open a follow-up entry in `OPEN_QUESTIONS.md` and a follow-up PR row in `PR_TRACKER.md` (PR 3 or later) for the ProfilePage deep split, so the deferred work is not lost.

## 2026-07-05 — PR 2 Phase A service-boundary implementation

### Goal

- Implement only the authorized Phase A service-boundary extraction around `contact-requests`, resolve Gate 2 with a no-new-dependency verify script, and avoid schema/RLS/migration/API/profile/UI redesign changes. No commit, no push.

### Initial Inspection

- Confirmed `git status --short --branch` was clean on `refactor/feature-boundaries`.
- Confirmed `git log --oneline -5` had `c3dead6 docs: define PR 2 feature boundary architecture` at HEAD.
- Read `docs/architecture/PR2_FEATURE_BOUNDARIES.md` and `docs/workflow/NEXT_ACTIONS.md` before editing.

### Actions Run

- Moved `ensureConversation` from `apps/web/src/app/actions/contact-requests.ts` to `apps/web/src/lib/services/conversations.ts`, preserving canonical pair ordering, race fallback, and `last_message_at` initialization.
- Added `apps/web/src/lib/services/contact-policy.ts` with pure `decideContactPath` and exported types for script/test coverage. It imports `isMinorProfile`.
- Added `apps/web/src/lib/services/contact-requests.ts` as the internal RLS-client service used by `requestContactWithTalent`.
- Reduced `apps/web/src/app/actions/contact-requests.ts` to a thin shell for `requestContactWithTalent`; public exports remain `requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, and `cancelContactRequest`.
- Added `scripts/verify-contact-policy.mjs` and root script `verify:contact-policy` without adding dependencies.
- Updated workflow / architecture docs to record Gate 2 resolution, service-boundary extraction, validation, and deferred UI/Phase B work.

### Validation

- `npm run verify:contact-policy` ✓ — 8/8 canonical cases.
- `npm run verify:is-minor` ✓ — 7/7 canonical cases.
- `npm run typecheck` ✓.
- `npm run lint` ✓.
- `npm run build` ✓.

### Guardrails Confirmed

- No changes under `supabase/`.
- No changes under `apps/web/src/app/api/`.
- No changes to `apps/web/src/app/profile/page.tsx`.
- No UI redesign and no intentional behavior change.
- No new dependencies, no commit, no push.

### Next Session

- Review the staged diff and decide whether to keep PR 2 limited to this service-boundary subset or continue with the remaining optional Phase A UI extractions (`ContactRequestQueue`, `useContactTalent` / `ContactTalentButton`).
- Commit only if explicitly requested by the user.

## 2026-07-06 — PR 2 Phase A UI + Phase B presentational continuation

### Goal

- Complete the remaining Phase A contact-routing UI extraction and perform limited, reversible Phase B presentational route splits for `muro`, `empleos`, and `administracion`. No schema/RLS/migration, no `supabase/`, no `apps/web/src/app/api/`, no `profile/page.tsx`, no dependency, no commit, no push.

### Initial Inspection

- `git status --short --branch` showed `refactor/feature-boundaries` with uncommitted PR 2 Phase A service/doc changes.
- `git diff --stat` showed existing changes in `apps/web/src/app/actions/contact-requests.ts`, workflow/architecture docs, `package.json`, new `apps/web/src/lib/services/`, and `scripts/verify-contact-policy.mjs`.

### Actions Run

- Added `apps/web/src/components/contact-routing/types.ts` for shared contact-routing UI types.
- Extracted the school contact request mediation section from `DashboardColegio` into `apps/web/src/components/contact-routing/ContactRequestQueue.tsx`, preserving text, Tailwind classes, approve/reject buttons, spinner, and error UI.
- Updated `apps/web/src/components/dashboard/DashboardColegio.tsx` to render `ContactRequestQueue` while keeping the existing Supabase query and approve/reject handlers in the page component.
- Added `apps/web/src/lib/hooks/useContactTalent.ts` to own talent CTA loading/error/contacted state around `requestContactWithTalent`.
- Added `apps/web/src/components/contact-routing/ContactTalentButton.tsx` and updated `apps/web/src/app/talent/page.tsx` to use the hook/button without changing labels or visible states.
- Phase B `muro`: added `apps/web/src/app/muro/_components/MuroHeader.tsx` and replaced the equivalent header JSX. No feed fetch, filters, post mutations, comments, save logic, or job-apply logic moved.
- Phase B `empleos`: added `apps/web/src/app/empleos/_components/CompanyStatsGrid.tsx` and replaced the equivalent company analytics grid. No server actions, `proposeInterview`, applicant mutations, or Supabase logic moved.
- Phase B `administracion`: added `apps/web/src/app/administracion/_components/AdminHeader.tsx` and `AdminTabs.tsx`, then replaced equivalent JSX. No school actions/mutations, student management logic, request updates, or Supabase logic moved.
- Updated workflow / architecture docs to record Phase A complete locally and Phase B presentational complete locally.

### Validation

- `npm run verify:is-minor` ✓ — 7/7 canonical cases.
- `npm run verify:contact-policy` ✓ — 8/8 canonical cases.
- `npm run typecheck` ✓ — `tsc --noEmit` clean.
- `npm run lint` ✓ — no ESLint warnings or errors.
- `npm run build` ✓ — Next.js production build compiled successfully, 20/20 static pages generated.

### Guardrails Confirmed

- No changes under `supabase/`.
- No changes under `apps/web/src/app/api/`.
- No changes to `apps/web/src/app/profile/page.tsx`.
- No new dependencies.
- No intentional UI/behavior changes.
- No commit, no push.

### Risks / Follow-up

- Phase B was intentionally limited to pure presentation. Deeper route composition, hooks, and data-shape extractions remain future work.
- Final validation matrix is green. Commit/push remain intentionally not performed.

## 2026-07-05 — PR 1B Interview privacy RLS hardening

### Context

- Branch: `fix/privacy-contact-routing`.
- Start state: clean working tree at `c795e1401d2734e70240f4b8071db8573f5304a5` (HEAD == origin/fix/privacy-contact-routing).
- Goal: close the direct-insert bypass on `interviews` inside the same PR #2, without committing or pushing.

### Actions Run

- Created `supabase/migrations/20260705000002_interviews_privacy_rls.sql`:
  - Replaced `interviews_insert_company` with a `WITH CHECK` policy enforcing `auth.uid() = company_id`, `status = 'proposed'`, application ownership via `job_applications` → `job_postings`, `applicant_id = student_id`, and `can_converse(company_id, student_id)`.
  - Added `trg_interviews_guard_immutable` BEFORE UPDATE trigger to prevent mutation of `application_id`, `company_id`, `student_id`, and `created_at`.
- Audited `interviews_update_participant`: it allowed mutating identity columns, so the immutable trigger was required and added.
- Updated `supabase/schema.sql` for PR 1B touched sections only:
  - Added `applicant_id` to `job_applications` and kept `student_id` as the sync alias.
  - Added the `interviews` table, indexes, RLS enable, policies (select / hardened insert / update), and the immutable trigger.
- Added `scripts/verify-interviews-privacy-rls.mjs` and root `verify:interviews-privacy-rls` script in `package.json`.
- Updated documentation:
  - `docs/technical/KNOWN_ISSUES.md` — recorded the bypass fix and pending runtime smoke test.
  - `docs/architecture/SECURITY_MODEL.md` — added PR 1B interview INSERT hardening section.
  - `docs/requirements/TRACEABILITY_MATRIX.md` — updated FR-041 evidence and verification status.
  - `docs/workflow/SESSION_LOG.md` — this entry.

### Validation

- `npm ci --prefix apps/web` — passed (≈ 9 s). The install reported 21 known dependency vulnerabilities on the baseline; no new vulnerabilities introduced by this pass (tracked in `docs/technical/KNOWN_ISSUES.md`).
- `npm run verify:is-minor` — passed; 7/7 canonical cases pass.
- `npm run verify:interviews-privacy-rls` — passed; all required invariants found in the new migration.
- `npm run typecheck` — passed; `tsc --noEmit` clean.
- `npm run lint` — passed; no ESLint warnings or errors.
- `npm run build` — passed; Next.js production build compiled successfully. `.env.local` was detected by Next.js but no values were read or displayed.
- `git diff --check` — passed; no trailing whitespace / conflict-marker issues.

### Risks / Follow-up

- Runtime Supabase **staging** smoke test for `supabase/migrations/20260705000002_interviews_privacy_rls.sql` is **still pending** as a **follow-up before `main`**: verify that a company can still propose an interview for its own application, and that direct inserts with swapped `student_id`, wrong `company_id`, non-'proposed' status, or applications from another company are rejected. No remote Supabase instance was exercised during this pass. Tracked in `OPEN_QUESTIONS.md` Q15. The **mandatory pre-`main` follow-up** is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — not the INSERT/immutable trigger correction (already applied in PR 1B) — and is the gate for promoting `caro-maturana` → `main`; not a blocker for the privacy PR #2 merge.
- `respondInterview` / `cancelInterview` still use the admin client and remain out of PR 1 / PR 1B scope; a follow-up admin-client review is still tracked.
- Broader `schema.sql` / `full_reset.sql` / older-migration drift remains outside the PR 1B touched sections.

### Next Session

- Run the runtime RLS / trigger smoke test on a Supabase **staging** instance when available, as a **follow-up before `main`** (see `OPEN_QUESTIONS.md` Q15).
- The PR 1B changes were merged as part of GitHub PR #2 (https://github.com/tvonriegen/UXUI/pull/2) to `caro-maturana` with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f`; the commit `8f39ce63b67f43f11d5dd49a23d28876c4413d05 fix(security): enforce interview privacy at RLS` is reachable from `caro-maturana` via that merge. The "amend PR #2" framing in the original entry is now **historical**: the PR #2 update happened through the merge itself, not as a separate amend.
- Schedule the runtime Supabase staging smoke test as a follow-up before `main` (not a blocker for the privacy PR #2 merge; a blocker for promoting `caro-maturana` → `main`).

## 2026-07-26 - Main normalization and direct integration

### Goal

- Integrate the complete TalentHub feature history into `main`, close the documented security gaps, normalize the workflow documentation and leave `main` as the only active branch.

### Actions Run

- Confirmed the worktree was clean on `feature/value-added-ux` at `9f766e9` and `main` was at `0e32d98`.
- Fetched remote refs and confirmed the latest functional SHA was `9f766e9`.
- Added `supabase/migrations/20260726000001_interviews_status_transitions.sql` with participant-scoped updates and status transition guards.
- Removed the admin-client bypass from `respondInterview` and `cancelInterview`.
- Protected `/api/seed` outside local development when `SEED_SECRET` is absent.
- Updated `supabase/schema.sql` and extended `verify-interviews-privacy-rls.mjs` to cover the new transition migration.
- Committed the hardening as `695622f fix: harden interview transitions and seed endpoint`.
- Merged `feature/value-added-ux` into `main` with `34e21205 merge: integrate TalentHub product flow`.
- Replaced stale current-state workflow documents and recorded ADR-004.

### Validation

- `npm run verify:is-minor` passed: 7 cases.
- `npm run verify:contact-policy` passed: 8 cases.
- `npm run verify:interviews-privacy-rls` passed: 25 invariants.
- `npm run verify:explainable-match` passed: 9 cases.
- `npm run verify:application-readiness` passed: 15 cases.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and generated 20 pages.
- `git diff --check` passed before the integration commit.

### Risks / Follow-up

- Supabase staging was not available from this workspace, so runtime RLS and trigger behavior remains external verification.
- The dependency tree still has the previously reported 21 vulnerabilities.
- Historical branches are being removed from the active workflow; their commits remain reachable from `main`.

## 2026-07-26 - Remaining branch integration

### Goal

- Inspect all remote branches before cleanup and integrate any unique work into `main`.

### Actions Run

- Compared every remote branch against `main` after the first integration.
- Confirmed `feature/pr4-ux-iteration-ignacio`, `test`, `Test-thomas` and `Entrega-Pasada` had no unique commits.
- Found unique rebrand work at `6c7ae79 Cambios colores` on `feature/talenthub-rebrand`.
- Merged it directly into `main` with `f3eb54d merge: integrate TalentHub rebrand`.
- Resolved the README status conflict in favor of the normalized `main` state.

### Validation

- Re-ran all five verification scripts, `npm run typecheck`, `npm run lint` and `npm run build`.
- All checks passed; the build generated 20 pages.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING.** This earlier rev. 1 entry is preserved for traceability; its gate, organization, enrollment, projection and audit-column wording is not active.

### Goal

- Apply the auditor's findings to the gap analysis and ADR-004 (alignment of D-01..D-43 to the **mandate numbering**, ownership vs actor, memberships as authority, no FK to views before migration, `created_by_profile_id NOT NULL` for new writes, applications A–D deferred without gate circularity, RLS vs server-action evidence, freelance expand/contract, posts current-vs-target, notifications payload/link redaction, section references and NEXT_ACTIONS numbering, git state).
- Preserve the previous worktree modifications. The historical blocks in the workflow docs are not rewritten; only new blocks are added.
- This mission is documentation-only. No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no workflow file outside the four workflow docs is touched. No commit, no push.

### Initial inspection

- Branch: `stabilization/release-readiness` (HEAD `be3ed9e`, same commit as `main`).
- Worktree at start: **7 previously modified files** carried over from the previous docs pass + **2 new files** (this mission's two architecture documents).
  - 7 previously modified files: `M apps/web/src/test/setup.ts` (Phase 1, by the implementer earlier in this mission), `M docs/technical/KNOWN_ISSUES.md`, `M docs/workflow/HANDOFF.md`, `M docs/workflow/NEXT_ACTIONS.md`, `M docs/workflow/OPEN_QUESTIONS.md`, `M docs/workflow/SESSION_LOG.md`, `M docs/workflow/STATUS.md`.
  - 2 new files: `?? docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md`, `?? docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md`.
- The previous docs pass's rev. 1 of the gap analysis and ADR-004 used the auditor's previous D-01..D-43 numbering (which conflicted with the mandate numbering). This mission rewrites the two files with the **mandate numbering** and applies the auditor's findings. The rev. 1 numbering is preserved in the previous 2026-08-05 entry in this file (rev. 1, superseded) and is **not** the canonical numbering going forward.

### Corrections applied (this mission)

- **D-01..D-43 numbering alignment (mandate numbering).** The gap analysis §3..§14 and the ADR §6 use the **mandate numbering** (D-01 profiles personas, D-02 organizations no login, D-03 school organization, D-04 company organization, D-05 owner único inicial / multi futuro, D-06 sin credenciales compartidas, D-07 memberships autoridad, D-08 account_type solo routing/onboarding, D-09 role legacy, D-10 graduated stage, D-11 external personal profile, D-12 external publishes only freelance_request, D-13 external no organization baseline, D-14 future external_client ADR, D-15 student_enrollments historical, D-16 school_id no permanent relationship, D-17 school administers context, not profile, D-18 evidence belongs to student, D-19 validation belongs to school, D-20 posts social/editorial, D-21 posts not applications/proposals, D-22 post may link to opportunity, D-23 company/school posts organizational, D-24 student posts personal, D-25 external no posts-hub initially, D-26 opportunities canonical, D-27 tipos job/internship/company_project/freelance_request, D-28 company three types, D-29 external solo freelance_request, D-30 school no commercial opportunities, D-31 publisher derived from auth, D-32 client no publisher_type, D-33 client no self-assign organization IDs, D-34 applications empresariales, D-35 proposals freelance, D-36 internship_requests temporal workflow, D-37 minor transversal protection, D-38 contact authorization explicit/scoped/revocable/expirable/school-mediated/opportunity-scoped, D-39 created_by_profile_id actor, D-40 ownership and creator distinct, D-41 single source of authorization, D-42 school_members adapter/view, D-43 no structural change without ADR/baseline/backfill/RLS/rollback/staging). The auditor's previous D-01..D-43 numbering is superseded.
- **Ownership vs actor (D-07, D-39, D-40).** `organization_memberships.member_role` is the canonical authority; `created_by_profile_id` is the actor audit, not the owner; the resource ownership columns are `publisher_organization_id` (for company / school) and `publisher_profile_id` (for external personal). The client does not provide any of them (D-31, D-32, D-33). The current `publisher_id` and `publisher_type` are transitional identifiers.
- **Organizations (D-03, D-04, D-07, D-42, FK-to-view blocker).** `organizations.profile_id` is recorded as an **adapter / backfill** column, not the canonical owner reference. `schools` and `company_profiles` are **not** declared to become views immediately; they remain as physical tables during the transition, with the views introduced only after the inbound FKs (`student_profiles.school_id`, `contact_requests.school_id`, `internship_requests.school_id`) have moved (FK-to-view blocker). A PostgreSQL view cannot be the target of a foreign key constraint.
- **created_by_profile_id (D-39, D-40).** The column is `NOT NULL` for new writes; the backfill maps the actor (publisher for `opportunities`, applicant for applications/proposals) or blocks the row; the column has no `ON DELETE SET NULL`. The structural decision is recorded; the operational choice for service-role backfilled rows is D-OD-4 (not a structural decision). The previous "D-OD-4: NULL vs NOT NULL for service-role backfilled rows" is no longer a structural open decision.
- **Applications / proposals (D-34, D-35, D-36, D-OD-1).** The four alternatives (A, B, C, D) are recorded in gap analysis §8.4; **none is selected in this phase**. D-OD-1 is **not** a gate for ADR-004 acceptance. The RLS-vs-server-action evidence is recorded honestly: the existing `proposals_insert_student` RLS and the `submitProposal` server action both check `account_type = 'student'`; the audit does **not** claim that RLS alone forces the persona.
- **Freelance rename (D-27, expand/contract).** The rename is recorded as an expand/contract operation: the new value `freelance_request` is added in an expand migration, the application code is moved to the new value, the legacy value is removed in a contract migration. The rename is not executed in this docs pass.
- **Posts (D-20..D-25).** The current state (own-writes RLS, public reads, documented institution-scoped writes in `AUTHORIZATION_MATRIX.md:18`) is distinguished from the target state (D-20..D-25). The posts surface is **covered by the gap analysis** (D-20..D-25 in §14); the schema migration is a deferred sub-phase and is **not** in Phase 1B. The audit does **not** claim that posts are out of scope or irrelevant.
- **Minor notifications (D-37, D-38, D-OD-7).** Notifications are the user's own row. The transversal protection (D-37) means the **payload / link** must not leak private data, and the notification must not create a new contact channel outside the school-mediated path. The audit does **not** propose a trigger that blocks legitimate notifications to the student. D-38 (contact authorization: explicit + scoped + revocable + expirable + school-mediated + opportunity-scoped) is recorded with `revoked_at` and `expires_at` as the deferred addition (D-OD-6).
- **Section references and NEXT_ACTIONS numbering.** The previous docs pass's "Identity / Organizations / Resource Ownership — Documentation Pass (2026-08-05, parallel docs pass)" section in NEXT_ACTIONS.md had items 32-35 before the read-only inventory follow-ups 26-31. The new "Identity / Organizations / Resource Ownership — Docs Correction (2026-08-05, this mission)" block in NEXT_ACTIONS.md re-presents the items in the **corrected order** (26-31 first, then 32-35) and is the canonical ordering going forward. The historical ordering in the previous block is preserved and is not the canonical ordering. Section references in the gap analysis (§3..§19) and ADR (§1..§15) are aligned (e.g. §14 = target model, §15 = migration order, §16 = open decisions, §17 = gates, §18 = known contradictions and risks, §19 = acceptance criteria).
- **Git state.** The git state is recorded as **7 previously modified files + 2 new files** (this mission's two architecture documents) + surgical additive references in the 4 workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS). The git state is **not** "only the docs-pass files"; the 7 previous files are recognized and preserved.

### Files modified (this mission)

- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — rewritten to align D-01..D-43 with the mandate numbering and apply the auditor's findings.
- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — rewritten with the same corrections. Status remains **Proposed**.
- `docs/workflow/STATUS.md` — new block at the end (preserves all previous content).
- `docs/workflow/NEXT_ACTIONS.md` — new block at the end (preserves all previous content; the new block uses the corrected ordering 26-31 then 32-35).
- `docs/workflow/SESSION_LOG.md` — this entry.
- `docs/workflow/OPEN_QUESTIONS.md` — new block at the end (preserves all previous content).

No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no other workflow file is touched. The 7 previously modified files (apps/web/src/test/setup.ts, docs/technical/KNOWN_ISSUES.md, docs/workflow/HANDOFF.md and the 4 workflow files above) are **preserved unchanged**; the 4 workflow files received **additive blocks only**. The 2 new files are the gap analysis and ADR-004 in this mission.

### Validation

- `git diff --check` (clean) — no trailing whitespace, no conflict markers.
- `git status --short --branch` — 7 previously modified files + 2 new files + the additive references in the 4 workflow docs.
- No `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call was executed in this mission. The mission is documentation-only.

### Risks / Follow-up

- Phase 1B (schema-only) and all migrations remain **BLOCKED**. The corrections do not open Phase 1B; the gates in `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` §17 remain non-negotiable.
- ADR-004 is **Proposed**, not **Accepted**. The acceptance criteria in ADR-004 §15 do **not** require D-OD-1 to be closed; D-OD-1 is its own gate for Phase 1B-applications.
- The two new files are untracked (`??`). They are not committed in this mission. The next session decides whether to commit them under a `docs:` prefix and to push.
- The historical blocks in the four workflow docs are preserved; the corrected ordering is in the new block. The next contributor can choose to clean up the historical ordering or leave it as historical.

### Next session

- Review the corrected gap analysis and ADR-004; confirm that the auditor's findings are addressed and that the mandate numbering is consistent.
- Decide whether to commit the documentation diff (the 2 new files + the additive blocks in the 4 workflow docs) under a `docs:` prefix. Do not push.
- Continue with the open decisions in the gap analysis §16 and ADR-004 §14 (D-OD-1..D-OD-7) when the product owner is ready. D-OD-1 is its own gate for Phase 1B-applications.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (rev. 3, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING.** This rev. 3 entry is preserved for traceability; its four-gate, current-academic-context, projection-view and organization back-reference wording is not active.

### Goal

- Incorporate the auditor's observations into the gap analysis and ADR-004: the four-gate model, the school_id matrix, the XOR ownership invariant, the unique owner active flow, the company_profiles formal explanation, the created_by_profile_id audit-only reiteration, the views/grants/security principles and projection table, the applications/proposals concept vs table distinction, the expand/transition/contract framework and the freelance expand/transition/contract plan, the RLS runtime staging posture, and the revised acceptance criteria.
- The user explicitly authorized a documentation-only session on the `stabilization/release-readiness` branch. **No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched.** No commit, no push. No edits to `ROLE_MODEL.md`, `DATA_MODEL.md`, `AUTHORIZATION_MATRIX.md`, `SECURITY_MODEL.md`, `HANDOFF.md` or `KNOWN_ISSUES.md`. Only the six files in the user's allowlist are modified.
- The mission is **FASE 0 COMPLETE / ADR READY FOR OWNER ACCEPTANCE / GAP ANALYSIS READY FOR AUDIT (APPROVED pendiente auditoría) / CORE READY / PUBLISHING READY WITH DEFERRED ITEMS / INTERACTIONS BLOCKED D-OD-1 / MIGRATIONS BLOCKED / IMPLEMENTATION BLOCKED / SUPABASE UNCHANGED.**

### Initial inspection

- Branch: `stabilization/release-readiness` (HEAD `be3ed9e`, same commit as `main`).
- Worktree at start: **7 previously modified files** carried over from the previous docs pass + **2 new files** (this mission's two architecture documents).
  - 7 previously modified files: `M apps/web/src/test/setup.ts` (Phase 1, by the implementer earlier in this mission), `M docs/technical/KNOWN_ISSUES.md`, `M docs/workflow/HANDOFF.md`, `M docs/workflow/NEXT_ACTIONS.md`, `M docs/workflow/OPEN_QUESTIONS.md`, `M docs/workflow/SESSION_LOG.md`, `M docs/workflow/STATUS.md`.
  - 2 new files: `?? docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md`, `?? docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md`.
- The rev. 1 / rev. 2 of the gap analysis and ADR-004 are preserved in the previous 2026-08-05 entries. The rev. 3 is the post-auditor rev. 2 follow-up and is the canonical version going forward.

### Corrections applied (this mission)

- **Four-gate model (A ADR conceptual, B Core schema-only, C Interactions schema-only, D migraciones ejecutables).** §17 of the gap analysis / §15 of the ADR. The gates are explicitly non-circular. Gate A is the ADR conceptual acceptance; the criteria do not require D-OD-1, migrations authored, staging applied, runtime RLS or production. Gate B is the Core schema-only (D-OD-1 not required). Gate C is the Interactions schema-only (D-OD-1 required). Gate D is the executable migration (runtime + staging + production). Runtime grants, fixtures and the RLS runtime verification are Gate D concerns, not Gate A or Gate B concerns.
- **School_id matrix.** §9.4 of the gap analysis. The matrix enumerates every `school_id` column, function and server action. The classification is Propietario / Contexto / Institución mediadora / Matrícula / Histórico / Redundante / Variable. `profiles.school_id` is recorded as historical and never as identity or authorization. `student_profiles.school_id` is the current academic context, substitutable conceptually by `student_enrollments` with an active record, retainable as an adapter during the transition, and not the basis for a new policy while `schools` is a view. `school_members.school_id` maps to `organization_memberships.organization_id` with `organizations.kind = 'school'`. The exhaustive matrix covers `profiles.school_id`, `student_profiles.school_id`, `school_members.school_id`, `contact_requests.school_id`, `interviews.school_id` (if exists), `internship_requests.school_id`, `profile_evidence.school_id`, `profile_evidence_events.school_id`, `skill_validations.school_id`, `school_reports.school_id`, `notifications.school_id`, `student_enrollments.school_id`, SQL functions that receive `school_id`, and server actions that receive `school_id`.
- **XOR ownership invariant.** §7.4 of the gap analysis / I-11 of the ADR. The rule is "exactly one of (organization owner, profile owner) is set; never both, never neither". The client never sends either FK (D-31, D-32, D-33). The XOR table records actor, owner, context and per-resource rule for `opportunities`, `posts`, `contact_requests`, `student_contact_authorizations`, `interviews`, `applications` and `opportunity_proposals`. The author (`created_by_profile_id`) is distinct from the owner (D-40). The Company A / membership revoked example is recorded in §10.2.
- **Unique owner active (D-05).** §5.4 of the gap analysis / I-18 of the ADR. The **8-step conceptual transfer flow**, the suspension semantics (no auto-promote), the initial UI (one owner), and the four implementation options (partial unique index, transactional function, defensive trigger, or combination) are recorded as future implementation decisions. This rev. 3 entry is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**. **No SQL is written in this document; the choice is a Gate B concern.**
- **`company_profiles` formal explanation.** §4.4 of the gap analysis. PK, relation to `profiles` and `auth.users`, identity of the company, resources that reference it, policies, server actions and routes, the three current uses (as company owner of resources, as per-person profile, as implicit `organization_id`), the target destination (`organizations(kind='company')`), the conversion of the admin to a membership owner active, the compatibility recommendation (single-table view, justified), and the no-automatic-creation rule with the six reviewed classes (duplicates, shared accounts, multiple accounts, companies without a user, users without a company, resources without an owner) are recorded.
- **`created_by_profile_id` audit only — reiterated.** §10.2, §13.4, §7.4 of the gap analysis / I-12, I-15, I-19, §7.3, §7.6 of the ADR. The column is not an authorization source, not an ownership column, not a capacity column; the RLS layer does not read it; the application layer does not update it. The Company A / membership revoked example is the canonical illustration: the column records the historical actor; it does not grant or revoke any capability.
- **Views / grants / security principles.** §13.4 of the gap analysis / I-20, §7.7 of the ADR. The principles (allowlist over blocklist; no `SELECT *`; `security_invoker = true` preferred; `security_barrier` when multi-table; `anon` only on public projections; `authenticated` no blanket; `PUBLIC` no unnecessary grants; fixed `search_path` in helpers; `SECURITY DEFINER` justified; `EXECUTE` minimum) and the conceptual projection table (10 projections: `public_student_profile`, `public_company_profile`, `public_school_profile`, `public_opportunity`, `public_post`, `public_freelance_request`, `authenticated_student_profile`, `authenticated_opportunity_detail`, `authenticated_post_detail`, plus the implicit joins) with consumer, allowed columns, security mode and grants are recorded. The excluded columns (birth_date, email, phone, internal IDs, institutional notes, psychological data, private evidence, memberships, internal enrollments, unapproved data) are listed. Runtime grants are Gate D.
- **Applications / proposals concept vs table.** §8.6 of the gap analysis / §7.4 of the ADR. The conceptual contract (Company uses applications; External uses opportunity_proposals; posts are not applications / proposals; applications are not `freelance_request`; proposals are not `job`, `internship`, `company_project`) is approved. The physical table (alternatives A, B, C, D) is Gate C and is the only blocker for Gate C. The matrix of alternatives A–D with the eight dimensions the auditor named (compatibilidad, RLS, FK, triggers, código, riesgo, rollback, costo, IDs) is recorded without selecting one.
- **Expand / transition / contract.** §15.12 of the gap analysis / §11.12 of the ADR. The framework governs every step in the migration order. The principles (additive, idempotent, observable, gradual, centralized dual-write layer, adapters, contract only at the end, no duplicates, safe re-run, checksums when viable, rejected rows recorded, no overwrite of new data) are recorded.
- **Freelance expand / transition / contract.** §15.13 of the gap analysis / step 5 of the ADR migration plan. The expand adds `freelance_request` to the CHECK; the transition moves the readers; the contract drops `freelance`. The contract is forward-only non-destructive; the `opportunity_id` is preserved; the `opportunity_proposals` table is **not** renamed in this step; the counts before and after each phase are recorded. The rollback semantics for expand, transition and post-contract are explicit.
- **RLS runtime staging posture.** §17.D of the gap analysis / §15.D of the ADR. RLS runtime is a Gate D concern, not a Gate A or Gate B concern. Staging is available but may be empty during Gate B / Gate C. The fixtures catalog is the only thing the gap analysis records; the fixtures themselves are not created. The RLS runtime verification is a Gate D step that exercises the RLS predicates with disposable Supabase integration tests.
- **ADR acceptance criteria (Gate A).** §15.A of the ADR. The criteria are ownership inequívoco (D-05, D-31..D-33, I-11, I-18); autoridad canónica (D-07, I-15); decisiones aprobadas (D-01..D-43 fixed inputs); compatibilidad conceptual (§10, §11.12, §15.12, §15.13, §9.4, §4.4, I-20, §13.4); gates coherentes (the four-level model is explicit and non-circular); decisiones diferidas aisladas (D-OD-1..D-OD-7 in §14 with their respective gates). **D-OD-1 is not a Gate A criterion.** The ADR is **not** auto-Accepted by the rev. 3 update; the status is **Proposed — OWNER ACCEPTANCE REQUIRED**.

### Active state (this mission)

- **FASE 0 COMPLETE** — the gap analysis and ADR-004 are rev. 3 and incorporate the auditor's observations.
- **ADR READY FOR OWNER ACCEPTANCE** — the ADR is **Proposed — OWNER ACCEPTANCE REQUIRED**; the Gate A criteria are in §15.A and do not require D-OD-1, migrations authored, staging applied, runtime RLS or production.
- **GAP ANALYSIS READY FOR AUDIT** — the gap analysis is rev. 3 and exposes the sections named above; the verdict is **APPROVED pendiente auditoría** (the independent audit closes the rev. 2 open observations).
- **CORE READY** — the Core schema (Gate B) has the structural target formalized in the gap analysis §14 / §15 and in the ADR §7 / §11. Gate B itself is **BLOCKED** by B.2 (staging) + B.3 (CI Node 22) + B.5 (Core migration plan).
- **PUBLISHING READY WITH DEFERRED ITEMS** — Posts (D-20..D-25) target shape is recorded; the schema migration is its own deferred sub-phase.
- **INTERACTIONS BLOCKED D-OD-1** — the conceptual contract is approved; the physical table is Gate C and is the only blocker for Gate C.
- **MIGRATIONS BLOCKED** — all migrations are blocked by Gate D (baseline remote reconciled, design audit, backfill, rollback, RLS review, staging, RLS runtime, production authorized).
- **IMPLEMENTATION BLOCKED** — no implementation is in scope; implementation is blocked by Gate A, B, C and D.
- **SUPABASE UNCHANGED** — no Supabase mutation, no migration, no SQL, no policy, no server action, no RLS predicate, no view, no grant, no fixture, no execution is performed in this docs pass.

### Files modified (this mission)

- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — rewritten to rev. 3 with the four-gate model (§17), the school_id matrix (§9.4), the XOR ownership invariant (§7.4), the unique owner active flow (§5.4), the company_profiles formal explanation (§4.4), the created_by_profile_id audit-only reiteration (§10.2, §13.4, §7.4), the views/grants/security principles and projection table (§13.4), the applications/proposals concept vs table distinction (§8.6), the expand/transition/contract framework (§15.12) and the freelance expand/transition/contract plan (§15.13), the RLS runtime staging posture (§17.D), and the revised acceptance criteria (§19).
- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — rewritten to rev. 3 with the same corrections and the four-gate model (§15). Status is **Proposed — OWNER ACCEPTANCE REQUIRED**; the rev. 3 update does **not** auto-Accept.
- `docs/workflow/STATUS.md` — the **Current Phase** section updated with the active state (FASE 0 COMPLETE / ADR READY FOR OWNER ACCEPTANCE / GAP ANALYSIS READY FOR AUDIT / CORE READY / PUBLISHING READY WITH DEFERRED ITEMS / INTERACTIONS BLOCKED D-OD-1 / MIGRATIONS BLOCKED / IMPLEMENTATION BLOCKED / SUPABASE UNCHANGED). The historical 2026-08-05 rev. 1 / rev. 2 blocks are preserved.
- `docs/workflow/NEXT_ACTIONS.md` — the historical "Documentation Pass (2026-08-05, parallel docs pass)" block is explicitly marked as **HISTORICAL (rev. 1 docs pass, superseded by the rev. 3 follow-up block)**. The rev. 2 "Docs Correction (2026-08-05, this mission)" block is preserved. A new rev. 3 follow-up block (items 36-40) records the Gate A, Gate B, Gate C, Gate D actions and the validations pending execution by the orchestrator only.
- `docs/workflow/SESSION_LOG.md` — this entry.
- `docs/workflow/OPEN_QUESTIONS.md` — Q6 updated to the four-gate model; Q7 updated to the rev. 3 status; Q8 updated to the rev. 3 closure of the open observations. The historical Q1..Q5 and the previous Q6, Q7, Q8 entries are preserved.

No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no other workflow file, no MCP mutation, no Supabase mutation is touched. The 7 previously modified files (`apps/web/src/test/setup.ts`, `docs/technical/KNOWN_ISSUES.md`, `docs/workflow/HANDOFF.md` and the 4 workflow files above) are **preserved unchanged**; the 4 workflow files received **additive blocks only**. The 2 new files are the gap analysis and ADR-004 in this mission.

### Validations pending execution by the orchestrator only

The docs pass is documentation-only. No `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration is executed in this docs pass. The orchestrator runs **only** the following three git commands to confirm the diff is whitespace-clean, the branch state is `stabilization/release-readiness` and the diff stat is consistent with the additive references:

```bash
git diff --check                                  # whitespace / conflict-marker clean
git status --short --branch                       # branch state, modified files, untracked files
git diff --stat                                   # diff size, additive references only
```

**No other validations are claimed in this docs pass.** The local verification chain (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:release`, `npm run verify:release`) was run by the previous docs pass (2026-08-05, rev. 1) and is recorded in the historical SESSION_LOG entry; it is **not** re-run in this rev. 3 docs pass.

### Risks / Follow-up

- ADR-004 rev. 3 stays **Proposed — OWNER ACCEPTANCE REQUIRED**, **not** **Accepted**, until the product owner accepts it on the Gate A criteria in §15.A. The status change is a separate decision, not a side effect of this rev. 3 update.
- Phase 1B (Core schema-only, Gate B), Phase 1B-applications (Interactions schema-only, Gate C) and all migrations (Gate D) remain **BLOCKED**. The four-gate model does not open them; it makes the gates explicit and non-circular.
- The next session awaits the **owner acceptance of ADR-004 (Gate A)** and the **independent audit of the gap analysis**. The orchestrator runs the three git commands above; the docs pass is documentation-only.
- The historical blocks in the four workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS) are preserved; the rev. 3 follow-up is additive. The corrected ordering (26-31 first, then 32-35, then 36-40) is the canonical ordering going forward. The historical "32-35 before 26-31" block in NEXT_ACTIONS.md is explicitly marked as **HISTORICAL (rev. 1 docs pass, superseded)**.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (rev. 4 audit-preparation, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** The rev. 4 block is preserved for traceability as historical. The canonical state is the **"Canonical active state" section at the top of this file** and the REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING entry at the end of this file. The rev. 4 block remains valid as the rev. 4 baseline; rev. 4.1, rev. 4.2 and the rev. 4.2 cleanup are additive to rev. 4 (no rev. 4 correction is removed). The historical "four levels" / "four-gate model" / "in parallel" / "in flight" / "Core schema-only: READY" / "Gate B documentary READY" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D.

### Goal

- Apply the post-independent-audit corrections to the gap analysis and ADR-004 (rev. 4). The corrections are documented in the architecture docs' rev. 4 block and are summarized in the workflow docs (STATUS, NEXT_ACTIONS, OPEN_QUESTIONS) without claiming validation was run.
- This mission is **documentation-only**: no code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched. No commit, no push. The orchestrator is the only one to run validations; the docs pass is documentation-only.
- The mission is **FASE 0 COMPLETE / ADR READY FOR OWNER ACCEPTANCE / GAP ANALYSIS READY FOR AUDIT (APPROVED pendiente auditoría) / CORE schema-only: READY (documental; implementación bloqueada) / PUBLISHING READY WITH DEFERRED ITEMS / INTERACTIONS BLOCKED D-OD-1 / MIGRATIONS BLOCKED / IMPLEMENTATION BLOCKED / SUPABASE UNCHANGED**.

### Rev. 4 corrections applied (this mission)

- **Posts actor vs owner (gap §7.4; ADR §7.3).** `posts.author_profile_id` is the actor (NOT NULL, not in the XOR); the XOR is on `posts.organization_id` (nullable).
- **Opportunities/school (gap §7.1/§7.4; ADR §6.7/§7.3).** The canonical resource `opportunities` accepts only `kind = 'company'` as the publisher organizacional (D-30). School organization is contextual, not a publisher of `opportunities`.
- **Contact requests and contact authorizations (gap §7.4; ADR §7.3).** `requester_profile_id XOR requester_organization_id`; `school_id` is mediator context, never an implicit owner. Actor, owner, context, modify/delete and membership-revocation semantics are documented.
- **Views, grants and security (gap §13.4; ADR §7.7/§8 I-20).** Removed the implication that `security_invoker = true` entails zero grants on base tables. Preferred: `security_invoker = true` + minimum grants + column allowlist on view **and** base. Alternative: `security_definer` only when justified (owner-controlled, `search_path` fixed, minimum grants). Public projection table reduced to **exactly 6 rows**; internal IDs as foreign keys excluded from public projections.
- **Owner transfer atomicity (gap §5.4; ADR §8 I-18).** The 7 conceptual steps are preserved. Added: atomicity (non-observable partially-applied transfer), the implementation must take the lock and coordinate uniqueness / state, the literal "promote before demote" assumption against a non-deferrable partial unique index is not valid, the SQL choice is not made. Suspending the owner does not auto-promote; revocation requires prior transfer or organization suspension; recovery is controlled and exceptional.
- **Gates vocabulary (gap §17.0; ADR §15.0).** "READY" for Core / Publishing is **schema-only documental**, not authorization to implement. Gate A is accepted without migration authored, staging applied, or runtime RLS. Gate B is independent of D-OD-1; its documentary gate is READY when the contracts are complete; the implementation is BLOCKED. Gate C is BLOCKED exclusively by D-OD-1. Gate D opens only after A / B / C are closed, baseline remote reconciled, design audited, backfill / rollback / RLS / staging defined; never "in parallel".
- **`company_profiles` single coherent option (gap §4.4; ADR §7.2).** Option A: physical adapter table during compatibility; canonical data migrates to `organizations(kind = 'company')`; current `profile_id` admin becomes an active `owner` membership; stable mapping preserved; retire / convert adapter only after consumers, FKs and policies are migrated and verified. The current state is not a view; the target is not an immediate view.
- **Status vocabulary (gap §5.4/§7.4; ADR §8 I-18).** Membership status contract is `active | invited | suspended | disabled`. The token `revoked` is not a status. The owner-revocation rule remains: transfer first, or organization suspension; controlled exceptional recovery.
- **`school_id` matrix exhaustive and concrete (gap §9.4).** `interviews.school_id` is explicitly absent in the current inventory; N/A; do not create. The "si existe / no verificado" entries are replaced with "absent in current inventory; N/A; do not create" where applicable.
- **Internal contradictions fixed (gap §15.6/§15.13, §13.4, §4.4; ADR §11.5/§11.12, §7.7).** §15.6 is the **summary** of the freelance rename step; §15.13 is the **detailed** expand / transition / contract plan for the same step. The projection table is now exactly 6 rows (was 9). The "no automatic creation of an organization per `company_profiles` row" rule lists six reviewed classes (not five).
- **ADR acceptance posture (gap §17.A; ADR §15.A).** Gate A criteria are: ownership inequívoco, autoridad canónica, decisiones aprobadas, compatibilidad, gates coherentes, decisiones diferidas aisladas. They do not require migration authored, staging applied, runtime RLS, or production. Status remains **Proposed — OWNER ACCEPTANCE REQUIRED**.

### Files modified (this mission)

- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — header updated to rev. 4; rev. 4 corrections block at the top; in-place edits to §4.4, §5.4, §7.4, §9.4, §13.4, §17, §19. Status: **READY FOR AUDIT** (rev. 4).
- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — header updated to rev. 4; rev. 4 corrections block at the top; in-place edits to §6.7, §7.2, §7.3, §7.7, §8 I-18, §8 I-20, §15, §15.A. Status: **Proposed — OWNER ACCEPTANCE REQUIRED** (rev. 4; the rev. 4 update does **not** auto-Accept).
- `docs/workflow/STATUS.md` — "CORE READY" updated to "CORE schema-only: READY (documental; implementación bloqueada)" in two places; new rev. 4 block at the end.
- `docs/workflow/NEXT_ACTIONS.md` — new rev. 4 follow-up block (items 41-45) at the end.
- `docs/workflow/OPEN_QUESTIONS.md` — new rev. 4 Q9 entry at the end.
- `docs/workflow/SESSION_LOG.md` — this entry.

No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no other workflow file, no MCP mutation, no Supabase mutation is touched. The 7 previously modified files (`apps/web/src/test/setup.ts`, `docs/technical/KNOWN_ISSUES.md`, `docs/workflow/HANDOFF.md` and the 4 workflow files above) are **preserved unchanged**; the 4 workflow files received **additive blocks only**. The 2 new files (the gap analysis and ADR-004) were authored in the rev. 3 mission and are now updated to rev. 4 in this mission.

### Validation

- **No validations are claimed in this docs pass.** The docs pass is documentation-only. The orchestrator may run the three git commands (`git diff --check`, `git status --short --branch`, `git diff --stat`) to confirm the diff is whitespace-clean, the branch state is `stabilization/release-readiness` and the diff stat is consistent with the additive references; no other validations are claimed. The validation of the rev. 4 corrections is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is not claimed in this docs pass.

### Risks / Follow-up

- ADR-004 rev. 4 stays **Proposed — OWNER ACCEPTANCE REQUIRED**, **not** **Accepted**, until the product owner accepts it on the Gate A criteria in §15.A. The status change is a separate decision, not a side effect of this rev. 4 update.
- Phase 1B (Core schema-only documental, Gate B), Phase 1B-applications (Interactions schema-only, Gate C) and all migrations (Gate D) remain **BLOCKED**. The four-gate model does not open them; it makes the gates explicit and non-circular. The "CORE schema-only: READY (documental; implementación bloqueada)" posture is consistent with Gate B's documentary gate being READY while its implementation is BLOCKED.
- The next session awaits the **owner acceptance of ADR-004 (Gate A)** and the **independent audit of the gap analysis**. The orchestrator runs the three git commands above; the docs pass is documentation-only.
- The historical blocks in the four workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS) are preserved; the rev. 4 follow-up is additive. The rev. 3 block in NEXT_ACTIONS.md is preserved; the rev. 4 follow-up (items 41-45) is the canonical ordering going forward for the rev. 4 corrections.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (rev. 4.1, second-audit residue cleanup, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** The rev. 4.1 block is preserved for traceability as historical; the canonical state is the **"Canonical active state" section at the top of this file** and the REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING entry at the end of this file. The rev. 4.1 corrections are preserved as the rev. 4.1 baseline; rev. 4.2 and the rev. 4.2 cleanup are additive to rev. 4.1 (no rev. 4.1 correction is removed). The "Gate B documentary READY; Gate B execution BLOCKED" wording of rev. 4.1 is **SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**: Gate B is split into B1 (Core schema design, READY AFTER OWNER ACCEPTANCE) and B2 (Core migration readiness, BLOCKED). The historical "four levels of gates" / "four-gate model" / "in parallel" / "in flight" / "Core READY" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical state is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D.

### Goal

- Apply the second-independent-audit residue cleanup (rev. 4.1) to the gap analysis and ADR-004, and align the workflow docs to the sharpened verdict wording. The rev. 4.1 corrections are additive to the rev. 4 block; the rev. 4 and rev. 3 traceability are preserved. The five residues flagged by the second independent audit are addressed.
- This mission is **documentation-only**: no code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched. No commit, no push. The orchestrator is the only one to run validations.
- The mission is **FASE 0 COMPLETE / ADR-004 Proposed / READY FOR OWNER ACCEPTANCE / GAP ANALYSIS READY FOR AUDIT (APPROVED pendiente auditoría) / CORE DOCUMENTARY PACKAGE: READY FOR AUDIT / GATE B EXECUTION: BLOCKED / PUBLISHING READY WITH DEFERRED ITEMS / INTERACTIONS BLOCKED exclusively D-OD-1 / GATE D MIGRATIONS: BLOCKED / MIGRATIONS BLOCKED / IMPLEMENTATION BLOCKED / SUPABASE UNCHANGED**.

### Files modified in this mission (six allowlisted files, additive only)

- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — header updated to rev. 4.1; rev. 4.1 corrections block at the top; in-place edits to §7.2 (D-30 strengthened from "Partially observed" to "Enforced at the schema level"), §7.5 / §15.5 (Step 4: "for company opportunities only — D-30: school is not a publisher"), §10.2 (actor vs owner: "for company opportunities only — D-30: school is not a publisher"), §13.4 (per-row coherent `security_definer` controlled exception for the 6 public projections), §5.4 (eliminate "defer the index"; document the executable conceptual sequence).
- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — header updated to rev. 4.1; rev. 4.1 corrections block at the top; in-place edits to §3 G (resource ownership column list: "for company opportunities only — D-30"), §6.10 D-40 (ownership column: "for company opportunities only — D-30"), §7.7 (per-row coherent `security_definer` controlled exception for the 6 public projections), §8 I-11 (XOR: "set for company opportunities only — D-30"), §8 I-18 (owner transfer: eliminate "defer the index"; document the executable conceptual sequence), §8 I-20 (per-row coherent `security_definer` controlled exception).
- `docs/workflow/STATUS.md` — rev. 4 block marked **HISTORICAL — SUPERSEDED BY REV 4.1**; new rev. 4.1 block at the end with the sharpened verdict wording (three distinct gate states: CORE DOCUMENTARY PACKAGE: READY FOR AUDIT / GATE B EXECUTION: BLOCKED / GATE D MIGRATIONS: BLOCKED).
- `docs/workflow/NEXT_ACTIONS.md` — rev. 3 follow-up block (items 36-40) marked **HISTORICAL — SUPERSEDED BY REV 4.1**; new rev. 4.1 block at the end (items 46-50) with the canonical state.
- `docs/workflow/OPEN_QUESTIONS.md` — Q6 and Q8 marked **HISTORICAL / SUPERSEDED BY REV 4.1**; new Q10 entry at the end with the canonical state and the list of rev. 3 framings that are **not** in the canonical state.
- `docs/workflow/SESSION_LOG.md` — this entry.

No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no other workflow file, no MCP mutation, no Supabase mutation is touched. The 7 previously modified files (`apps/web/src/test/setup.ts`, `docs/technical/KNOWN_ISSUES.md`, `docs/workflow/HANDOFF.md` and the 4 workflow files above) are **preserved unchanged**; the 4 workflow files received **additive blocks only**. The 2 architecture files (the gap analysis and ADR-004) received additive rev. 4.1 blocks and in-place refinements to the rev. 4 sections.

### Rev. 4.1 corrections applied (summary)

1. **D-30 global.** Eliminated every active phrase where `opportunities` could have publisher `kind = 'company' OR 'school'`. In `opportunities`, the only allowed organizational ownership is `organizations.kind = 'company'`. School does not publish `job`, `internship`, `company_project` or `freelance_request` of any type. School is contextual (posts, evidence, validations, enrollments, institutional workflows), never a publisher of `opportunities`. Specific edits: gap §7.2, §7.5 / §15.5, §10.2, §14; ADR §3 G, §6.10 D-40, §8 I-11. The abstract owner-invariant supports `kind IN ('company', 'school')` as a generic concept, but the canonical resource `opportunities` accepts **only `kind = 'company'`** as the publisher.
2. **Public views / grants — coherent per-row `security_definer` controlled exception for the 6 public projections.** Resolved the contradiction between `security_invoker = true` for the 6 public rows and the principle "anon only view, zero direct base grants". All 6 public rows use the controlled `security_definer` exception (owner-controlled / not mutable by caller, fixed `search_path`, `security_barrier` when joined, strict allowlist, `EXECUTE` / `SELECT` only to the minimum role set: `anon` + `authenticated` only, `PUBLIC` no grant). The `security_invoker = true` flag is **not** used on any of the 6 public rows; it is reserved for the authenticated-projection list and for internal helpers. Runtime grants follow Gate D. Gap §13.4; ADR §7.7 / §8 I-20.
3. **Owner transfer — eliminate "defer the index" and any physically invalid order; document an executable conceptual sequence.** The 7 conceptual steps are preserved. The unique partial index is **not deferrable** in PostgreSQL. The documented sequence (rev. 4.1) is: (1) lock the organization, (2) verify current owner and new profile, (3) create / activate the new owner's membership, (4) within the same transaction neutralize the previous owner (set `member_role = 'admin'`, `status = 'active'`), (5) promote the new owner in the same transaction (`member_role = 'owner'`, `status = 'active'`), (6) register the audit event, (7) verify exactly one active owner before commit. The physical order (neutralize then promote) is the opposite of the logical flow (transfer and then demote). There is no commit intermediate without an owner. No SQL is chosen in this docs pass. Gap §5.4; ADR §8 I-18.
4. **Gates — three distinct states, sharpened verdict wording.** (i) **CORE DOCUMENTARY PACKAGE: READY FOR AUDIT** (satisfies CORE SCHEMA-ONLY READY); (ii) **GATE B EXECUTION: BLOCKED** until owner acceptance / ADR Accepted and preconditions; (iii) **GATE D MIGRATIONS: BLOCKED** until A / B / C closed + baseline remote + backfill + rollback + RLS + staging. Gate C is blocked exclusively by D-OD-1 as a **decision**; C.1 / C.2 / C.5 are preparation controls (not additional decisions). Publishing is **READY WITH DEFERRED ITEMS**. The "Core READY" and "Gate B execution BLOCKED" framings are explicitly consistent. Gap §17 / §17.0; ADR §15 / §15.0.
5. **Workflow — mark rev 3 blocks as HISTORICAL / SUPERSEDED BY REV 4.1.** Q6 and Q8 are marked **HISTORICAL / SUPERSEDED BY REV 4.1**. The rev. 3 framings inside Q6 / Q8 (D-OD-2 / D-OD-3 / D-OD-6 as independent gates, the 10-row projection, `company_profiles` single-table view) are **not** part of the canonical state. The canonical state is recorded in Q10 and in the rev. 4.1 blocks in STATUS.md and NEXT_ACTIONS.md.
6. **Section references and stable title references.** All cross-references between the gap analysis, the ADR, and the workflow docs have been re-checked against the rev. 4.1 section numbering. No validations are invented.
7. **D-01..D-43, ADR Proposed, OWNER ACCEPTANCE REQUIRED preserved.** The mandate's D-01..D-43 are recorded as fixed inputs and are not reopened. The ADR remains **Proposed — OWNER ACCEPTANCE REQUIRED**; no claim of Accepted is made. Migrations are not ready (Gate D BLOCKED).

### Validations NOT run in this docs pass

- The docs pass is documentation-only. No `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration was executed. The orchestrator may run the three git commands (`git diff --check`, `git status --short --branch`, `git diff --stat`) to confirm the diff is whitespace-clean, the branch state is `stabilization/release-readiness` and the diff stat is consistent with the additive references; no other validations are claimed. **Validation of the rev. 4.1 corrections is the responsibility of the second independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is not claimed in this docs pass.**

### Risks / Follow-up

- ADR-004 rev. 4.1 stays **Proposed — OWNER ACCEPTANCE REQUIRED**, **not** **Accepted**, until the product owner accepts it on the Gate A criteria in §15.A. The status change is a separate decision, not a side effect of this rev. 4.1 update.
- Phase 1B (Core schema-only documental, Gate B), Phase 1B-applications (Interactions schema-only, Gate C) and all migrations (Gate D) remain **BLOCKED**. The four-gate model does not open them; it makes the gates explicit and non-circular. The "CORE DOCUMENTARY PACKAGE: READY FOR AUDIT" posture is consistent with the Gate B documentary gate being READY while the Gate B execution and Gate D are BLOCKED.
- The next session awaits the **owner acceptance of ADR-004 (Gate A)** and the **second independent audit of the gap analysis**. The orchestrator runs the three git commands above; the docs pass is documentation-only.
- The historical blocks in the four workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS) and in the two architecture docs are preserved. The rev. 4.1 follow-up is additive to rev. 4. The canonical state for the rev. 4.1 corrections is recorded in the rev. 4.1 blocks at the end of STATUS.md, NEXT_ACTIONS.md, OPEN_QUESTIONS.md, SESSION_LOG.md, the gap analysis, and the ADR-004.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (rev. 4.2, third-pass corrections, Part A, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** This rev. 4.2 block is preserved for traceability as historical; the canonical state is the **"Canonical active state" section at the top of this file** and the REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING entry at the end of this file. The rev. 4.2 corrections are additive to rev. 4.1 (no rev. 4.1 correction is removed). The third-pass brief drives the seven corrections (A.1..A.7). The post-rev. 4.2 audit detected eleven active residues that are addressed in the cleanup block at the end of this file. The cleanup is in **FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** state, not "audited" or "closed". The historical "four levels" / "four-gate model" / "in parallel" / "in flight" / "Core schema-only: READY" / "A.1–A.7 corrected/closed" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D, with the "A.1–A.7 NOT closed" stance.

> **HISTORICAL — SUPERSEDED BY REV 4.2 CLEANUP / AUDIT PENDING (this session).** This rev. 4.2 entry is preserved for traceability; the canonical state is the **rev. 4.2 cleanup / audit pending** entry at the end of this file. The rev. 4.1 entries are preserved as historical; the rev. 4.2 corrections are additive to rev. 4.1 (no rev. 4.1 correction is removed). The third-pass brief drives the seven corrections (A.1..A.7). The "Core schema-only: READY (documental; implementación bloqueada)" wording of rev. 4.1 is replaced by the B1 / B2 split. The post-rev. 4.2 audit detected eleven active residues that are addressed in the cleanup entry at the end of this file. The cleanup is in **CLEANUP / AUDIT PENDING** state, not "audited" or "closed".

### Goal

- Apply the third-pass corrections (rev. 4.2) to `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` and `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md`, and update the four workflow docs (`STATUS.md`, `NEXT_ACTIONS.md`, `OPEN_QUESTIONS.md`, `SESSION_LOG.md`). Mark the rev. 4.1 blocks as HISTORICAL / SUPERSEDED BY REV 4.2. Preserve all prior rev. 3 / rev. 4 / rev. 4.1 traceability.
- This is Part A (documental only). Part B (Implementation) through Part H are explicitly **not** in scope for this docs pass. No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration, no executable migration, no staging, no runtime grant, no fixture, no RLS predicate, no view, no grant is touched. No commit, no push. **No validations are claimed in this pass**; the orchestrator is the only one to run validations. SUPABASE UNCHANGED.
- This session is Part A of the release-readiness mission. Branch: `stabilization/release-readiness` (HEAD `be3ed9e`, same commit as `main`).

### Files modified in this docs pass (Part A)

The six files allowed by the brief:

- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — rewritten to rev. 4.2: header date / status; rev. 4.2 block at the top; D-15 (§6.4) canonical; §7.1 persons (school_id as adapter); §7.2 organizations (no canonical `profile_id`; compatibility with adapters and `organization_legacy_links` alternative); §6.10 audit (D-39, D-40, D-41 reformulation, authorization vs audit source lists disjoint, Company A example); §7.6 audit reiteration + authorization source list + Company A; §7.7 views / grants (real semantics: no "security_definer view", three real alternatives, documentary recommendation by type); §8 I-5 (no canonical `profile_id`), I-12 (audit only, not authorization), I-15 (authorization source list), I-17 (enrollments canonical); §11 Step 1 (organizations without `profile_id`); §11 Step 7 (canonical enrollments); §15.0 (B1 / B2 split, three distinct gate states); §15.A.5 (I-15 / D-41 reformulation); §15.B (Gate B1 / B2 split). Status remains **Proposed — OWNER ACCEPTANCE REQUIRED**.
- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — rewritten to rev. 4.2: header date / status; rev. 4.2 block at the top; §5.4 (8-step transfer sequence, exactly-one semantics, atomicity); §5.5 (authority vs ownership vs audit recap with disjoint source lists); §9.1 / §9.2 / §9.4 (school_id matrix updated for canonical enrollments; current absence vs target conceptual shape differentiated; matrix future row uses `student_enrollments.student_profile_id + school_organization_id`); §10 (audit: D-39, D-40, D-41 reformulation, disjoint lists, Company A example); §13.4 (views / grants: three real alternatives, no "security_definer view"); §15.2 Step 1 (organizations without `profile_id`); §15.8 Step 7 (canonical enrollments); §17 (Gate B1 / B2 split, §17.0 three distinct gate states); §19 (rev. 4.2 acceptance criteria).
- `docs/workflow/STATUS.md` — rev. 4.1 block marked **HISTORICAL — SUPERSEDED BY REV 4.2**; rev. 4.2 block added at the end with the canonical verdict posture (B1 READY AFTER OWNER ACCEPTANCE / B2 BLOCKED / Gate C blocked exclusively D-OD-1 / Gate D blocked).
- `docs/workflow/NEXT_ACTIONS.md` — rev. 4.1 block marked **HISTORICAL — SUPERSEDED BY REV 4.2**; rev. 4.2 block added at the end with read-only follow-ups 51–56 (rev. 4.2) replacing the rev. 4.1 46–50.
- `docs/workflow/OPEN_QUESTIONS.md` — Q10 marked **HISTORICAL — SUPERSEDED BY REV 4.2**; **Q11 (rev. 4.2, Part A)** added with the canonical verdict posture, the seven corrections summary, and the "NOT in the canonical state" list.
- `docs/workflow/SESSION_LOG.md` — this entry.

No other file is modified. ROLE_MODEL.md, DATA_MODEL.md, AUTHORIZATION_MATRIX.md, SECURITY_MODEL.md, DECISION_LOG.md, HANDOFF.md and KNOWN_ISSUES.md are **not** modified in this pass.

### Rev. 4.2 corrections applied (summary)

1. **A.1 — `student_enrollments` is CANONICAL (live + history).** D-15 is rewritten. Conceptual model `id, student_profile_id, school_organization_id, status, is_primary, started_at, ended_at, created_by_profile_id, created_at, updated_at` with `status` initial values `pending, active, completed, transferred, withdrawn`. At-most-one primary active invariant recorded. New policies and new server actions do **not** consult `student_profiles.school_id` for authorization. The current school is derived from the primary active enrollment; the minor mediator's school is derived from the same primary active enrollment. `student_profiles.school_id` is a compatibility / temporal / derivable / legacy adapter column — never a new authority. `profiles.school_id` is legacy / non-authoritative and is a candidate for retirement. The matrix future row uses `student_enrollments.student_profile_id + school_organization_id` (not `student_enrollments.school_id`); current absence and target conceptual shape are differentiated. `interviews.school_id` remains explicitly **absent in the current inventory; N/A; do not create** (preserved from rev. 4 / rev. 4.1).
2. **A.2 — `created_by_profile_id` is AUDIT ONLY.** Authorization source list and audit source list are **disjoint**. **Authorization sources** are: `auth.uid()`; `profiles.account_status`; active `memberships`; resource ownership; `student_enrollments` (the current primary active enrollment, for student-context authorization, D-15); resource `status` / `type`; explicit contact authorization (D-38); domain relationships. **Audit source**: `created_by_profile_id` (D-39). The RLS layer does **not** read `created_by_profile_id`. D-08, D-39, D-40, D-41, §6.10, §7.6, §10, §13.4, I-12, I-15, I-19, the Data Ownership Matrix and the Authorization Invariants are reformulated. The canonical D-41 (rev. 4.2) states: "La autorización organizacional depende de `memberships` activas, ownership del recurso y relaciones explícitas de dominio. `created_by_profile_id` registra el actor histórico y no autoriza." The **Company A example** is included: actor loses membership (transition to `disabled` or `suspended`); opportunity stays in Company A (`publisher_organization_id` unchanged); `created_by_profile_id` continues to record the original actor; the original actor cannot modify (membership-gated, not actor-gated); another currently-active member of Company A can administer. Historical text describing a "triad" of authorization+ownership+audit is marked **HISTORICAL / SUPERSEDED BY REV 4.2**.
3. **A.3 — `organizations` canonical model has NO `profile_id`.** Canonical shape `id, kind, legal_name, display_name, slug, description, logo_url, status, created_at, updated_at, …` with `kind IN ('school', 'company')`. The human relationship lives **only** in `organization_memberships`. **Compatibility**: `company_profiles` and `schools` are physical adapters during the transition; `organization_legacy_links` is a documented alternative (no table is created in this docs pass); the mappings are verifiable (legacy `schools.id` / `company_profiles.profile_id` maps to a unique `organizations.id`). **No future policy reads `organizations.profile_id`.** Current-state section may mention `schools.profile_id` and `company_profiles.profile_id` as physical legacy columns on the adapter tables, but does not present them as `organizations.profile_id` canonical. Active phrases reading "`organizations.profile_id` is an adapter / backfill column" are removed from the canonical state. D-03, D-04, D-05, D-07, §7.2, I-5, the compatibility plan, Step 1 and the `company_profiles` section are corrected.
4. **A.4 — Exactly one active owner.** The canonical rule for `organizations.status = 'active'` is: **exactly one membership with `member_role = 'owner'` and `status = 'active'`** (at-most-one + at-least-one ⇒ exactly-one, with documented exceptions for the transfer window, the suspended organization, and the controlled recovery). The 8-step conceptual transfer sequence (no SQL) is: (1) block the organization and its memberships; (2) verify the current owner; (3) verify the successor's identity and active membership; (4) create or activate the successor's membership **without** `member_role = 'owner'`; (5) neutralize the previous owner in the same transaction; (6) promote the successor to `member_role = 'owner', status = 'active'` in the same transaction; (7) register the audit event; (8) verify exactly one active owner **before commit**. The transfer is **atomic**: no two active owners, no active organization without an owner, no auto-promotion on suspension, revocation requires prior transfer or organizational suspension. The pending / suspended / recovery states have no ordinary operations. §5.4 and §8 I-18 are corrected; Gap and ADR are consistent on the 8-step sequence.
5. **A.5 — Real semantics of views / functions.** The phrase "security_definer view" is **not** a category. The three real alternatives (rev. 4.2) are: **(i) `security_invoker = true` view** with minimum grants on the view and on the base + column allowlist + RLS (authenticated projections, internal compatibility views); **(ii) view with owner behavior** (dedicated owner role, no `BYPASSRLS`, allowlist, minimum grants, not mutable by app users; **not** called a "security_definer view"); **(iii) `SECURITY DEFINER` function** with fixed `search_path`, allowlisted structured output, minimum `EXECUTE`, audit (the controlled public projection pattern). Documentary recommendation by projection type: public projections = prefer `SECURITY DEFINER` function (or owner-behavior view when documented as such, not as a "security_definer view"); authenticated projections = `security_invoker = true` view; internal compatibility views = `security_invoker = true` view by default. The constraints `no SELECT *`, `PUBLIC` no grant, no internal IDs, no sensitive columns in the allowlist are preserved. **Runtime grants are a Gate D concern** and are not authorized by the ADR.
6. **A.6 — Gate B1 / B2 split.** Gate B is replaced by two non-circular sub-gates: **Gate B1 — Core schema design** (ADR Accepted; contracts updated; entities and relationships documented; conceptual constraints listed; ownership matrix and authorization matrix produced; audit-only reiteration in the documents; **no staging, no secrets, no runtime, no migrations, no backfill, no SQL, no Supabase**; B1 opens as soon as the ADR is **Accepted**). **Gate B2 — Core migration readiness** (B1 closed; remote baseline reconciled; staging project provisioned; RLS design complete; fixtures designed; backfill idempotent; rollback defined; migration audited; local tests green; critical fixes closed; B2 is **blocked** until B1 is closed and the preconditions are met). Gate C remains blocked exclusively by D-OD-1. Gate D remains blocked. The status / workflow docs are updated to the new vocabulary; rev. 4.1 framings that read "Gate B documentary READY" or "Core schema-only: READY (documental; implementación bloqueada)" are marked as historical.
7. **A.7 — Workflow and audit.** The headers and entries in `docs/workflow/{STATUS, NEXT_ACTIONS, OPEN_QUESTIONS, SESSION_LOG}.md` are updated to rev. 4.2. This session is recorded: files modified, scope of the corrections, the fact that **no validations were executed** in this docs pass, the fact that no commit and no push were made. The mandate's D-01..D-43 are not reopened. The active state at the close of Part A is recorded: FASE 0 COMPLETE; ADR-004 rev. 4.2 Proposed / READY FOR OWNER ACCEPTANCE; GAP READY FOR AUDIT; OWNER ACCEPTANCE READY; CORE SCHEMA DESIGN **B1 READY AFTER OWNER ACCEPTANCE**; CORE MIGRATION READINESS **B2 BLOCKED**; INTERACTIONS BLOCKED D-OD-1; MIGRATIONS BLOCKED; IMPLEMENTATION BLOCKED; SUPABASE UNCHANGED. The ADR is not moved to **Accepted** in this pass. `DECISION_LOG` is not updated in this pass. The orchestrator runs only `git diff --check`, `git status --short --branch`, `git diff --stat` at the end of Part A.

### Active state (rev. 4.2) — canonical verdict posture

- **FASE 0 COMPLETE**.
- **GAP ANALYSIS READY FOR AUDIT** (rev. 4.2; APPROVED pendiente auditoría).
- **ADR-004 Proposed / READY FOR OWNER ACCEPTANCE** (Gate A; **Proposed — OWNER ACCEPTANCE REQUIRED**; rev. 4.2 does **not** auto-Accept).
- **OWNER ACCEPTANCE READY** (documents in place; the owner acceptance is the Gate A decision).
- **CORE SCHEMA DESIGN (Gate B1) — READY AFTER OWNER ACCEPTANCE** (rev. 4.2). B1 opens as soon as the ADR is **Accepted**.
- **CORE MIGRATION READINESS (Gate B2) — BLOCKED** (rev. 4.2). B2 requires the owner acceptance, the staging project, the CI Node 22 result, the surgical fixes, the Core migration plan, the local green tests and the audit.
- **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
- **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
- **GATE D MIGRATIONS: BLOCKED** (until A / B1 / B2 / C closed + D.5 baseline remote + D.6 design audit + D.7 backfill / rollback / staging verification + D.8 RLS runtime + D.9 production authorized + D.10 audit dictums closed; Gate D is never "in parallel" with A / B / C).
- **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
- **D-01..D-43 preserved**; **ADR Proposed — OWNER ACCEPTANCE REQUIRED**; no claim of Accepted or migrations ready.

### Validations NOT run in this docs pass (rev. 4.2)

- The docs pass is documentation-only. No `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration, no staging, no runtime grant, no fixture was executed. The orchestrator may run the three git commands (`git diff --check`, `git status --short --branch`, `git diff --stat`) to confirm the diff is whitespace-clean, the branch state is `stabilization/release-readiness` and the diff stat is consistent with the additive references; **no other validations are claimed**. Validation of the rev. 4.2 corrections is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is **not** claimed in this docs pass.

### Risks / Follow-up

 - ADR-004 rev. 4.2 is **Accepted**. The acceptance is a separate recorded decision; B1 is now READY / OPENED DOCUMENTALLY and remains unimplemented.
- The "Gate B documentary READY; Gate B execution BLOCKED" framing of rev. 4.1 is **SUPERSEDED BY REV 4.2** by the B1 / B2 split. B1 is the design gate (ready after owner acceptance); B2 is the migration-readiness gate (blocked). Phase 1B (Core schema-only documental) and all migrations remain **BLOCKED** by Gate B1, B2, C, D. The four-gate model with the B1 / B2 split does not open them; it makes the gates explicit and non-circular.
 - `DECISION_LOG.md` is part of the acceptance record and remains coherent with the ADR acceptance.
- The historical blocks in the four workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS) and in the two architecture docs are preserved. The rev. 4.2 follow-up is additive to rev. 4.1. The canonical state for the rev. 4.2 corrections is recorded in the rev. 4.2 blocks at the end of STATUS.md, NEXT_ACTIONS.md, OPEN_QUESTIONS.md, SESSION_LOG.md, the gap analysis, and the ADR-004.
 - The next action is to update the architectural contracts and design the documentary B1 package. B2, C and D remain blocked; the documentary commit is still being prepared from the seven-file acceptance/versioning set.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (rev. 4.2 cleanup / audit pending, this session)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** The rev. 4.2 cleanup block is preserved for traceability as the **first** cleanup pass. The **canonical** state is the **"Canonical active state" section at the top of this file** and the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** entry at the end of this file, which records the **in-place corrections** to the canonical sections of the architecture docs. The rev. 4.1 / rev. 4 / rev. 3 / rev. 4.2 / rev. 4.2 cleanup traceability is preserved. **The canonical state is "FINAL DOCUMENTARY CLEANUP / AUDIT PENDING", not "audited" or "closed".** **A.1–A.7 are NOT declared corrected/closed in this pass.** No validations are claimed; no commit / push is made. SUPABASE UNCHANGED. The historical "four levels" / "four-gate model" / "in parallel" / "in flight" / "Core schema-only: READY" / "A.1–A.7 corrected/closed" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D, with the "A.1–A.7 NOT closed" stance.

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** The rev. 4.2 cleanup entry is preserved for traceability as the **first** cleanup pass. The **canonical** state is the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** entry at the end of this file, which records the **in-place corrections** to the canonical sections of the architecture docs (the previous rev. 4.2 cleanup only added an override block and did not edit the canonical sections in-place). The rev. 4.1 / rev. 4 / rev. 3 / rev. 4.2 / rev. 4.2 cleanup traceability is preserved. **The canonical state is "FINAL DOCUMENTARY CLEANUP / AUDIT PENDING", not "audited" or "closed".** **A.1–A.7 are NOT declared corrected/closed in this pass.** No validations are claimed; no commit / push is made. SUPABASE UNCHANGED.

### Goal

- Apply targeted inline corrections to the eleven residues flagged by the post-rev. 4.2 audit. Scope is the six files allowed by the brief. No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration, no executable migration, no staging, no runtime grant, no fixture, no RLS predicate, no view, no grant is touched. No ROLE_MODEL.md, no DATA_MODEL.md, no AUTHORIZATION_MATRIX.md, no SECURITY_MODEL.md, no DECISION_LOG.md, no HANDOFF.md, no KNOWN_ISSUES.md is touched. **No validations are claimed in this pass.** Branch: `stabilization/release-readiness` (HEAD `be3ed9e`, same commit as `main`).
- The cleanup is in **CLEANUP / AUDIT PENDING** state, not "audited" or "closed". The audit of the rev. 4.2 cleanup is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance). The cleanup is not claimed to close any audit dictum.

### The eleven residues

- (1) **D-15** — `student_enrollments` is canonical (live + history); `student_profiles.school_id` is a single source-of-read adapter, kept in sync by a single adapter layer; `profiles.school_id` is legacy / non-authoritative.
- (2) **`created_by_profile_id` is audit only** — the authorization / audit lists are disjoint; D-41 (canonical) states: "La autorización organizacional depende de `memberships` activas, ownership del recurso y relaciones explícitas de dominio. `created_by_profile_id` registra el actor histórico y no autoriza."; Company A example preserved.
- (3) **`organizations` has no canonical `profile_id`** — `schools.profile_id` / `company_profiles.profile_id` are physical legacy adapter columns; `organization_legacy_links` is a documented alternative (no table created); no future policy reads `organizations.profile_id`.
- (4) **Ownership — 8-step conceptual sequence (not 7)** — at-most-one, at-least-one, exactly-one; `organizations.status = 'active'` ⇒ exactly one active owner; pending / suspended / recovery states have no ordinary operations; no two owners, no active org ownerless, no auto-promotion; revocation only by prior transfer or organization suspension.
- (5) **Views / functions** — no "security_definer view" wording in active text; three real alternatives: (i) `security_invoker = true` view + minimum grants on view and base + column allowlist + RLS; (ii) owner-behavior view (dedicated role, no `BYPASSRLS`, allowlist, minimum grants, not mutable by app users; **not** called "security_definer view"); (iii) `SECURITY DEFINER` function with fixed `search_path`, allowlisted structured output, minimum `EXECUTE`, audit. Recommendation: public projections = `SECURITY DEFINER` function (no view grants to `anon`; `EXECUTE` minimum); authenticated projections = `security_invoker = true` view; internal compatibility views = `security_invoker = true` view by default. The 6 public rows of the public projection table record the function / `EXECUTE` for public, not "security_definer view" wording, and no view grants are recorded for the public surface. Runtime grants are Gate D.
- (6) **Gates — sequence A → B1 → C → B2 / D**, no "in parallel" wording; D-OD-1 is the only decisional blocker for C; B2 is a preparation gate (readiness), not a decisional blocker. If B2 is read as a prerequisite of C, both docs say so consistently.
- (7) **Workflow — "CLEANUP / AUDIT PENDING" state**, not "A.1–A.7 corrected/closed" as audit final.
- (8) **`student_school_records` — optional / deferred Core extension**, not authority for enrollment / authorization; if in B1 / B2 lists, `student_school_records.student_enrollment_id → student_enrollments.id`, no independent `school_id`; field contract pending B1, not prerequisite of Gate A.
- (9) **Adapters / views rollback** — physical legacy tables not dropped during expand; mappings / backups verifiable; adapters retired only after consumers / FKs / policies migrated; rollback restores adapter physical / mappings / previous reads, no SQL claimed.
- (10) **D-OD-4 — operational choice**, not Gate C blocker, not independent blocker; D-OD-5 may continue deferred for company roles, only B2 / implementation if applies.
- (11) **D-01..D-43 intact; ADR Proposed; no SQL / code / Supabase.**

### Files modified in this docs pass (rev. 4.2 cleanup)

The six files allowed by the brief:

- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — header rev. 4.2 marked **HISTORICAL — SUPERSEDED BY REV 4.2 CLEANUP / AUDIT PENDING**; rev. 4.2 cleanup / audit pending block at the end (§16).
- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — header rev. 4.2 marked **HISTORICAL — SUPERSEDED BY REV 4.2 CLEANUP / AUDIT PENDING**; rev. 4.2 cleanup / audit pending block at the end (§20).
- `docs/workflow/STATUS.md` — rev. 4.2 block marked **HISTORICAL — SUPERSEDED BY REV 4.2 CLEANUP / AUDIT PENDING**; rev. 4.2 cleanup / audit pending block at the end.
- `docs/workflow/NEXT_ACTIONS.md` — rev. 4.2 block marked **HISTORICAL — SUPERSEDED BY REV 4.2 CLEANUP / AUDIT PENDING**; rev. 4.2 cleanup / audit pending block at the end.
- `docs/workflow/OPEN_QUESTIONS.md` — Q11 marked **HISTORICAL — SUPERSEDED BY REV 4.2 CLEANUP / AUDIT PENDING**; **Q12 (rev. 4.2 cleanup / audit pending)** added.
- `docs/workflow/SESSION_LOG.md` — this entry.

No other file is touched. ROLE_MODEL.md, DATA_MODEL.md, AUTHORIZATION_MATRIX.md, SECURITY_MODEL.md, DECISION_LOG.md, HANDOFF.md, KNOWN_ISSUES.md are **not** modified.

### Active state (rev. 4.2 cleanup / audit pending) — canonical verdict posture

- **FASE 0 COMPLETE**.
- **GAP ANALYSIS READY FOR AUDIT** (rev. 4.2 cleanup; APPROVED pendiente auditoría).
- **ADR-004 rev. 4.2 Proposed / READY FOR OWNER ACCEPTANCE** (Gate A; **Proposed — OWNER ACCEPTANCE REQUIRED**; rev. 4.2 cleanup does **not** auto-Accept).
- **OWNER ACCEPTANCE READY** (the documents are in place; the owner acceptance is the Gate A decision; the cleanup is "READY" in the sense of ready-for-owner-decision, not "approved").
- **CORE SCHEMA DESIGN (Gate B1) — READY AFTER OWNER ACCEPTANCE** (rev. 4.2 cleanup). B1 opens as soon as the ADR is **Accepted**.
- **CORE MIGRATION READINESS (Gate B2) — BLOCKED** (rev. 4.2 cleanup). B2 is a prerequisite of any migration.
- **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
- **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
- **GATE D MIGRATIONS: BLOCKED** (until A / B1 / B2 / C closed + D.5 baseline remote + D.6 design audit + D.7 backfill / rollback / staging verification + D.8 RLS runtime + D.9 production authorized + D.10 audit dictums closed; Gate D is never "in parallel" with A / B / C).
- **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
- **D-01..D-43 preserved**; **ADR Proposed — OWNER ACCEPTANCE REQUIRED**; no claim of Accepted or migrations ready.

### Validations NOT run in this docs pass (rev. 4.2 cleanup)

- The docs pass is documentation-only. No `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration, no staging, no runtime grant, no fixture was executed. The orchestrator may run only the three git commands (`git diff --check`, `git status --short --branch`, `git diff --stat`) to confirm the diff is whitespace-clean, the branch state is `stabilization/release-readiness` and the diff stat is consistent with the additive references; **no other validations are claimed**. The audit of the rev. 4.2 cleanup is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is **not** claimed in this docs pass. The cleanup is in **CLEANUP / AUDIT PENDING** state, not "audited" or "closed".

### Risks / Follow-up

- ADR-004 rev. 4.2 cleanup stays **Proposed — OWNER ACCEPTANCE REQUIRED**, **not** **Accepted**, until the product owner accepts it on the Gate A criteria in §15.A. The status change is a separate decision, not a side effect of this rev. 4.2 cleanup.
- The rev. 4.2 cleanup is in **CLEANUP / AUDIT PENDING** state. The "A.1–A.7 corrected/closed" framing of rev. 4.2 is **SUPERSEDED BY REV 4.2 CLEANUP**; the cleanup is not yet audited. The audit is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance).
- The "Gate B documentary READY; Gate B execution BLOCKED" framing of rev. 4.1 is **SUPERSEDED BY REV 4.2** by the B1 / B2 split. B1 is the design gate (ready after owner acceptance); B2 is the migration-readiness gate (blocked). The "in parallel" wording for B2 / C in rev. 4.2 is **SUPERSEDED BY REV 4.2 CLEANUP** by the strict sequence A → B1 → C → B2 / D. Phase 1B (Core schema-only documental) and all migrations remain **BLOCKED** by Gate B1, B2, C, D. The four-gate model with the B1 / B2 split does not open them; it makes the gates explicit and non-circular.
- `DECISION_LOG.md` is **not** updated in this pass. The rev. 4.2 cleanup is documentation-only; no decision is moved to Accepted.
- The historical blocks in the four workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS) and in the two architecture docs are preserved. The rev. 4.2 cleanup follow-up is additive to the rev. 4.2 block. The canonical state for the rev. 4.2 cleanup is recorded in the rev. 4.2 cleanup blocks at the end of STATUS.md, NEXT_ACTIONS.md, OPEN_QUESTIONS.md, SESSION_LOG.md, the gap analysis (§20), and the ADR-004 (§16).
- The next session awaits the **owner acceptance of ADR-004 (Gate A)** and the **independent audit of the gap analysis (rev. 4.2 cleanup)**. The orchestrator runs the three git commands above; the docs pass is documentation-only. No commit, no push.

## 2026-08-05 — Identity / Organizations / Resource Ownership docs correction (pre-acceptance historical)

> **CANONICAL STATE — REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING.** This entry is the canonical state at the close of the **final documentary cleanup** of Part A. The rev. 4.2 cleanup entry above is marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the rev. 4.2 / rev. 4.1 / rev. 4 / rev. 3 traceability is preserved. The previous rev. 4.2 cleanup only added an override block and did not edit the canonical sections in-place; this entry records the **in-place corrections** to the canonical sections of the architecture docs so the active text no longer contradicts the cleanup. The audit of the final documentary cleanup is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is **NOT** claimed in this docs pass. **A.1–A.7 are NOT declared corrected/closed in this pass**; the canonical state is "FINAL DOCUMENTARY CLEANUP / AUDIT PENDING", not "audited" or "closed". No validations are claimed; no commit / push is made. SUPABASE UNCHANGED.

### Goal

- Apply the **final documentary cleanup** (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING) to the canonical sections of `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` and `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md`, and update the four workflow docs (`STATUS.md`, `NEXT_ACTIONS.md`, `OPEN_QUESTIONS.md`, `SESSION_LOG.md`). The previous rev. 4.2 cleanup (which only added an override block §16 / §20) is marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**. All prior rev. 3 / rev. 4 / rev. 4.1 / rev. 4.2 / rev. 4.2 cleanup traceability is preserved.
- This is Part A (documental only). Part B (Implementation) is explicitly **NOT** in scope for this docs pass. No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration, no executable migration, no staging, no runtime grant, no fixture, no RLS predicate, no view, no grant is touched. No commit, no push. **No validations are claimed in this pass**; the orchestrator is the only one to run validations. SUPABASE UNCHANGED.
- This session is Part A of the release-readiness mission. Branch: `stabilization/release-readiness` (HEAD `be3ed9e`, same commit as `main`).

### Files modified in this docs pass (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)

The six files allowed by the brief:

- `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` — **in-place corrections** to the canonical sections (§1 Context, §2 Drivers, §3 alternative A, §6.2 D-16, §6.3 D-07, §6.10 D-39 / D-40 / D-41, §7.1 Persons, §7.2 Organizations, §7.7 Views / grants / security, §8 I-5 / I-12 / I-15 / I-17 / I-18 / I-20, §9.1 Consequences, §10 Compatibility plan, §11 Step 0 / Step 1 / Step 7, §12 Rollback plan, §15.0 / §15.A / §15.B / §15.C / §15.D). Header rev. 4.2 marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; rev. 4.2 cleanup / audit pending block (§16) marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; **§17 (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)** added at the end. Status remains **Proposed — OWNER ACCEPTANCE REQUIRED**.
- `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` — **in-place corrections** to the canonical sections (§1 Scope, §4.2 D-07 / D-42 / membership as the authority, §4.4 company_profiles target destination, §9.1 / §9.2 / §9.4 school_id matrix, §10.2 D-39 / D-40 / D-41, §13.4 Views / grants / security, §14 Target model, §15.2 Step 1, §15.8 Step 7, §17.0 / §17.A / §17.B / §17.C / §17.D, §19 Acceptance criteria). Header rev. 4.2 marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; rev. 4.2 cleanup / audit pending block (§20) marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; **§21 (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)** added at the end. Status remains **READY FOR AUDIT (APPROVED pendiente auditoría)**.
- `docs/workflow/STATUS.md` — rev. 4.2 cleanup block marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** block added at the end with the canonical verdict posture and the in-place corrections summary.
- `docs/workflow/NEXT_ACTIONS.md` — rev. 4.2 cleanup block marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** block added at the end with read-only follow-ups 63–68.
- `docs/workflow/OPEN_QUESTIONS.md` — Q12 (rev. 4.2 cleanup) marked **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; **Q13 (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)** added with the canonical verdict posture and the eleven residues summary.
- `docs/workflow/SESSION_LOG.md` — this entry.

No other file is modified. ROLE_MODEL.md, DATA_MODEL.md, AUTHORIZATION_MATRIX.md, SECURITY_MODEL.md, DECISION_LOG.md, HANDOFF.md and KNOWN_ISSUES.md are **not** modified in this pass.

### Canonical gate sequence (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)

- **A → B1 → C → B2 → D** (canonical, explicit in both docs and workflow). C is blocked **exclusively** by D-OD-1 as a decision. B2 is a prerequisite of D, **not** another decisional blocker of C. The "in parallel" / "in flight" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP**. Gate D is never "in parallel" with A, B1, B2 or C. **D-OD-4 is an operational choice, not a Gate C / Gate A criterion, and not an independent blocker**. **D-OD-5 is deferred for the company roles and is only a Gate B concern, not a Gate A criterion**.

### Active state (pre-acceptance historical)

- **FASE 0 COMPLETE**.
- **GAP ANALYSIS READY FOR AUDIT** (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING; APPROVED pendiente auditoría).
- **ADR-004 rev. 4.2 Proposed / READY FOR OWNER ACCEPTANCE** (historical pre-acceptance state).
- **OWNER ACCEPTANCE READY** (historical pre-acceptance state).
- **CORE SCHEMA DESIGN (Gate B1) — READY AFTER OWNER ACCEPTANCE** (historical pre-acceptance state).
- **CORE MIGRATION READINESS (Gate B2) — BLOCKED** (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING). B2 is a prerequisite of any migration.
- **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
- **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
- **GATE D MIGRATIONS: BLOCKED** (until A / B1 / B2 / C closed; Gate D is never "in parallel" with A, B1, B2 or C).
- **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
- **D-01..D-43 fixed and preserved**; **D-OD-1..D-OD-7 deferred**; this historical block made no claim of migrations ready.
- **A.1–A.7 are NOT declared corrected/closed in this pass**; the canonical state is "FINAL DOCUMENTARY CLEANUP / AUDIT PENDING".

### Validations NOT run in this docs pass (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)

- The docs pass is documentation-only. No `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration, no staging, no runtime grant, no fixture was executed. The orchestrator may run only the three git commands (`git diff --check`, `git status --short --branch`, `git diff --stat`) to confirm the diff is whitespace-clean, the branch state is `stabilization/release-readiness` and the diff stat is consistent with the additive references; **no other validations are claimed**. The audit of the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is **NOT** claimed in this docs pass. The cleanup is in **FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** state, not "audited" or "closed". **A.1–A.7 are NOT declared corrected/closed in this pass**.

### Risks / Follow-up

- ADR-004 REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING stays **Proposed — OWNER ACCEPTANCE REQUIRED**, **not** **Accepted**, until the product owner accepts it on the Gate A criteria in §15.A. The status change is a separate decision, not a side effect of this final documentary cleanup.
- The **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** is in **FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** state. The "A.1–A.7 corrected/closed" framing of rev. 4.2 is **SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP**; the cleanup is not yet audited. The audit is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance).
- The "in parallel" / "in flight" wording of rev. 4.2 is **SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP** by the strict sequence A → B1 → C → B2 → D. **B1 Core schema design is READY AFTER OWNER ACCEPTANCE; B2 Core migration readiness is BLOCKED until B1 and its preconditions are complete; B2 is the prerequisite for Gate D.** Gate C remains blocked exclusively by D-OD-1, D-OD-4 is operational, and D-OD-5 remains deferred for company roles. Core migration execution and all migrations remain blocked until the applicable later gates. The four-gate wording is historical and the B1 / B2 split is canonical.
- `DECISION_LOG.md` is **not** updated in this pass. The **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** is documentation-only; no decision is moved to Accepted.
- The historical blocks in the four workflow docs (STATUS, NEXT_ACTIONS, SESSION_LOG, OPEN_QUESTIONS) and in the two architecture docs are preserved. The **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** follow-up is additive to the rev. 4.2 cleanup block. The canonical state for the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** is recorded in the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** blocks at the end of STATUS.md, NEXT_ACTIONS.md, OPEN_QUESTIONS.md, SESSION_LOG.md, the gap analysis (§21), and the ADR-004 (§17).
- The next session awaits the **owner acceptance of ADR-004 (Gate A)** and the **independent audit of the gap analysis (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING)**. The orchestrator runs the three git commands above; the docs pass is documentation-only. No commit, no push. Part B (Implementation) is **NOT** in scope for this docs pass.

## 2026-08-05 — ADR-004 rev. 4.2 owner acceptance

- **Owner decision:** ADR-004 rev. 4.2 was explicitly accepted on branch `stabilization/release-readiness` with the exact quote: “Apruebo ADR-004 rev. 4.2.”
- **Recorded state:** ADR **Accepted**; Gap Analysis **APPROVED**; owner acceptance **COMPLETED**; B1 Core schema design **READY / OPENED DOCUMENTALLY**; B2 **BLOCKED**; Publishing **READY WITH DEFERRED ITEMS**; Interactions **BLOCKED exclusively D-OD-1**; Gate D, migrations and implementation **BLOCKED**; Supabase **UNCHANGED**.
- **Audit posture carried forward:** Gap **APPROVED**, ADR **APPROVED**, Owner **READY**, B1 **READY**, B2/C/D **BLOCKED**. This records the prior audit verdicts and acceptance state; it does not assert new runtime, SQL, Supabase, migration or production validation.
- **Decisions and gates:** D-01..D-43 remain fixed. D-OD-1..D-OD-7 remain deferred and open under their gates. The sequence remains **A → B1 → C → B2 → D**. B1 is documentary only and is not claimed implemented; B2, C and D are not opened.
- **Acceptance/versioning files:** the seven-file documentary set is `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md`, `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md`, `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, `docs/workflow/OPEN_QUESTIONS.md`, `docs/workflow/SESSION_LOG.md` and `docs/workflow/DECISION_LOG.md`. The unrelated `apps/web/src/test/setup.ts`, `docs/workflow/HANDOFF.md` and `docs/technical/KNOWN_ISSUES.md` changes are excluded.
- **Decision log:** `docs/workflow/DECISION_LOG.md` was added to this acceptance record and contains the formal ADR-004 Accepted entry; it is part of the seven-file documentary commit.
- **Scope boundary:** No SQL, Supabase change, runtime grant/RLS change, migration, staging action, production action, code or test was authorized or performed by this acceptance. No validations are claimed in this acceptance entry. No commit or push was made.
