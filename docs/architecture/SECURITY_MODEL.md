# Security Model

- **Verdict:** SECURITY **APPROVED**.
- **Authority:** ADR-004 rev. 4.2. This document records security posture and conceptual controls only.

## Current Controls

- Browser code receives only publishable Supabase configuration; service-role credentials remain server-only and are never exposed through public environment names.
- SSR and browser clients are separated, security headers are configured, and seed access is restricted outside local development.
- Current RLS and server actions are the audited baseline. Any remaining legacy `role`, direct `school_id` or admin-client behavior is transitional evidence, not the target authority.

## Canonical Authorization

Protected operations must derive authorization from `auth.uid()`, account status, active memberships, resource ownership, current primary active enrollment, resource status/type, explicit contact authorization and domain relationships. `account_type` routes and onboards only. Client-provided roles, organization IDs and publisher types are never trusted.

`created_by_profile_id` is audit-only. It records who initiated a write and is disjoint from the authorization source list. It cannot grant access after membership loss and cannot revoke the organization's ownership. Audit events remain immutable and attributable.

## Privacy and Minor Mediation

- Student profiles expose only the approved public projection; exact age, direct contact data, RUT, private evidence, institutional notes and internal enrollment identifiers remain non-public.
- Evidence belongs to the student. School validation requires linked student context and an active authorized school membership.
- A minor's current mediator is derived from the primary active enrollment. Company-to-minor contact requires explicit, scoped, school-mediated authorization. External accounts cannot bypass mediation or enter corporate ATS flows.
- Existing conversation history may remain visible to participants, but new contact or messages are blocked until the required authorization is approved. Pending minor requests are not exposed to the minor. Notifications do not create a new contact channel; payload/link redaction remains a deferred decision.

## Projection Security

The public surface is an allowlist, never a complete profile read. The conceptual public projection set is exactly six rows:

| Projection | Safe purpose | Conceptual security mode |
| --- | --- | --- |
| `public_student_profile` | Public student discovery | Controlled `SECURITY DEFINER` function with fixed path, structured allowlist and minimum execute grant. |
| `public_company_profile` | Public company discovery | Same controlled function pattern. |
| `public_school_profile` | Public school discovery | Same controlled function pattern. |
| `public_opportunity` | Public open opportunity | Same controlled function pattern. |
| `public_post` | Public editorial content | Same controlled function pattern. |
| `public_freelance_request` | Public External request | Same controlled function pattern. |

Internal foreign keys such as `profile_id` and `organization_id` are excluded from public output. Sensitive fields are excluded by allowlist. No `SELECT *` is permitted.

There are three real projection alternatives, not a "security_definer view":

1. An authenticated `security_invoker = true` view with minimum grants on the view and required base columns plus RLS.
2. An owner-behavior view using a dedicated role without `BYPASSRLS`, an allowlist, minimum grants and no app-user mutability.
3. A controlled `SECURITY DEFINER` function with fixed search path, structured allowlisted output, minimum execute access and audit.

Public projections prefer the third pattern. Authenticated and compatibility projections prefer the first. Runtime grants, RLS execution and staging verification are Gate D concerns.

## Structural Safety

Organization ownership uses exactly-one active owner semantics: at-most-one and at-least-one, with an atomic eight-step transfer and no auto-promotion on suspension. Ownership XOR prevents both personal and organizational owners from being set or omitted. Expand / transition / contract preserves adapters, mappings, legacy IDs and enrollment history until verification permits contract.

## Gate Posture

B1 documentary design is **READY / APPROVED**. B2 is **BLOCKED**. C is **BLOCKED exclusively by D-OD-1**. D is **BLOCKED**. No executable SQL, policy, migration, staging action or Supabase mutation is claimed; Supabase is unchanged.
