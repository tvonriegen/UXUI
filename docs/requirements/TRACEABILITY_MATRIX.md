# Traceability Matrix

| Pillar | Requirement | Current Evidence | Status |
| --- | --- | --- | --- |
| Explainable compatibility | FR-022 | `apps/web/src/lib/utils/matching.ts` | Delivered with score factors and parity verification. |
| Explainable compatibility | FR-023 | `MatchExplanationPanel.tsx` on jobs surfaces | Delivered with transparent guidance and factor breakdown. |
| Verified student profile | FR-010 | `apps/web/src/app/profile/page.tsx` and evidence tables | Existing capability; modularization remains pending. |
| Verified student profile | FR-011 | School dashboards, badges and validation flows | Existing capability; broader audit trail tests remain pending. |
| Assisted application | FR-030 | `application-readiness.ts` and `ApplicationReadinessPanel.tsx` | Delivered with hard blockers and non-blocking recommendations. |
| Assisted application | FR-031 | Readiness recommendations for profile, skills and evidence | Delivered and covered by 15 canonical cases. |
| Assisted application | FR-032 | ATS timeline and application status flows | Delivered; runtime database verification remains pending. |
| Privacy and mediation | FR-041 | Contact-request migrations, `can_converse`, interview RLS, status trigger and server actions | Delivered locally and integrated into `main`; Supabase staging smoke test pending. |
