# TalentHub Next Actions

## Current State (2026-08-13) — plan de promoción vigente

> **Bloque canónico actual.** Los bloques con fecha anterior se conservan como historial
> (incluidos los de ADR-004, que siguen siendo válidos como estado de gates de
> identidad/organizaciones). Este bloque refleja el estado real de la rama y el plan
> explícito de promoción; sólo se ejecutaron comandos git de lectura y `git diff --check`
> en esta sesión de documentación (no lint/typecheck/test/build/`verify:*`/SQL/migraciones).

- **Rama:** `stabilization/release-readiness`, HEAD `ef3b428` **ya remoto** (0 ahead / 0 behind con `origin`), **10 commits sobre `main`**. `main` es ancestro de `HEAD` → promoción por **fast-forward directo**.
- **Trabajo local sin commitear:** 10 archivos de app de dashboard tolerante / logout hardening + `package.json` (script `verify:storage-migration`).
- **Nuevos sin trackear:** `supabase/migrations/20260813000001_reconcile_storage_buckets.sql`, `scripts/verify-storage-migration.mjs`, `docs/technical/STORAGE_DRIFT_REPAIR.md`.
- **Storage / staging:** reparación de Storage **aplicada previamente al proyecto TalentHub Staging** y versionada por `20260813000001` (forward-only, idempotente, no destructiva de objetos). No aplicar la migración desde este worktree como verificación local (ver `STORAGE_DRIFT_REPAIR.md`).
- **Gate Storage independiente:** validar en staging como gate propio; no abre Gate D de Core. `public=true` permite descargas por URL conocida y la validación remota permanece pendiente.
- **Plan explícito (pactado, no ejecutado):**
  1. **Commits atómicos** — (a) Storage: migración + `verify:storage-migration` + `package.json` + `STORAGE_DRIFT_REPAIR.md`; (b) `fix:` 10 archivos dashboard/logout; (c) `docs:` esta actualización.
  2. **Verificación local** sobre los commits: `lint` + `typecheck` + `test` + `build` + `test:release` + `verify:release` + `git diff --check`.
  3. **Promoción directa fast-forward a `main`** (`git checkout main && git merge --ff-only stabilization/release-readiness`) y push — sólo con autorización explícita.
  4. **Limpieza posterior:** borrar la rama fusionada (local y remota) y actualizar `STATUS.md` / `NEXT_ACTIONS.md` / `KNOWN_ISSUES.md` post-promoción.
- **Sigue pendiente (no bloqueado por esta sesión):** verificación runtime de los cambios locales, CI Node 22, estado remoto Supabase, matriz RLS en staging y hallazgos de seguridad del handoff §8.1.b.

## Canonical active state (ADR-004 Accepted 2026-08-05 — replaces prior pre-acceptance state)

- **FASE 0 COMPLETE.**
- **GAP ANALYSIS APPROVED**; companion ADR **Accepted**.
- **ADR-004 rev. 4.2 Accepted**; owner acceptance completed with the exact quote recorded in ADR-004, `SESSION_LOG.md` and `DECISION_LOG.md`.
- **OWNER ACCEPTANCE COMPLETED**.
- **CORE SCHEMA DESIGN (Gate B1) — READY / OPENED DOCUMENTALLY**. B1 is not implemented.
- **CORE MIGRATION READINESS (Gate B2) — BLOCKED**. B2 is a prerequisite of any migration; staging is **not** a B1 requirement.
- **B2 future risk / criterion:** the Core migration plan must include a concurrent-transfer test for the at-least-one active-owner invariant. `student_profiles.school_id` remains compatibility-only and is reconciled with `student_enrollments` by one synchronization layer; it is not authority. This does not change the conceptual decision or authorize SQL.
- **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
- **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
- **GATE D MIGRATIONS: BLOCKED** (until A / B1 / C / B2 closed; Gate D is never "in parallel" with A, B1, B2 or C).
- **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
- **D-01..D-43 fixed and preserved**; **D-OD-1..D-OD-7 deferred and open**.
- **Canonical gate sequence:** **A → B1 → C → B2 → D**. B2, C and D remain blocked; C is blocked exclusively by D-OD-1. No B2/C/D gate is opened by this acceptance.

## Release-Readiness Gate (immediate, in this order) [HISTORICAL — SUPERSEDED BY 2026-08-13]

> **HISTORICAL — SUPERSEDED BY 2026-08-13.** Esta lista correspondía al estado de la
> rama el 2026-08-05 (HEAD `be3ed9e`). La rama ha avanzado 10 commits (incluidos el gate
> Node 22 canónico `2a01621` y el cierre del perfil autenticado), `ef3b428` ya es remoto,
> y el plan vigente es el del bloque "Current State (2026-08-13)" al inicio de este archivo.
> Los ítems 1-6 siguientes se conservan como trazabilidad histórica.

1. **Update the architectural contracts and design the documentary B1 package.** Keep B1 limited to the accepted identity, organization, ownership, authorization and audit contracts. Do not add SQL, Supabase, migrations, runtime changes or implementation.
2. **Keep B2, C and D blocked.** C remains blocked exclusively by D-OD-1; migrations and implementation remain blocked.
3. Prepare the `docs:` commit with only the seven acceptance/versioning files: the two architecture documents and `docs/workflow/{STATUS.md,NEXT_ACTIONS.md,OPEN_QUESTIONS.md,SESSION_LOG.md,DECISION_LOG.md}`. Exclude `apps/web/src/test/setup.ts`, `docs/workflow/HANDOFF.md` and `docs/technical/KNOWN_ISSUES.md`; publication is outside this task.
4. Re-run the full local static verification chain on top of the commit: `npm run lint && npm run typecheck && npm test && npm run build` — and then `npm run test:release` and `npm run verify:release` to confirm the green baseline survives the commit.
5. Open the GitHub Actions CI workflow (`.github/workflows/ci.yml` and `.github/workflows/web-quality.yml`) and confirm the Phase 1 fix reproduces on the CI Node 22 baseline. The local machine only has Node 26.2.0; CI Node 22 is the binding gate for closing Phase 1.
6. Create `apps/web/.env.local` from `.env.example` (or from staging secrets) before any local Playwright run; do not commit it.

## Staging And Runtime Gate

5. Provision the second free Supabase project described in `docs/technical/STAGING_SETUP.md`.
6. Build and review a schema baseline without copying production data.
7. Configure isolated staging fixtures for Student, Company, School and External.
8. Set the canonical `RUNTIME_*` GitHub secrets in the `staging` environment.
9. Trigger `Runtime Supabase Smoke` and `Runtime Security Smoke Tests` manually.
10. Record pass/fail evidence and resolve any RLS or RPC regression before production use.
11. Re-run `supabase_get_advisors(type=security)` and `supabase_get_advisors(type=performance)` from a session where `supabase_list_tables` works, to refresh the live advisor snapshot; the introspection calls timed out in this session.

