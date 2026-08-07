# Traceability Matrix

- **Verdict:** TRACEABILITY **APPROVED**.
- **Authority:** ADR-004 rev. 4.2 and the functional/non-functional requirements. Current evidence is not presented as proof that the conceptual target has been implemented.
- **B1:** documentary design **READY / APPROVED**. **B2, C and D:** blocked as stated below. **Supabase:** unchanged.

| ID | Requirement traced | Documentary source / current-vs-target evidence | Verdict |
| --- | --- | --- | --- |
| R-01 | Profiles contain human persons only. | `ROLE_MODEL.md`; ADR D-01. | Approved |
| R-02 | School and company organizations do not authenticate. | `ROLE_MODEL.md`; ADR D-02. | Approved |
| R-03 | Active memberships authorize action for an organization. | `AUTHORIZATION_MATRIX.md`; ADR D-07. | Approved |
| R-04 | `account_type` is used for routing and onboarding, not capability. | `ROLE_MODEL.md`; ADR D-08. | Approved |
| R-05 | Legacy `profiles.role` is display-only. | `ROLE_MODEL.md`; ADR D-09. | Approved |
| R-06 | `graduated` is a student stage and preserves the student identity. | `ROLE_MODEL.md`; ADR D-10. | Approved |
| R-07 | `student_enrollments` is canonical for live enrollment and history. | `DATA_MODEL.md`; ADR D-15. | Approved |
| R-08 | `student_profiles.school_id` is a compatibility/derivable adapter, not authorization. | `DATA_MODEL.md`; ADR D-16. | Approved |
| R-09 | External is a personal baseline with no organization membership or organization ID. | `ROLE_MODEL.md` and `DATA_MODEL.md`; ADR D-11..D-14. | Approved |
| R-10 | Evidence belongs to the student; school validation is institutional. | `DATA_MODEL.md`, `AUTHORIZATION_MATRIX.md`; ADR D-18/D-19. | Approved |
| R-11 | School context mediates or validates and is not an implicit resource owner. | `DATA_MODEL.md`, `AUTHORIZATION_MATRIX.md`; ADR D-37/D-38. | Approved |
| R-12 | Posts are editorial; actor and organization owner are separate. | `DATA_MODEL.md`; ADR D-20..D-25. | Approved |
| R-13 | One opportunity model uses `job`, `internship`, `company_project`, `freelance_request`. | `DATA_MODEL.md`; ADR D-26/D-27. | Approved |
| R-14 | Companies publish corporate types, External publishes `freelance_request`, schools never publish opportunities. | `DATA_MODEL.md`, `AUTHORIZATION_MATRIX.md`; ADR D-28..D-30. | Approved |
| R-15 | Ownership uses exactly one personal/organizational side and is derived server-side. | `DATA_MODEL.md`, `AUTHORIZATION_MATRIX.md`; ADR D-31..D-33. | Approved |
| R-16 | `created_by_profile_id` is audit-only and disjoint from authorization. | `AUTHORIZATION_MATRIX.md`, `SECURITY_MODEL.md`; ADR D-39..D-41. | Approved |
| R-17 | Active organizations have exactly one active owner, with atomic conceptual transfer. | `DATA_MODEL.md`, `SECURITY_MODEL.md`; ADR I-18. | Approved |
| R-18 | Applications and proposals are conceptually separated by opportunity type. | `DATA_MODEL.md`; ADR D-34..D-36. | Approved |
| R-19 | Physical applications/proposals design is pending D-OD-1; it is the exclusive blocker for C. | `DATA_MODEL.md`, `TARGET_ARCHITECTURE.md`; ADR §15.C. | C blocked exclusively D-OD-1 |
| R-20 | Minor contact is school-mediated and cannot be bypassed by External. | `SECURITY_MODEL.md`, `AUTHORIZATION_MATRIX.md`; ADR D-37/D-38. | Approved, runtime deferred |
| R-21 | Structural changes use expand/transition/contract with reversible adapters and preserved history. | `DATA_MODEL.md`, `TARGET_ARCHITECTURE.md`; ADR §§10-12. | Approved conceptually |
| R-22 | Public access uses exactly six allowlisted projections without internal IDs or sensitive fields. | `SECURITY_MODEL.md`; ADR I-20. | Approved conceptually |
| R-23 | Authorization sources are explicit and audit sources are separate. | `AUTHORIZATION_MATRIX.md`, `SECURITY_MODEL.md`; ADR I-15/I-19. | Approved |
| R-24 | Verdicts are ROLE/DATA/AUTHORIZATION/SECURITY/TRACEABILITY APPROVED; B1 READY/APPROVED; B2/C/D blocked. | All five target documents; ADR gate sequence A → B1 → C → B2 → D. | Approved |
| R-25 | Documentation preserves current/target distinction and claims no executable SQL, code, migration or Supabase change. | All five architecture documents and this matrix. | Approved; Supabase unchanged |

## Existing Product Requirement Links

| Product requirements | Traceable contract |
| --- | --- |
| FR-001..FR-006 | R-01..R-06: four account types, server resolution, onboarding and anonymous read-only access. |
| FR-010..FR-014 | R-07..R-11 and R-22: profile evidence, school validation and privacy projections. |
| FR-020..FR-022 | R-02, R-03, R-07, R-10 and R-11: institution isolation and membership authority. |
| FR-030..FR-036 | R-13..R-19: opportunity types, ownership, uniqueness, readiness and audit lifecycle. |
| FR-040..FR-043 | R-20 and R-23: permitted communication, minor mediation and actor/owner/context boundaries. |
| NFR-001..NFR-006 | R-15, R-16, R-22 and R-23: server-side authorization, least privilege and projection allowlists. |
| NFR-010..NFR-013 | R-07..R-11, R-20 and R-22: relationship-scoped privacy and non-public sensitive data. |
| NFR-020..NFR-042 | R-21, R-24 and R-25: staged migration discipline, maintainability and explicit non-implementation posture. |

## Gate Status

| Gate | Status | Meaning |
| --- | --- | --- |
| B1 Core schema design | **READY / APPROVED** | Documentary contracts are complete; no staging, SQL, runtime, migration or Supabase action. |
| B2 Core migration readiness | **BLOCKED** | Preconditions, baseline, staging, backfill, rollback, audit and verification remain required. |
| C Interactions design | **BLOCKED exclusively by D-OD-1** | No alternative is selected for the physical applications/proposals shape. |
| D Executable migrations | **BLOCKED** | Requires prior gates, audited plans, staging runtime verification and explicit authorization. |
