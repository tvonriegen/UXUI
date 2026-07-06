# Traceability Matrix

| Pillar | Requirement | Current Evidence | Gap |
| --- | --- | --- | --- |
| Explainable compatibility | FR-022 | `apps/web/src/lib/utils/matching.ts` | Score exists, explanation needs productized UI and persisted factors. |
| Explainable compatibility | FR-023 | Talent and jobs pages | Need pre-application explanation panel. |
| Verified student profile | FR-010 | `apps/web/src/app/profile/page.tsx` | Profile is large and needs modular evidence model. |
| Verified student profile | FR-011 | Admin and badge flows | Validation needs audit trail documentation and tests. |
| Assisted application | FR-030 | Jobs/profile data available | Missing readiness checklist before apply. |
| Assisted application | FR-032 | ATS timeline components | Needs consistent source of truth in database docs. |
| Privacy and mediation | FR-041 | `supabase/migrations/20260705000001_contact_requests.sql`, `apps/web/src/app/actions/contact-requests.ts`, `apps/web/src/app/actions/interviews.ts`, `apps/web/src/app/talent/page.tsx`, `apps/web/src/components/dashboard/DashboardColegio.tsx`, `scripts/verify-is-minor.mjs` | PR 1 implements DB/RLS contact mediation for minor students. Local validation passed (2026-07-05: `verify:is-minor` 7/7, lint, typecheck, build with no dummy env). Security review verdict after the B1 / M1 fixes: APROBAR, no BLOCKER / HIGH. Runtime Supabase migration / RLS / trigger smoke test on a live instance is a recommended follow-up before merge / deploy, not a blocker. |
| Refactor enabler (technical) | n/a (PR 2) | `docs/architecture/PR2_FEATURE_BOUNDARIES.md`, `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, `docs/workflow/PR_TRACKER.md` (PR 2 row) | PR 2 (`refactor/feature-boundaries`, stacked on `fix/privacy-contact-routing`) decomposes the high-risk feature pages surfaced by the PR 1 architecture review into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable. **Technical enabler; no functional requirement change.** Architecture only in this pass; implementation gated on the test mechanism decision (`OPEN_QUESTIONS.md` Q17). ProfilePage deep split is explicitly deferred to a dedicated PR (PR 3 or later). |
