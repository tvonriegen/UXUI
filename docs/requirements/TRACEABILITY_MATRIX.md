# Traceability Matrix

| Pillar | Requirement | Current Evidence | Status |
| --- | --- | --- | --- |
| Explainable compatibility | FR-022 | `apps/web/src/lib/utils/matching.ts` | Delivered with score factors and parity verification. |
| Explainable compatibility | FR-023 | `MatchExplanationPanel.tsx` on jobs surfaces | Delivered with transparent guidance and factor breakdown. |
| Verified student profile | FR-010 | `apps/web/src/app/profile/page.tsx` and evidence tables | Existing capability; modularization remains pending. |
| Verified student profile | FR-011 | `profile_evidence`, school review panel and immutable evidence events | Delivered locally and in Supabase; authenticated runtime fixtures remain pending. |
| Verified student profile | FR-012 | Profile evidence statuses, completeness guidance and role-scoped reads | Delivered with verified/pending/rejected states and school ownership checks. |
| Assisted application | FR-030 | `application-readiness.ts` and `ApplicationReadinessPanel.tsx` | Delivered with hard blockers and non-blocking recommendations. |
| Assisted application | FR-031 | Readiness recommendations for profile, skills and evidence | Delivered and covered by 15 canonical cases. |
| Assisted application | FR-032 | ATS timeline and application status flows | Delivered; runtime database verification remains pending. |
| Privacy and mediation | FR-041 | Contact-request migrations, `can_converse`, interview RLS, status trigger and server actions | Schema and policies applied to Supabase; authenticated staging smoke test remains pending. |
