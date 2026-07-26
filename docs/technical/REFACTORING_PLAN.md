# Refactoring Plan

## Completed

- Workspace structure is normalized around `apps/web`, `supabase`, `docs` and `scripts`.
- Privacy-sensitive contact routing is isolated behind services, server actions and database RLS.
- Presentational boundaries were extracted for contact routing, `muro`, `empleos` and `administracion`.
- Matching now exposes explainable factors without changing the legacy score total.
- Application readiness now separates hard blockers from recommendations and informational checks.
- Interview response/cancellation actions use the RLS-constrained server client.

## Current Safety Nets

- Pure matching and readiness logic is covered by no-dependency `verify:*` scripts.
- Interview privacy and transition invariants are checked structurally against migrations.
- Every code change must pass lint, typecheck and production build.

## Next Refactors

- Split `apps/web/src/app/profile/page.tsx` by role and evidence domain.
- Reduce `apps/web/src/app/empleos/page.tsx` by extracting data hooks and ATS composition.
- Add disposable Supabase integration tests for RLS, triggers and authenticated server actions.
- Add CI for the full verification matrix.

## Deferred Maintenance

- Triage dependency vulnerabilities.
- Regenerate historical schema snapshots without losing migration traceability.
- Replace remaining broad `any` casts in server actions and Supabase joins.
