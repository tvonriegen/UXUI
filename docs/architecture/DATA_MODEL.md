# Data Model

- **Verdict:** DATA **APPROVED**.
- **Authority:** ADR-004 rev. 4.2. This is a documentary contract, not executable schema.
- **Status boundary:** current structures and conceptual target are intentionally separated below.

## Audited Current State

The current model has a wide human `profiles` table, legacy `role` values, student and company extensions, school-specific tables, a canonical `opportunities` table, legacy opportunity tables, separate corporate applications and freelance proposals, evidence and validation records, posts, contact requests, interviews and messaging. `student_enrollments` and generic organization memberships are not yet the target structures in the live baseline.

`schools`, `school_members` and `company_profiles` remain physical compatibility structures during transition. `external_profiles` is a personal extension with no organization link. `job_postings` and `internship_requests` remain legacy or temporal workflows linked through reversible mappings where applicable.

## Conceptual Target Entities

| Entity | Contract |
| --- | --- |
| `profiles` | Human identity, `account_type`, lifecycle and safe identity fields. |
| `student_profiles` | Student-owned profile, stage, skills, evidence relationship and privacy settings. `school_id` is an adapter only. |
| `organizations` | School/company organization with no canonical `profile_id`. |
| `organization_memberships` | Person-to-organization authority, role and membership status. |
| `student_enrollments` | Canonical student-school relation, both live and historical. |
| `external_profiles` | Personal External baseline; no `organization_id`. |
| `opportunities` | One model with typed publication and ownership. |
| `applications` / proposals | Conceptual surfaces owned by the student and addressed to an opportunity; physical shape pending D-OD-1. |
| Evidence and validation | Evidence belongs to the student; school validation is a separate institutional action. |
| Posts | Editorial resources, separate from applications and proposals. |

### Enrollments and School Adapters

The conceptual `student_enrollments` relation contains `student_profile_id`, `school_organization_id`, `status`, `is_primary`, start/end dates and audit timestamps. Initial statuses are `pending | active | completed | transferred | withdrawn`.

- A row with `status = active` represents a live enrollment; other rows preserve history.
- At most one primary active enrollment exists per student; historical rows remain allowed.
- The current school and minor mediator are derived from the primary active enrollment.
- `student_profiles.school_id` is a compatibility, temporal, derivable adapter and source-of-read during transition, never canonical authorization.
- No new policy or server action consults `student_profiles.school_id` for authorization. `profiles.school_id` is legacy and non-authoritative.

### Organizations, Memberships and Evidence

The canonical organization row has no human `profile_id`. The human relationship exists only in `organization_memberships`. Physical `schools.profile_id` and `company_profiles.profile_id` are legacy adapter columns during compatibility, not `organizations.profile_id`.

The student owns evidence. A school owns neither the student profile nor the evidence; an active authorized school membership permits validation of linked students and records the validating institution and actor. `school_id` in evidence, institutional workflows and minor contact is context, validation or mediation as applicable, not an implicit owner.

### Posts, Opportunities and Ownership

Posts are editorial. `author_profile_id` is the required human actor and does not participate in ownership XOR. A null `organization_id` is a personal post; a set `organization_id` is an organizational post whose actor is membership-gated. A post link to an opportunity is not an application or proposal.

`opportunities` is one canonical model with `opportunity_type` values `job | internship | company_project | freelance_request`. The legacy `freelance` value is renamed through expand / transition / contract. Companies publish the first three types. External persons publish only `freelance_request`. Schools are contextual organizations and never publishers of any opportunity type.

For resources with personal and organizational ownership, exactly one owner side is set: `*_organization_id XOR *_profile_id`. The server derives the owner from the session and active membership; clients never submit either ownership foreign key. Both-null and both-set states are invalid. `created_by_profile_id` records the human actor only and is never ownership.

An active organization has exactly one active owner membership: at-most-one plus at-least-one, with only brief atomic transfer or controlled recovery exceptions. The conceptual transfer is eight steps: lock organization and memberships; verify current owner; verify successor; create or activate successor without owner role; neutralize the prior owner; promote successor; record the audit event; verify exactly one owner before commit. Suspension does not auto-promote, and revocation requires transfer or organization suspension.

### Applications and Proposals

The approved conceptual contract is disjoint: corporate `job`, `internship` and `company_project` use applications; `freelance_request` uses proposals. The student owns the submission and the opportunity is the destination. Posts are neither. The physical alternative, naming, IDs and audit-column implementation remain pending D-OD-1. D-OD-1 is the exclusive decisional blocker for C.

## Compatibility and Rollback Direction

Every future structural step uses expand / transition / contract: additive expansion, centralized transition with observable reconciliation, then forward-only non-destructive contract after consumers, foreign keys, policies and RLS are verified. Legacy physical adapters are retained during expand; mappings and enrollment history remain verifiable. Adapter retirement and view conversion occur only after consumers and inbound foreign keys move. Rollback restores the adapter, mappings and previous reads without discarding enrollment history. This document contains no executable SQL.

## Gate Posture

DATA **APPROVED**. B1 documentary design is **READY / APPROVED**. B2 is **BLOCKED**; C is **BLOCKED exclusively by D-OD-1**; D is **BLOCKED**. Supabase is unchanged.