## Product Extraction

12. Continue splitting Student profile, feed, opportunities and applications data access from shared role-aware components.
13. Move Company opportunity creation and applicant management fully onto canonical `opportunities`.
14. Split School students, imports, validations and internship approvals into smaller feature components.
15. Keep route aliases thin while preserving server actions and canonical account guards.

## Security And Data

16. Address the security review findings from `docs/workflow/HANDOFF.md` §8.1.b in priority order: CRITICAL broad authenticated `profiles` SELECT and `updateApplicationStatusSA` first; HIGH in-memory rate limiter, `/api/chat` rate limit, `/api/seed` response shape, `contact_requests` ownership double-check; MEDIUM CORS localhost fallback, optional service role, HSTS.
17. Narrow authenticated `profiles` reads and replace broad compatibility policy by resource-specific reads.
18. Finish legacy `job_postings` dual-read and dual-write migration.
19. Validate `opportunity_proposals`, evidence, contact mediation, interviews and timeline transitions runtime.
20. Enable leaked-password protection in Supabase Auth; RLS helpers are already private and no longer callable through the public RPC surface.

## UX And Release

21. Run keyboard, screen-reader and mobile viewport checks for all four persona journeys once Playwright is unblocked locally or against a deployed Preview.
22. Add consistent loading, empty, error and not-found states to extracted pages.
23. Run the production Preview smoke test with the non-production staging project.
24. Update deployment runbook, environment inventory and release checklist.

## Dependency Hygiene

25. Triage the 20 `apps/web` dependency vulnerabilities (1 low, 9 moderate, 10 high) in a controlled maintenance change after staging is in place. The workspace root reports 0 vulnerabilities because its only dev-dep is the Supabase CLI; the `apps/web` count is the one to act on.

## Identity / Organizations / Resource Ownership — Documentation Pass (2026-08-05, parallel docs pass) [HISTORICAL]

> **Historical block (rev. 1 docs pass, 2026-08-05).** The items below are the read-only follow-ups from the first docs pass; they are preserved for traceability and are **superseded** by the rev. 3 follow-up block at the end of this file. The numbers below are the rev. 1 numbering; the canonical numbering going forward is the **rev. 3 ordering** (26-31 first, then 32-35) in the new block.

These items are the read-only follow-ups to the gap analysis in `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` and the companion ADR `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` (Status: **Proposed — OWNER ACCEPTANCE REQUIRED**, rev. 3). They do not change the release gate, do not commit, and do not push. They are scoped to documentation only; no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile and no workflow file is touched. Staging + baseline remain the binding preconditions for any RLS-related work; they are not relaxed by this pass.

> **Historical — superseded by the rev. 3 block at the end of this file.**

32. Treat the four open decisions in the gap analysis §16 and ADR-004 §14 (D-OD-1..D-OD-5) as the formal input to the next phase: which applications/proposals alternative is adopted, whether `student_id` is kept alongside `applicant_id`, whether `proposed_amount` becomes required for `freelance_request`, the NOT NULL policy for service-role backfilled `created_by_profile_id`, and the role list for `organization_memberships` when `kind = 'company'`. These decisions gate Phase 1B (schema-only) and are the only blocker on opening the migration work in `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` §17.
33. Land the two surgical fixes recorded in the gap analysis §9.3 (move `profiles.school_id` reads to `student_profiles.school_id` in `apps/web/src/lib/services/contact-requests.ts:62` and `apps/web/src/app/actions/school.ts:332`) before any organization-membership migration. They are independent of Phase 1B and may land earlier.
34. Re-read ADR-004 §11 (migration plan) and §12 (rollback plan) before the next migration is authored. No migration file is to be authored, applied or staged in this docs pass.
35. Treat the gap analysis §18 (known contradictions and risks) as the binding inventory for the next contributor. None of the items in that list is closed by this docs pass.

## Read-Only Inventory Follow-Ups (2026-08-05)

These items are derived from the read-only inventories in `docs/technical/KNOWN_ISSUES.md` § "Read-Only Inventories (2026-08-05)". They do not change the release gate, do not commit, and do not push. They are scoped to documentation and to planning only; no code, migration, dependency, lockfile, or workflow file is touched by this docs pass. Staging + baseline remain the binding preconditions for any RLS-related fix.

26. Document the `createAdminClient` distribution and the validate-with-RLS / mutate-with-admin contract in `docs/architecture/SECURITY_MODEL.md`. The pattern is uniform across auth / school / company / API seed / chat / gamification; it is currently not captured in `SECURITY_MODEL.md`.
27. Treat `updateApplicationStatus` (legacy) and `updateApplicationStatusSA` as a **single** CRITICAL finding, complementary to item 16: the admin-client write is constrained only by `applicationId`, and `jobId` is not re-bound. The recommended fix — `.eq("job_id", jobId)` on the RLS-bound path plus a structural verifier case — must be validated against the staging fixture, not just locally.
28. Add `rateLimit(...)` to `POST /api/chat`, conditioned on `ENABLE_AI_CHAT === "true"` and keyed by `user.id`. `/api/chat` is the only `/api/*` route with paid outbound calls that does not consume the in-memory limiter.
29. Decide whether the `/api/seed` success response should return only account IDs (and not `password: DEMO_PASSWORD`); document the decision in `SECURITY_MODEL.md` and `RUNTIME_SECURITY_RUNBOOK.md`. Audit-log every successful `POST /api/seed` call regardless of the decision.
30. Decide whether to keep the in-memory `rateLimit` (currently protecting only `xp`, `quests`, `streak`) and add a shared-store limiter for the rest of the API, or to retire the in-memory implementation. Either way, do not claim a fix in this branch.
31. Triage the four direct `apps/web` dependency advisories (`xlsx`, `next`, `eslint-config-next`, `@sentry/nextjs`) in the order: (a) `xlsx` — replacement is the only path, no fix available; (b) `next` + `eslint-config-next` — major bump requires compatibility review; (c) `@sentry/nextjs` — minor/patch available, retires OpenTelemetry transitives as a side effect. Re-run `npm audit --omit=optional` after each change. The 16 transitive advisories are not independently actionable while the direct packages are pinned.

## Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:identity-access
npm run verify:opportunities
npm run verify:runtime-security
npm run verify:runtime-feed-rpcs
```

For the local release gate, run `npm run test:release` and `npm run verify:release`. The CI workflow (`.github/workflows/ci.yml` and `.github/workflows/web-quality.yml`) is the binding gate on the Node 22 baseline.

## Identity / Organizations / Resource Ownership — Docs Correction (2026-08-05, this mission)

These items are the read-only corrections to `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` and `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` per the auditor's findings. They do not change the release gate, do not commit, and do not push. They are scoped to documentation only; no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile and no workflow file is touched. Staging + baseline remain the binding preconditions for any RLS-related work; they are not relaxed by this mission. **The numbering below is the corrected order** (read-only inventory follow-ups 26-31 first, then the identity / organizations pass 32-35); the historical ordering of the previous "32-35 before 26-31" sections in this file is preserved as **historical** (see the "Documentation Pass [HISTORICAL]" block above) and is **not** the canonical ordering going forward.

26. Document the `createAdminClient` distribution and the validate-with-RLS / mutate-with-admin contract in `docs/architecture/SECURITY_MODEL.md`. The pattern is uniform across auth / school / company / API seed / chat / gamification; it is currently not captured in `SECURITY_MODEL.md`.
27. Treat `updateApplicationStatus` (legacy) and `updateApplicationStatusSA` as a **single** CRITICAL finding, complementary to item 16: the admin-client write is constrained only by `applicationId`, and `jobId` is not re-bound. The recommended fix — `.eq("job_id", jobId)` on the RLS-bound path plus a structural verifier case — must be validated against the staging fixture, not just locally.
28. Add `rateLimit(...)` to `POST /api/chat`, conditioned on `ENABLE_AI_CHAT === "true"` and keyed by `user.id`. `/api/chat` is the only `/api/*` route with paid outbound calls that does not consume the in-memory limiter.
29. Decide whether the `/api/seed` success response should return only account IDs (and not `password: DEMO_PASSWORD`); document the decision in `SECURITY_MODEL.md` and `RUNTIME_SECURITY_RUNBOOK.md`. Audit-log every successful `POST /api/seed` call regardless of the decision.
30. Decide whether to keep the in-memory `rateLimit` (currently protecting only `xp`, `quests`, `streak`) and add a shared-store limiter for the rest of the API, or to retire the in-memory implementation. Either way, do not claim a fix in this branch.
31. Triage the four direct `apps/web` dependency advisories (`xlsx`, `next`, `eslint-config-next`, `@sentry/nextjs`) in the order: (a) `xlsx` — replacement is the only path, no fix available; (b) `next` + `eslint-config-next` — major bump requires compatibility review; (c) `@sentry/nextjs` — minor/patch available, retires OpenTelemetry transitives as a side effect. Re-run `npm audit --omit=optional` after each change. The 16 transitive advisories are not independently actionable while the direct packages are pinned.

32. Treat the open decisions in the gap analysis §16 and ADR-004 §14 (D-OD-1..D-OD-7) as the formal input to the next phase. **D-OD-1 is NOT a gate for ADR-004 acceptance** (Gate A, §15.A). The applications/proposals schema-only work is its own gated sub-decision (D-OD-1, gap analysis §8.4 / §8.6, Gate C, §15.C / §17.C). The other open decisions (D-OD-2..D-OD-7) are gates for Gate B and Gate C. D-OD-4 is the **operational** choice for service-role backfilled `created_by_profile_id` (the structural decision — `NOT NULL`, no `ON DELETE SET NULL`, audit only — is recorded in the gap analysis §10.2, §13.4, §7.4 and the ADR §6.10 / §7.6 / §8 I-12, I-15, I-19).
33. Land the two surgical fixes recorded in the gap analysis §9.3 / §9.4 and §15.1 (move `profiles.school_id` reads to `student_profiles.school_id` in `apps/web/src/lib/services/contact-requests.ts:62` and `apps/web/src/app/actions/school.ts:332`) before any organization-membership migration. They are independent of Gate B and may land earlier. They are a precondition for the view conversion of `schools` (FK-to-view blocker). The exhaustive `school_id` matrix is in gap analysis §9.4.
34. Re-read ADR-004 §11 (migration plan) and §12 (rollback plan) before the next migration is authored. Every step in §11 is structured as **expand / transition / contract** (§11.12; gap analysis §15.12); every step records its baseline, its backfill, its RLS impact, its rollback, and its staging verification (D-43). No migration file is to be authored, applied or staged in this docs pass. The freelance rename is recorded in gap analysis §15.13 with the full expand / transition / contract plan.
35. Treat the gap analysis §18 (known contradictions and risks) as the binding inventory for the next contributor. None of the items in that list is closed by this docs pass. The current state of `profiles` (broad authenticated SELECT) and the `updateApplicationStatusSA` admin-client path remain the binding release-blocking security findings, tracked in the security review and the previous handoff.

### Identity / Organizations / Resource Ownership — Rev. 3 follow-up (2026-08-05, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.1 (this session).** The rev. 3 follow-up block is preserved for traceability; the canonical state is the rev. 4.1 follow-up block at the end of this file. The rev. 3 assertions inside this block (D-OD-2 / D-OD-3 / D-OD-6 as independent gates, the 10-row projection, `company_profiles` view) are **not** part of the canonical state; they are replaced by the rev. 4.1 corrections (D-OD-2 / D-OD-3 absorbed by D-OD-1; D-OD-6 / D-OD-7 implementation / runtime notes not independent gates; projection table exactly 6 rows; `company_profiles` Option A: physical adapter table during compatibility, not a view).

These items are the read-only follow-ups to the rev. 3 update of the gap analysis and ADR-004. They do not change the release gate, do not commit, and do not push. They are scoped to documentation only; no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched. **SUPABASE UNCHANGED.**

36. **Owner acceptance of ADR-004 (Gate A).** The product owner reviews `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` rev. 3 against the Gate A criteria (§15.A) and either accepts the ADR (status: Accepted) or returns it for further documentation. The Gate A criteria do not require D-OD-1, migrations authored, staging applied, runtime RLS or production; the criteria are ownership inequívoco, autoridad canónica, decisiones aprobadas, compatibilidad conceptual, gates coherentes and decisiones diferidas aisladas. **D-OD-1 is not a Gate A criterion.** The status change is the owner's call; the rev. 3 update does **not** auto-Accept.
37. **Independent audit of the gap analysis (gate for APPROVED).** An independent auditor reviews `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` rev. 3 against the §19 acceptance criteria. The current state is **READY FOR AUDIT (APPROVED pendiente auditoría)**. The verdict closes the "open observations" from the 2026-08-05 architecture audit (FK destination for `school_id` closed by §9.4; ownership constraints / XOR and unique owner closed by §5.4 and §7.4; `created_by_profile_id` audit vs authorization closed by §10.2 and §13.4; `security_invoker` and grants for views closed by §13.4; circularity between ADR and migration gates closed by §17; `company_profiles` transition closed by §4.4; applications / D-OD-1 not in the general baseline closed by §8.6 and Gate C; dual-write / backfill / rollback / idempotency closed by §15.12; freelance rollback closed by §15.13; staging and RLS runtime closed by Gate D).
38. **Gate B (Core schema-only) preparation.** Open only after Gate A is cleared. Stage the free Supabase project per `docs/technical/STAGING_SETUP.md`; configure the `RUNTIME_*` GitHub secrets; record the CI Node 22 Phase 1 result in `docs/workflow/STATUS.md`; merge the two surgical fixes in §15.1 step 0; author the Core migration plan with baseline, backfill, RLS impact, rollback, staging verification (D-43); author the `created_by_profile_id` audit column on `organizations` and `organization_memberships`; author the `organizations.profile_id` backfill with the no-automatic-creation rule (gap analysis §4.4) and the six classes reviewed; author the unique active owner invariant (gap analysis §5.4) with the chosen implementation option (partial unique index, transactional function, defensive trigger, or combination); author the school_members / schools view conversion (after inbound FKs); author the `role` retirement in the school RLS predicates.
39. **Gate C (Interactions schema-only) preparation.** Open only after Gate B is cleared (or in parallel with a clear pre-implementation gate) and D-OD-1 is decided. Decide the applications / proposals alternative (A, B, C or D, gap analysis §8.4 and §8.6); decide D-OD-2 (`student_id` alongside `applicant_id`); decide D-OD-3 (`proposed_amount` required for `freelance_request`); record D-OD-4 (operational choice for service-role backfilled `created_by_profile_id`); decide D-OD-6 (`revoked_at` and `expires_at` on `contact_requests`); author the Interactions migration plan with baseline, backfill, RLS impact, rollback, staging verification (D-43); preserve the XOR ownership rule (the applicant is the owner of the application / proposal; the destination is the `opportunity`); preserve the conceptual contract (Company uses applications; External uses opportunity_proposals; posts are not applications / proposals; applications are not `freelance_request`; proposals are not `job`, `internship`, `company_project`).
40. **Gate D (migraciones ejecutables) preparation.** Open only after Gate A, B and C are cleared. Reconcile the baseline remote (D.5); run the design audit (D.6); define the backfill, the rollback and the staging verification (D.7); apply the migrations on the staging project; exercise the RLS runtime (D.8); authorize the production deployment (D.9); close the audit dictums (D.10). Runtime grants, fixtures and the RLS runtime verification are Gate D concerns, not Gate A or Gate B concerns. **No RLS runtime verification is required for Gate A.**

### Validations pending execution by the orchestrator only

The following three git commands are the **only** validations the orchestrator runs in this docs pass. The docs pass is documentation-only; no `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration is executed in this docs pass.

```bash
git diff --check                                  # whitespace / conflict-marker clean
git status --short --branch                       # branch state, modified files, untracked files
git diff --stat                                   # diff size, additive references only
```

## Identity / Organizations / Resource Ownership — Rev. 4 audit-preparation (2026-08-05, this mission)

This block is the rev. 4 follow-up to the previous rev. 3 follow-up (items 36-40 above). It records the **post-independent-audit** corrections applied to the gap analysis and ADR-004, and the updated read-only follow-ups. The rev. 4 corrections are additive to the rev. 3 block; no rev. 3 item is removed or re-numbered. No validations are claimed in this docs pass; the orchestrator is the only one to run validations.

- **Active state (rev. 4, HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING).** FASE 0 COMPLETE; ADR READY FOR OWNER ACCEPTANCE (Gate A; Proposed — OWNER ACCEPTANCE REQUIRED; the rev. 4 update does **not** auto-Accept); GAP ANALYSIS READY FOR AUDIT (APPROVED pendiente auditoría; rev. 4); **CORE schema-only: READY (documental; implementación bloqueada)** (Gate B's documentary gate is READY; the implementation is BLOCKED by Gate D and by the owner acceptance of ADR-004); PUBLISHING READY WITH DEFERRED ITEMS; INTERACTIONS BLOCKED D-OD-1 (D-OD-1 is the only blocker for Gate C; D-OD-2 / D-OD-3 are sub-decisions absorbed by D-OD-1; D-OD-6 / D-OD-7 are implementation / runtime notes, not independent gates in this classification); MIGRATIONS BLOCKED; IMPLEMENTATION BLOCKED; SUPABASE UNCHANGED. The historical "four levels" / "Core schema-only: READY" / "Gate B documentary READY" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D.
- **Rev. 4 read-only follow-ups (replaces / supplements the rev. 3 follow-ups 36-40).** These items are the read-only follow-ups to the rev. 4 update of the gap analysis and ADR-004. They do not change the release gate, do not commit, and do not push. They are scoped to documentation only; no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched. **SUPABASE UNCHANGED.**

41. **Owner acceptance of ADR-004 (Gate A, rev. 4).** The product owner reviews `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` rev. 4 against the Gate A criteria (§15.A) and either accepts the ADR (status: Accepted) or returns it for further documentation. The Gate A criteria (ownership inequívoco, autoridad canónica, decisiones aprobadas, compatibilidad, gates coherentes, decisiones diferidas aisladas) **do not require migration authored, staging applied, runtime RLS, or production**. **D-OD-1 is not a Gate A criterion.** The status change is the owner's call; the rev. 4 update does **not** auto-Accept.
42. **Independent audit of the gap analysis (rev. 4, gate for APPROVED).** An independent auditor reviews `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` rev. 4 against the §19 acceptance criteria. The current state is **READY FOR AUDIT (APPROVED pendiente auditoría)**. The audit closes the rev. 3 open observations and the rev. 4 corrections: posts actor vs owner (§7.4); opportunities/school (§7.1/§7.4, D-30); contact requests and authorizations (§7.4); views/grants/security with minimum grants on view and base (§13.4); owner transfer atomicity (§5.4); gates vocabulary (§17.0); `company_profiles` single coherent option (§4.4); status vocabulary (`active | invited | suspended | disabled`); `school_id` matrix exhaustive and concrete (§9.4); internal contradictions fixed (projection table exactly 6 rows; "five vs six" → six; §15.6 / §15.13 summary vs detailed).
43. **Gate B (Core schema-only documental) preparation.** Open only after Gate A is cleared. Stage the free Supabase project per `docs/technical/STAGING_SETUP.md`; configure the `RUNTIME_*` GitHub secrets; record the CI Node 22 Phase 1 result in `docs/workflow/STATUS.md`; merge the two surgical fixes in §15.1 step 0; author the Core migration plan with baseline, backfill, RLS impact, rollback, staging verification (D-43). The Gate B **documentary gate** is READY in the current session (rev. 4); the **implementation** is blocked by Gate D and by the owner acceptance of ADR-004. The "READY" qualifier is **documental**, not authorization to write SQL or to implement. The Core migration plan may be **authored and reviewed** under Gate B's documentary gate, but it is **not applied to any environment** until Gate D is cleared.
44. **Gate C (Interactions schema-only) preparation.** Open only after Gate B is cleared and D-OD-1 is decided. **D-OD-1 is the only blocker for Gate C.** D-OD-2 and D-OD-3 are sub-decisions absorbed by D-OD-1 (the chosen alternative encodes the `student_id` / `applicant_id` and `proposed_amount` choices). D-OD-4 is the operational choice for service-role backfilled `created_by_profile_id` and is recorded. D-OD-6 and D-OD-7 are implementation / runtime notes (the `revoked_at` / `expires_at` columns and the notifications payload / link redaction) and are **not independent gates** in this classification; they are recorded as part of the Gate C migration plan and are implemented in Gate D. Decide the applications / proposals alternative (A, B, C or D, gap analysis §8.4 and §8.6); author the Interactions migration plan with baseline, backfill, RLS impact, rollback, staging verification (D-43); preserve the XOR ownership rule; preserve the conceptual contract.
45. **Gate D (migraciones ejecutables) preparation.** Open only after Gate A, B and C are closed. Gate D is **never** "in parallel" with A / B / C. Reconcile the baseline remote (D.5); run the design audit (D.6); define the backfill, the rollback and the staging verification (D.7); apply the migrations on the staging project; exercise the RLS runtime (D.8); authorize the production deployment (D.9); close the audit dictums (D.10). Runtime grants, fixtures and the RLS runtime verification are Gate D concerns, not Gate A or Gate B concerns. **No RLS runtime verification is required for Gate A.**

### Validations pending execution by the orchestrator only (rev. 4)

The following three git commands are the **only** validations the orchestrator runs in this rev. 4 docs pass. The docs pass is documentation-only; no `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration is executed in this docs pass. **No other validations are claimed.** The validation of the rev. 4 corrections is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is not claimed in this docs pass.

```bash
git diff --check                                  # whitespace / conflict-marker clean
git status --short --branch                       # branch state, modified files, untracked files
git diff --stat                                   # diff size, additive references only
```

## Identity / Organizations / Resource Ownership — Rev. 4.1, second-audit residue cleanup (2026-08-05, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** The rev. 4.1 block is preserved for traceability as historical; the canonical state is the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** block at the top of this file (the "Canonical active state" section) and at the end of this file. The "CORE DOCUMENTARY PACKAGE: READY FOR AUDIT" / "GATE B EXECUTION: BLOCKED" / "GATE D MIGRATIONS: BLOCKED" three-state framing of rev. 4.1 is **SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**: Gate B is split into B1 (Core schema design, READY AFTER OWNER ACCEPTANCE) and B2 (Core migration readiness, BLOCKED). The rev. 4.1 follow-ups 46–50 are preserved as historical; the canonical state is the REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING block. The historical "four levels" / "four-gate model" / "in parallel" / "in flight" / "Core READY" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D.

This block is the rev. 4.1 follow-up to the rev. 4 follow-up (items 41-45 above). It is the **canonical state** for the corrections applied in this docs pass. The rev. 4 follow-up remains valid as the rev. 4 baseline; rev. 4.1 is additive to rev. 4 (no rev. 4 correction is removed). The five residues flagged by the second independent audit are addressed. No validations are claimed in this docs pass; the orchestrator is the only one to run validations.

- **Active state (rev. 4.1, historical).** FASE 0 COMPLETE; GAP ANALYSIS READY FOR AUDIT (rev. 4.1); ADR-004 Proposed / READY FOR OWNER ACCEPTANCE (Gate A; rev. 4.1 does not auto-Accept); **CORE DOCUMENTARY PACKAGE: READY FOR AUDIT**; **GATE B EXECUTION: BLOCKED**; PUBLISHING READY WITH DEFERRED ITEMS; INTERACTIONS BLOCKED exclusively D-OD-1; GATE D MIGRATIONS: BLOCKED; MIGRATIONS BLOCKED; IMPLEMENTATION BLOCKED; SUPABASE UNCHANGED; D-01..D-43 preserved; ADR Proposed — OWNER ACCEPTANCE REQUIRED. The three-state framing is **HISTORICAL — SUPERSEDED BY REV 4.2**.

## Identity / Organizations / Resource Ownership — Rev. 4.2, third-pass corrections (2026-08-05, Part A, this mission)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** This rev. 4.2 block is preserved for traceability as historical; the canonical state is the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** block at the top of this file (the "Canonical active state" section) and at the end of this file. The third-pass brief drives the seven corrections (A.1..A.7). The "Core schema-only: READY (documental; implementación bloqueada)" wording of rev. 4.1 is replaced by the B1 / B2 split. The post-rev. 4.2 audit detected eleven active residues that are addressed in the cleanup block at the end of this file. The cleanup is in **FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** state, not "audited" or "closed". The historical "four levels" / "four-gate model" / "in parallel" / "in flight" / "Core READY" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D. **A.1–A.7 are NOT declared corrected/closed in this pass.**

This block is the rev. 4.2 follow-up to the rev. 4.1 follow-up (items 46-50 above). It is the **canonical state** for the corrections applied in this docs pass. The rev. 4.1 block remains valid as the rev. 4.1 baseline; rev. 4.2 is additive to rev. 4.1 (no rev. 4.1 correction is removed). The seven corrections A.1..A.7 are addressed. No validations are claimed in this docs pass; the orchestrator is the only one to run validations. **SUPABASE UNCHANGED.**

- **Active state (rev. 4.2) — canonical verdict posture.**
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
  - **Historical verdict wording (rev. 4.1; SUPERSEDED BY REV 4.2):** "CORE DOCUMENTARY PACKAGE: READY FOR AUDIT", "GATE B EXECUTION: BLOCKED", and "Core schema-only: READY (documental; implementación bloqueada)" are replaced by the B1 / B2 split.

- **Rev. 4.2 read-only follow-ups (replaces / supplements the rev. 4.1 follow-ups 46-50).** These items are the read-only follow-ups to the rev. 4.2 update of the gap analysis and ADR-004. They do not change the release gate, do not commit, and do not push. They are scoped to documentation only; no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched. **SUPABASE UNCHANGED.**

  51. **Owner acceptance of ADR-004 (Gate A, rev. 4.2).** The product owner reviews `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` rev. 4.2 against the Gate A criteria (§15.A) and either accepts the ADR (status: Accepted) or returns it for further documentation. The Gate A criteria (ownership inequívoco, autoridad canónica, decisiones aprobadas, compatibilidad, gates coherentes, decisiones diferidas aisladas) **do not require migration authored, staging applied, runtime RLS, or production**. **D-OD-1 is not a Gate A criterion.** The status change is the owner's call; the rev. 4.2 update does **not** auto-Accept. The canonical D-41 (rev. 4.2) states: "La autorización organizacional depende de `memberships` activas, ownership del recurso y relaciones explícitas de dominio. `created_by_profile_id` registra el actor histórico y no autoriza."
  52. **Independent audit of the gap analysis (rev. 4.2, gate for APPROVED).** An independent auditor reviews `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` rev. 4.2 against the §19 acceptance criteria. The current state is **READY FOR AUDIT (APPROVED pendiente auditoría)**. The audit closes the rev. 3 / rev. 4 / rev. 4.1 open observations and the rev. 4.2 corrections: (1) A.1 — `student_enrollments` canonical (live + history); (2) A.2 — `created_by_profile_id` audit only (disjoint authorization / audit source lists, Company A example, D-41 reformulation); (3) A.3 — `organizations` no canonical `profile_id`; (4) A.4 — exactly one active owner with the 8-step conceptual sequence; (5) A.5 — real semantics of views / functions (no "security_definer view"; three real alternatives); (6) A.6 — Gate B1 / B2 split; (7) A.7 — workflow and audit (rev. 4.2 entries, no validations claimed, no commit / push).
  53. **Gate B1 (Core schema design) — READY AFTER OWNER ACCEPTANCE.** Open only after Gate A is cleared. The gate is **documental** (no staging, no secrets, no runtime, no migrations, no backfill, no SQL, no Supabase). The criteria are: ADR Accepted; contracts updated; entities and relationships documented; conceptual constraints listed; ownership matrix and authorization matrix produced; audit-only reiteration in the documents.
  54. **Gate B2 (Core migration readiness) — BLOCKED.** Open only after Gate B1 is closed and the preconditions are met. The criteria are: B2.1 B1 closed; B2.2 staging project provisioned; B2.3 CI Node 22 result recorded; B2.4 surgical fixes merged; B2.5 Core migration plan authored / reviewed / audited with idempotent backfill, RLS impact, rollback, staging verification; B2.6 local tests green and critical fixes closed; B2.7 plan internally audited. The Core migration plan covers: the `organizations` table (rev. 4.2: no canonical `profile_id`); the `organization_memberships` table; the `student_enrollments` table (rev. 4.2: live + history, with `student_profile_id + school_organization_id`); the `profile_evidence` / `profile_evidence_events` / `notifications` school FK re-point; the SQL helper function migration; the `created_by_profile_id` audit column; the school_members / schools view conversion; the exactly-one active owner invariant (I-18; §5.4 rev. 4.2); the `role` retirement. **No Core migration is applied to any environment until Gate D is cleared.**
  55. **Gate C (Interactions schema-only) preparation.** Open only after Gate B1 is closed (rev. 4.2) and D-OD-1 is decided. **D-OD-1 is the only blocker for Gate C** (decision). **C.1 / C.2 / C.5 are preparation controls, not additional decisions** (rev. 4.2): C.1 (Gate A cleared) is a Gate A concern; C.2 (Gate B1 / B2) is a Gate B concern; C.5 (Interactions migration plan) is a preparation control (the plan is authored and reviewed under Gate C; the plan is not adopted until D-OD-1 is decided). D-OD-2 and D-OD-3 are sub-decisions absorbed by D-OD-1; D-OD-6 and D-OD-7 are implementation / runtime notes, not independent gates in this classification. Decide the applications / proposals alternative (A, B, C or D, gap analysis §8.4 and §8.6); author the Interactions migration plan with baseline, backfill, RLS impact, rollback, staging verification (D-43); preserve the XOR ownership rule; preserve the conceptual contract.
  56. **Gate D (migraciones ejecutables) preparation.** Open only after Gate A, B1, B2 and C are closed. Gate D is **never** "in parallel" with A / B / C. Reconcile the baseline remote (D.5); run the design audit (D.6); define the backfill, the rollback and the staging verification (D.7); apply the migrations on the staging project; exercise the RLS runtime (D.8); authorize the production deployment (D.9); close the audit dictums (D.10). Runtime grants, fixtures and the RLS runtime verification are Gate D concerns, not Gate A, B1 or B2 concerns. **No RLS runtime verification is required for Gate A.**

### Validations pending execution by the orchestrator only (rev. 4.2)

The following three git commands are the **only** validations the orchestrator runs in this rev. 4.2 docs pass. The docs pass is documentation-only; no `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration, no staging, no runtime grant, no fixture was executed in this docs pass. **No other validations are claimed.** The validation of the rev. 4.2 corrections is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is **not** claimed in this docs pass.

```bash
git diff --check                                  # whitespace / conflict-marker clean
git status --short --branch                       # branch state, modified files, untracked files
git diff --stat                                   # diff size, additive references only
```

## Identity / Organizations / Resource Ownership — HISTORICAL PRE-ACCEPTANCE: Rev. 4.2 cleanup / audit pending (2026-08-05, this session)

> **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING (this session).** The rev. 4.2 cleanup block is preserved for traceability as the **first** cleanup pass. The **canonical** state is the **REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING** block at the top of this file (the "Canonical active state" section) and at the end of this file, which records the **in-place corrections** to the canonical sections of the architecture docs. The rev. 4.1 / rev. 4 / rev. 3 / rev. 4.2 / rev. 4.2 cleanup traceability is preserved. **The canonical state is "FINAL DOCUMENTARY CLEANUP / AUDIT PENDING", not "audited" or "closed".** **A.1–A.7 are NOT declared corrected/closed in this pass.** No validations are claimed; no commit / push is made. SUPABASE UNCHANGED. The historical "four levels" / "four-gate model" / "in parallel" / "in flight" / "Core schema-only: READY" / "A.1–A.7 corrected/closed" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING**; the canonical framing is the five states (A + B1 + C + B2 + D) and the strict sequence A → B1 → C → B2 → D, with the "A.1–A.7 NOT closed" stance.

- **Scope.** Apply targeted inline corrections to the eleven residues flagged by the post-rev. 4.2 audit. Scope is the six files allowed by the brief. No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration, no executable migration, no staging, no runtime grant, no fixture, no RLS predicate, no view, no grant is touched. No ROLE_MODEL.md, no DATA_MODEL.md, no AUTHORIZATION_MATRIX.md, no SECURITY_MODEL.md, no DECISION_LOG.md, no HANDOFF.md, no KNOWN_ISSUES.md is touched. **No validations are claimed in this pass.**
- **The eleven residues.** (1) D-15 — `student_enrollments` canonical; `student_profiles.school_id` is a single source-of-read adapter. (2) `created_by_profile_id` audit only; disjoint lists; Company A example preserved. (3) `organizations` no canonical `profile_id`; `organization_legacy_links` is an alternative (no table created). (4) Ownership 8-step (not 7); at-most-one / at-least-one / exactly-one; pending / suspended / recovery have no ordinary operations. (5) Views / functions — no "security_definer view"; three real alternatives; public rows record function / `EXECUTE`. (6) Gates — sequence A → B1 → C → B2 / D; D-OD-1 only decisional blocker for C; B2 not parallel. (7) Workflow — "CLEANUP / AUDIT PENDING", not "A.1–A.7 closed". (8) `student_school_records` — optional / deferred; if in B1 / B2, `student_school_records.student_enrollment_id → student_enrollments.id`, no independent `school_id`; field contract pending B1. (9) Adapters / views rollback — physical tables not dropped; mappings / backups verifiable; rollback restores adapter / mappings / previous reads, no SQL claimed. (10) D-OD-4 — operational, not Gate C / independent blocker; D-OD-5 may continue deferred for company roles. (11) D-01..D-43 intact; ADR Proposed; no SQL / code / Supabase.

- **Active state (rev. 4.2 cleanup / audit pending) — canonical verdict posture.**
  - **FASE 0 COMPLETE**.
  - **GAP ANALYSIS READY FOR AUDIT** (rev. 4.2 cleanup; APPROVED pendiente auditoría).
  - **ADR-004 rev. 4.2 Proposed / READY FOR OWNER ACCEPTANCE** (Gate A; **Proposed — OWNER ACCEPTANCE REQUIRED**; rev. 4.2 cleanup does **not** auto-Accept).
  - **OWNER ACCEPTANCE READY** (the documents are in place; the owner acceptance is the Gate A decision).
  - **CORE SCHEMA DESIGN (Gate B1) — READY AFTER OWNER ACCEPTANCE** (rev. 4.2 cleanup). B1 opens as soon as the ADR is **Accepted**.
  - **CORE MIGRATION READINESS (Gate B2) — BLOCKED** (rev. 4.2 cleanup). B2 is a prerequisite of any migration.
  - **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
  - **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
  - **GATE D MIGRATIONS: BLOCKED** (until A / B1 / B2 / C closed; Gate D is never "in parallel" with A / B / C).
  - **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
  - **D-01..D-43 preserved**; **ADR Proposed — OWNER ACCEPTANCE REQUIRED**; no claim of Accepted or migrations ready.
  - **Historical verdict wording (rev. 4.2; SUPERSEDED BY REV 4.2 CLEANUP):** the rev. 4.2 framing "A.1–A.7 corrected/closed" is replaced by "CLEANUP / AUDIT PENDING".

- **Rev. 4.2 cleanup read-only follow-ups (replaces / supplements the rev. 4.2 follow-ups 51–56).** These items are the read-only follow-ups to the rev. 4.2 cleanup of the gap analysis and ADR-004. They do not change the release gate, do not commit, and do not push. They are scoped to documentation only. **SUPABASE UNCHANGED.**

  57. **Audit of the rev. 4.2 cleanup (Gap Analysis, gate for APPROVED).** An independent auditor reviews `docs/architecture/IDENTITY_ORGANIZATION_GAP_ANALYSIS.md` rev. 4.2 cleanup against the §20 acceptance criteria and the eleven residues. The current state is **READY FOR AUDIT (APPROVED pendiente auditoría)**. The audit closes the rev. 4.2 open residues: (1) D-15 canonical; (2) `created_by_profile_id` disjoint lists; (3) `organizations` no canonical `profile_id`; (4) 8-step transfer + exactly-one; (5) views / functions three real alternatives; (6) gates sequence A → B1 → C → B2 / D; (7) workflow "cleanup / audit pending" not "closed"; (8) `student_school_records` optional / deferred; (9) adapters / views rollback; (10) D-OD-4 operational; (11) D-01..D-43 intact.
  58. **Owner acceptance of ADR-004 (Gate A, rev. 4.2 cleanup).** The product owner reviews `docs/architecture/ADR/ADR-004-identity-organizations-and-resource-ownership.md` rev. 4.2 cleanup against the Gate A criteria (§15.A) and either accepts the ADR (status: Accepted) or returns it for further documentation. The Gate A criteria do not require D-OD-1, migrations authored, staging applied, runtime RLS or production. The status change is the owner's call; the rev. 4.2 cleanup does **not** auto-Accept.
  59. **Gate B1 (Core schema design) — READY AFTER OWNER ACCEPTANCE.** Open only after Gate A is cleared. B1 is documentary (no staging, no secrets, no runtime, no migrations, no backfill, no SQL, no Supabase).
  60. **Gate B2 (Core migration readiness) — BLOCKED.** Open only after Gate B1 is closed and the preconditions are met. B2.1 B1 closed; B2.2 staging project provisioned; B2.3 CI Node 22 result recorded; B2.4 surgical fixes merged; B2.5 Core migration plan authored / reviewed / audited with idempotent backfill, RLS impact, rollback, staging verification; B2.6 local tests green and critical fixes closed; B2.7 plan internally audited. **No Core migration is applied to any environment until Gate D is cleared.**
  61. **Gate C (Interactions schema-only) preparation.** Open only after Gate B1 is closed and D-OD-1 is decided. **D-OD-1 is the only decisional blocker for C** (decision). C.1 / C.2 / C.5 are preparation controls, not additional decisions. D-OD-2 / D-OD-3 are sub-decisions absorbed by D-OD-1. D-OD-6 / D-OD-7 are implementation / runtime notes, not independent gates. **D-OD-4 is an operational choice, not a Gate C blocker and not an independent blocker** (rev. 4.2 cleanup). **D-OD-5 may continue deferred for the company roles** (rev. 4.2 cleanup) and is only a Gate B concern.
  62. **Gate D (migraciones ejecutables) preparation.** Open only after Gate A, B1, B2 and C are closed. Gate D is **never** "in parallel" with A / B / C. Reconcile the baseline remote (D.5); run the design audit (D.6); define the backfill, the rollback and the staging verification (D.7); apply the migrations on the staging project; exercise the RLS runtime (D.8); authorize the production deployment (D.9); close the audit dictums (D.10). Runtime grants, fixtures and the RLS runtime verification are Gate D concerns, not Gate A, B1 or B2 concerns.

### Validations pending execution by the orchestrator only (rev. 4.2 cleanup)

The following three git commands are the **only** validations the orchestrator runs in this rev. 4.2 cleanup docs pass. The docs pass is documentation-only; no `npm`, no `test`, no `lint`, no `typecheck`, no `build`, no SQL, no Supabase call, no MCP mutation, no migration, no staging, no runtime grant, no fixture was executed in this docs pass. **No other validations are claimed.** The audit of the rev. 4.2 cleanup is the responsibility of the independent audit (Gap Analysis) and the product owner (ADR-004 Gate A acceptance); it is **not** claimed in this docs pass. The cleanup is in **CLEANUP / AUDIT PENDING** state, not "audited" or "closed".

```bash
git diff --check                                  # whitespace / conflict-marker clean
git status --short --branch                       # branch state, modified files, untracked files
git diff --stat                                   # diff size, additive references only
```

## Identity / Organizations / Resource Ownership — post-acceptance documentary gates (2026-08-05)

> **CANONICAL STATE — ADR-004 rev. 4.2 Accepted.** The owner acceptance and the approved gap analysis are recorded in ADR-004, `SESSION_LOG.md` and `DECISION_LOG.md`. The prior cleanup blocks remain historical traceability. B1 is READY / OPENED DOCUMENTALLY; B2, C and D remain blocked. This section authorizes no SQL, Supabase, runtime, migration, staging, production or implementation action. The documentary commit is still being prepared locally; publication is outside this task. SUPABASE UNCHANGED.

- **Current acceptance/versioning scope:** seven files, including `docs/workflow/DECISION_LOG.md`. Any six-file scope stated in the historical cleanup summary below is superseded.

- **Scope (historical pre-acceptance pass).** Apply **in-place corrections** to the canonical sections of the architecture docs (ADR-004 and the gap analysis) and update the four workflow docs. The previous rev. 4.2 cleanup block is preserved as historical; the **in-place corrections** are the canonical state going forward. The current acceptance/versioning scope is the seven-file set recorded at the top of this document. No code, no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration, no executable migration, no staging, no runtime grant, no fixture, no RLS predicate, no view, no grant is touched. No ROLE_MODEL.md, no DATA_MODEL.md, no AUTHORIZATION_MATRIX.md, no SECURITY_MODEL.md, no HANDOFF.md, no KNOWN_ISSUES.md is touched. **No validations are claimed in this pass.**

- **Canonical gate sequence (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING).** **A → B1 → C → B2 → D**. C is blocked **exclusively** by D-OD-1 as a decision. B2 is a prerequisite of D, **not** another decisional blocker of C. The "in parallel" / "in flight" wording is **HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP**. Gate D is never "in parallel" with A, B1, B2 or C. **D-OD-4 is an operational choice, not a Gate C / Gate A criterion, and not an independent blocker**. **D-OD-5 is deferred for the company roles and is only a Gate B concern, not a Gate A criterion**.

- **Active state (ADR-004 rev. 4.2 Accepted, canonical).**
  - **FASE 0 COMPLETE**.
  - **GAP ANALYSIS APPROVED**; companion ADR **Accepted**.
  - **ADR-004 rev. 4.2 Accepted** (owner acceptance completed 2026-08-05).
  - **OWNER ACCEPTANCE COMPLETED**.
  - **CORE SCHEMA DESIGN (Gate B1) — READY / OPENED DOCUMENTALLY**. B1 is not implemented.
  - **CORE MIGRATION READINESS (Gate B2) — BLOCKED**. B2 is a prerequisite of any migration.
  - **PUBLISHING READY WITH DEFERRED ITEMS** (documentary).
  - **INTERACTIONS BLOCKED exclusively D-OD-1** (Gate C is blocked exclusively by D-OD-1 as a decision; C.1 / C.2 / C.5 are preparation controls, not additional decisions).
  - **GATE D MIGRATIONS: BLOCKED** (until A / B1 / B2 / C closed; Gate D is never "in parallel" with A, B1, B2 or C).
  - **MIGRATIONS BLOCKED** / **IMPLEMENTATION BLOCKED** / **SUPABASE UNCHANGED**.
  - **D-01..D-43 fixed and preserved**; **D-OD-1..D-OD-7 deferred and open**; no claim of migrations ready.

- **Post-acceptance documentary follow-ups (the former REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING label is historical pre-acceptance).** The follow-ups are read-only and do not change the release gate, do not commit, and do not push. They are scoped to documentation only; no migration, no SQL, no policy, no server action, no component, no test, no dependency, no lockfile, no MCP mutation, no Supabase mutation, no schema-only migration and no executable migration is touched. **SUPABASE UNCHANGED.**

  63. **Acceptance and documentary audit record.** The gap analysis is **APPROVED** and ADR-004 rev. 4.2 is **Accepted**. The eleven residue corrections are recorded in the architecture documents; no runtime, SQL, Supabase, migration or implementation validation is implied.
  64. **B1 documentary design.** Update the architectural contracts and design the B1 package. Keep B2, C and D blocked; C remains blocked exclusively by D-OD-1.
  65. **Gate B1 (Core schema design) — READY / OPENED DOCUMENTALLY.** B1 is documentary and is open after the accepted ADR; it is not implemented (no staging, no secrets, no runtime, no migrations, no backfill, no SQL, no Supabase).
  66. **Gate B2 (Core migration readiness) — BLOCKED.** Open only after Gate B1 is closed and the preconditions are met. B2.1 B1 closed; B2.2 staging project provisioned; B2.3 CI Node 22 result recorded; B2.4 surgical fixes merged; B2.5 Core migration plan authored / reviewed / audited with idempotent backfill, RLS impact, rollback, staging verification; B2.6 local tests green and critical fixes closed; B2.7 plan internally audited. **B2 is a prerequisite of D, NOT a decisional blocker of C** (rev. 4.2 final cleanup; the "in flight in parallel" wording is HISTORICAL — SUPERSEDED BY REV 4.2 FINAL DOCUMENTARY CLEANUP). **No Core migration is applied to any environment until Gate D is cleared.**
  67. **Gate C (Interactions schema-only) preparation.** Open only after Gate B1 is closed and D-OD-1 is decided. **D-OD-1 is the only decisional blocker for C** (decision). C.1 / C.2 / C.5 are preparation controls, not additional decisions. D-OD-2 / D-OD-3 are sub-decisions absorbed by D-OD-1. D-OD-6 / D-OD-7 are implementation / runtime notes, not independent gates. **D-OD-4 is an operational choice, not a Gate C blocker and not an independent blocker** (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING). **D-OD-5 is deferred for the company roles and is only a Gate B concern, not a Gate A criterion** (REV 4.2 FINAL DOCUMENTARY CLEANUP / AUDIT PENDING).
  68. **Gate D (migraciones ejecutables) preparation.** Open only after Gate A, B1, B2 and C are closed. Gate D is **never** "in parallel" with A, B1, B2 or C. Reconcile the baseline remote (D.5); run the design audit (D.6); define the backfill, the rollback and the staging verification (D.7); apply the migrations on the staging project; exercise the RLS runtime (D.8); authorize the production deployment (D.9); close the audit dictums (D.10). Runtime grants, fixtures and the RLS runtime verification are Gate D concerns, not Gate A, B1 or B2 concerns.

### Validations pending execution by the orchestrator only (accepted documentary state)

This documentary pass runs no `npm`, tests, lint, typecheck, build, SQL, Supabase, migration, staging, runtime or implementation validation. The acceptance and approved documentary state are recorded in ADR-004, `SESSION_LOG.md` and `DECISION_LOG.md`.

```bash
git diff --check                                  # whitespace / conflict-marker clean
git status --short --branch                       # branch state, modified files, untracked files
git diff --stat                                   # diff size, additive references only
```
