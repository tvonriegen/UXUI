# Refactoring Plan

## Phase 1: Stabilize Structure

- Keep `apps/web`, `supabase`, `docs` and `scripts` as top-level boundaries.
- Avoid broad feature changes during structural cleanup.
- Keep commits small and reversible.

## Phase 2: Extract Domain Modules

- Extract matching utilities and explanation data structures.
- Extract profile evidence components from `profile/page.tsx`.
- Extract jobs/application readiness components from `empleos/page.tsx`.
- Extract school administration flows from `administracion/page.tsx`.

## Phase 3: Add Safety Nets

- Add unit tests for pure matching logic.
- Add integration checks for protected API routes.
- Add CI for lint, typecheck and build.
