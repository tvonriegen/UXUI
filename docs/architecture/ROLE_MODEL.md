# Canonical Role Model

- **Verdict:** ROLE **APPROVED**.
- **Authority:** ADR-004 rev. 4.2, accepted 2026-08-05.
- **Scope:** this document distinguishes the audited current state from the conceptual target. It authorizes no code, SQL, migration, runtime policy or Supabase change.

## Identity Contract

`profiles` represents human persons only. It is not an organization table. The four account types are `student`, `company`, `school` and `external`. `graduated` is a `student_stage`, not a persona, role or second identity.

| Field | Contract |
| --- | --- |
| `profiles.account_type` | `student | company | school | external`; used for routing and onboarding only. |
| `profiles.account_status` | Lifecycle eligibility; inactive states do not receive normal protected access. |
| `student_profiles.student_stage` | `enrolled | internship | graduated`; a graduated person remains a student. |
| `profiles.role` | Legacy display label only; never a future authorization source. `Egresado` is a display alias for `graduated`. |

Organizations of kind `school` or `company` do not authenticate. They have no `auth.users` identity and no organization row in `profiles`. A human account authenticates and acts for an organization only through an active organization membership. No shared credentials are permitted.

## Current State

- `profiles` currently combines identity, account metadata and some legacy role-specific fields.
- `schools`, `school_members` and `company_profiles` are physical compatibility structures. Their legacy person back-references are not the conceptual organization authority.
- `external_profiles` is already a personal extension and has no organization baseline.
- Some legacy guards still read `role` or account type. Those reads are transitional evidence, not the target contract.

## Conceptual Target

- `profiles` owns the person and account lifecycle.
- `student_profiles` owns the student's profile, academic stage, evidence relationship and privacy settings. The school does not own the student profile.
- `organizations` represents schools and companies without a canonical `profile_id`.
- `organization_memberships` is the authority for acting on behalf of an organization. School roles are `owner | admin | teacher | reviewer`; company roles remain deferred under D-OD-5.
- `external_profiles` remains personal, with no `organization_id` and no organization membership.

The server resolves the account from the authenticated session and trusted database metadata. A client cannot choose a role, publisher type, organization ID or authorization scope. Account type may select the initial route and onboarding flow, but membership, ownership, resource state, enrollment and domain relationships decide capability.

## Compatibility Direction

The transition retains legacy role labels and physical adapters while consumers are inventoried. Students remain `account_type = student`; `Egresado` maps to `student_stage = graduated`. New authorization sources move to active memberships and resource ownership. Legacy role reads are retired only after the staged verification required by ADR-004.

## Gate Posture

ROLE **APPROVED**. B1 documentary design is **READY / APPROVED**. B2 is **BLOCKED**; C is **BLOCKED exclusively by D-OD-1**; D is **BLOCKED**. Supabase is unchanged.
