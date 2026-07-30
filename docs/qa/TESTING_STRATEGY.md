# Testing Strategy

## Current Baseline

The project uses Vitest for pure logic and component state, Playwright for browser hydration and public-flow smoke tests, plus the existing runtime Supabase checks for staging authorization.

Local commands:

```bash
npm run test
npm run test:e2e:chromium
npm run test:e2e
```

The browser suite requires the local web environment from `.env.example`. It uses no real account for public-flow tests.

## Priority Test Areas

- Matching score and future explanation factors.
- Application readiness checks.
- Supabase authorization-sensitive API routes.
- Profile evidence and validation flows.
- Login and registration hydration, including Estudiante and Empresa selection.
- Public route rendering without browser runtime errors.

## Suggested Tooling

- Unit tests for pure utilities.
- Component tests for critical UI state transitions.
- Playwright E2E tests for browser hydration, responsive public routes and auth form interaction.
- Lightweight integration checks for API routes where feasible.
- CI running lint, typecheck and build before merge.

## Runtime Supabase Smoke Test

The repository includes an opt-in authenticated staging smoke test:

```bash
npm run verify:runtime-supabase
```

It requires the `RUNTIME_*` variables documented in `.env.example` and uses four dedicated fixtures: Company, School, a minor Student and External. The student stage is stored in `student_profiles`; `graduated` is not a separate account type. The test verifies canonical account types, contact-request scoping and pending-request invisibility for the minor student. `RUNTIME_APP_URL` additionally checks `/api/health`.

GitHub Actions exposes the same check through the manual `Runtime Supabase Smoke` workflow using secrets in the `staging` environment. Staging provisioning is documented in `docs/technical/STAGING_SETUP.md`. Never use production users or production data as fixtures.
