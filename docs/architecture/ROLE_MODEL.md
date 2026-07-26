# Canonical Role Model

## Decision

The canonical account types are `student`, `company`, `school` and `external`. `Egresado` is not an account type or an authorization role. It is a value of `student_stage` in the student profile.

```text
profiles.account_type: student | company | school | external
student_profiles.student_stage: enrolled | internship | graduated
school_members.member_role: owner | admin | teacher | reviewer
```

## Identity and profile separation

- `profiles` owns identity, account type, lifecycle status, email and safe display fields.
- `student_profiles` owns school link, academic stage, professional data, age-aware attributes and public visibility.
- `company_profiles` owns company information and verification state.
- `schools` owns institution identity and status.
- `school_members` owns institution membership and authorization role.
- `external_profiles` owns the basic client profile and verification state.

The existing `profiles.role` and role-specific nullable columns are legacy compatibility data. They remain readable during migration but must not become the long-term authorization source.

## Authorization rules

- A session does not select its role. The server resolves `account_type` from the database.
- Student stage never changes the account type or creates a second identity.
- School access requires active membership in the target school.
- Company and external ownership are resource-scoped, not inferred from a client-supplied type.
- A school member may only exercise permissions granted by `member_role`.
- Disabled, unverified or pending accounts do not receive normal dashboard access.

## Compatibility transition

1. Inventory and reconcile legacy `profiles.role` values.
2. Add canonical account columns and mapping constraints without deleting legacy data.
3. Backfill students as `account_type = student`; map `Egresado` to `student_stage = graduated`.
4. Create explicit school and organization records/memberships.
5. Move server guards and RLS to canonical columns.
6. Remove legacy role reads only after runtime and staging verification.
