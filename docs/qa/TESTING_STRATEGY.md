# Testing Strategy

## Current Baseline

The project currently relies on lint, TypeScript and manual smoke checks. Automated tests should be added around the highest-risk domain logic first.

## Priority Test Areas

- Matching score and future explanation factors.
- Application readiness checks.
- Supabase authorization-sensitive API routes.
- Profile evidence and validation flows.

## Suggested Tooling

- Unit tests for pure utilities.
- Component tests for critical UI state transitions.
- Lightweight integration checks for API routes where feasible.
- CI running lint, typecheck and build before merge.
