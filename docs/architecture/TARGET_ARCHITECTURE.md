# Target Architecture

- **Verdict:** documentary target **APPROVED** and aligned with ADR-004 rev. 4.2.
- **Boundary:** this is a conceptual target. It does not authorize code, SQL, migrations, runtime RLS, staging or Supabase changes.

## Current Architecture

TalentHub is one Next.js application in `apps/web` backed by Supabase. Routes and server actions currently span four persona areas, legacy compatibility routes and shared services. The live data model still contains physical school/company adapters, legacy role reads, legacy opportunity tables and split application/proposal tables. Those facts remain current-state evidence and are not silently presented as the target.

## Target Boundaries

- `src/app`: route entry points and server actions that resolve the authenticated human, account status, membership, enrollment, ownership and resource state.
- `src/components`: presentation and domain UI; client navigation never authorizes an operation.
- `src/lib`: Supabase clients, domain types, validation, matching, readiness, privacy predicates and shared authorization helpers.
- `src/features`: future extraction boundary for larger domains without introducing a second app prematurely.
- `supabase`: executable database source in a future implementation phase; this document makes no database change.

## Target Domain Model

1. **Identity:** humans in `profiles`; four account types; `account_type` routes/onboards only; legacy `role` is display-only.
2. **Organizations:** school and company organizations do not authenticate. Active memberships authorize human actions on their behalf. External remains personal.
3. **Academic context:** `student_enrollments` is the canonical live + history relation. `student_profiles.school_id` is one compatibility adapter and never a new authorization source.
4. **Evidence:** the student owns evidence; school membership and enrollment context authorize institutional validation.
5. **Publishing:** one opportunity model with `job`, `internship`, `company_project` and `freelance_request`; companies publish the first three, External publishes the last, and schools never publish opportunities.
6. **Editorial content:** posts remain separate from opportunities, applications and proposals. The human author is an actor; organization ownership is independent.
7. **Applications:** applications and proposals remain conceptually disjoint by opportunity type. Their physical consolidation or split is pending D-OD-1.
8. **Privacy:** minor contact is explicit, scoped, revocable/expirable when the deferred contract is adopted, and school-mediated.

## Data and Authorization Flow

The request enters through a server route or action. The server resolves `auth.uid()`, account status and account type for routing. Capability then comes from active membership, resource ownership, current enrollment, resource type/status, explicit contact authorization and domain relationships. Ownership columns are derived server-side; clients do not choose organization IDs or publisher types. Database RLS repeats the same decisions. `created_by_profile_id` is written as audit only and never participates in authorization.

Public pages call an allowlisted projection surface with exactly six conceptual public projections. Authenticated projections use the minimum view/base grants and RLS needed for the surface. Internal compatibility projections use the same allowlist discipline. No complete profile row is exposed.

## Transition Architecture

Every structural transition follows expand / transition / contract:

- **Expand:** add canonical structures beside physical adapters; preserve legacy IDs, mappings and reads.
- **Transition:** centralize synchronization, reconcile counts and checksums, move one consumer at a time, and keep adapters observable.
- **Contract:** retire adapters, views and legacy values only after consumers, inbound foreign keys, policies and RLS are migrated and verified; contract is forward-only and non-destructive.

Rollback restores the physical adapter, mappings and previous reads while preserving enrollment history. It is conceptual here, not executable SQL.

## Gate Verdicts

ROLE / DATA / AUTHORIZATION / SECURITY / TRACEABILITY: **APPROVED**. B1 documentary design: **READY / APPROVED**. B2: **BLOCKED**. C: **BLOCKED exclusively by D-OD-1**. D: **BLOCKED**. Migrations, implementation and Supabase remain unchanged.
