# Known Issues

## Verification

- 2026-07-05: `npm run lint` passed.
- 2026-07-05: `npm run typecheck` passed.
- 2026-07-05: `npm run build` passed with dummy non-secret public env values.
- 2026-07-05 (QA session): `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed on `chore/workflow-state` branch. No dummy env values required.
- 2026-07-05 (PR 1 implementation): `npm run verify:is-minor` passed, `npm run typecheck` passed, `npm run lint` passed. `npm run build` not run in this implementation pass.
- 2026-07-05 (PR 1 security review): B1 profile `role`/`age` client-update bypass fixed with a trusted-server-only trigger; M1 talent directory email exposure fixed by removing `email` from the client select.
- `npm run install:web` reported 21 dependency vulnerabilities from the current dependency tree. They were not auto-fixed to avoid unplanned breaking upgrades.
- Some historical migrations still include old project naming in comments only.

## Product Gaps

- Compatibility is scored but not yet fully explainable to users.
- Assisted application readiness checks are not yet implemented as a complete flow.

## Technical Gaps

- Large page files increase regression risk during feature work.
- RLS and API authorization need a dedicated review before production use.
- `supabase/schema.sql` was updated for PR 1 touched sections, but the repository still has broader historical drift between `schema.sql`, `supabase/full_reset.sql`, and older migrations. Treat migrations as canonical until a dedicated schema snapshot regeneration is done.
- `apps/web/src/app/actions/interviews.ts::respondInterview` and `::cancelInterview` still use the admin client. They are out of PR 1 scope (`OPEN_QUESTIONS.md` Q14) and need a follow-up admin-client review before production hardening. The follow-up is a tracked debt item, not a PR 1 blocker.
- Runtime Supabase migration / RLS / trigger smoke test for `supabase/migrations/20260705000001_contact_requests.sql` has not been run on a live instance in this pass (`OPEN_QUESTIONS.md` Q15). Local validation passed and the security review approved the diff; the runtime smoke test is a recommended follow-up before merge / deploy, not a blocker.
