# Traceability Matrix

| Pillar | Requirement | Current Evidence | Gap |
| --- | --- | --- | --- |
| Explainable compatibility | FR-022 | `apps/web/src/lib/utils/matching.ts` | Score exists, explanation needs productized UI and persisted factors. |
| Explainable compatibility | FR-023 | Talent and jobs pages | Need pre-application explanation panel. |
| Verified student profile | FR-010 | `apps/web/src/app/profile/page.tsx` | Profile is large and needs modular evidence model. |
| Verified student profile | FR-011 | Admin and badge flows | Validation needs audit trail documentation and tests. |
| Assisted application | FR-030 | Jobs/profile data available | Missing readiness checklist before apply. |
| Assisted application | FR-032 | ATS timeline components | Needs consistent source of truth in database docs. |
| Privacy and mediation | FR-041 | `supabase/migrations/20260705000001_contact_requests.sql`, `supabase/migrations/20260705000002_interviews_privacy_rls.sql`, `apps/web/src/app/actions/contact-requests.ts`, `apps/web/src/app/actions/interviews.ts`, `apps/web/src/app/talent/page.tsx`, `apps/web/src/components/dashboard/DashboardColegio.tsx`, `scripts/verify-is-minor.mjs`, `scripts/verify-interviews-privacy-rls.mjs` | PR 1 implements DB/RLS contact mediation for minor students; PR 1B hardens `interviews_insert_company` against direct-insert bypass and adds UPDATE integrity trigger. Local validation passed (2026-07-05: `npm ci --prefix apps/web` passed with 21 baseline vulnerabilities, `verify:is-minor` 7/7, `verify:interviews-privacy-rls` passed, lint, typecheck, build with no dummy env values read/displayed). Security review verdict after the B1 / M1 fixes: APROBAR, no BLOCKER / HIGH. Runtime Supabase migration / RLS / trigger smoke test on a live staging instance is pending and was not performed in this pass; no remote Supabase instance was exercised. |
