# ADR-002: External Is a First-Class Account Type

- Status: Proposed in Phase 0
- Date: 2026-07-26

## Context

The current product has no external client account. Anonymous visitors and organizations are the only supported registration concepts, while the target product needs individuals and small businesses to publish simple freelance requests without company ATS permissions.

## Decision

Add `external` as a first-class account type with an `external_profiles` record and verified-email requirement before publishing. External accounts may create, edit, close and receive proposals for `freelance` opportunities only.

## Consequences

- Login remains shared and role selection is removed from login.
- External permissions are separate from company and school permissions.
- Anonymous users remain read-only.
- A common opportunity model must enforce publisher type in both server actions and RLS.
