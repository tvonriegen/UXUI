# Roadmap

## Historical baseline

- [x] Explainable matching factors.
- [x] Verified profile evidence and audit trail.
- [x] Assisted application readiness and timeline continuity.
- [x] Contact mediation and interview transition hardening.
- [x] Local CI baseline for verifiers, lint, typecheck and build.

## Four-persona restructuring

- [x] Phase 0: audit, contracts, route map, authorization matrix, ADRs and migration plan.
- [x] Phase 1: canonical identity, student stage, external profile, school memberships, server guards and initial RLS.
- [x] Phase 2: public, student, company, school and external layouts/navigation foundation.
- [ ] Phase 3: student space migration.
- [ ] Phase 4: school space migration.
- [ ] Phase 5: company space migration.
- [x] Phase 6: initial external and public experience.
- [x] Phase 7: initial common opportunities and application migration.
- [ ] Phase 8: runtime RLS, E2E, accessibility, mobile and deployment hardening.

## Gate policy

Do not start a later phase while the previous phase has failing validation, unresolved data mapping or an unrecorded security risk. The Phase 0 verdict was `APROBAR CON OBSERVACIONES`. Phases 1, 2, 6 and 7 have initial implementations; phases 3, 4 and 5 still require extraction from legacy surfaces, and Phase 8 remains the release gate.
