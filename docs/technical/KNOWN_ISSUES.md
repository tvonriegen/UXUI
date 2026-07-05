# Known Issues

## Verification

- 2026-07-05: `npm run lint` passed.
- 2026-07-05: `npm run typecheck` passed.
- 2026-07-05: `npm run build` passed with dummy non-secret public env values.
- `npm run install:web` reported 21 dependency vulnerabilities from the current dependency tree. They were not auto-fixed to avoid unplanned breaking upgrades.
- Some historical migrations still include old project naming in comments only.

## Product Gaps

- Compatibility is scored but not yet fully explainable to users.
- Assisted application readiness checks are not yet implemented as a complete flow.

## Technical Gaps

- Large page files increase regression risk during feature work.
- RLS and API authorization need a dedicated review before production use.
