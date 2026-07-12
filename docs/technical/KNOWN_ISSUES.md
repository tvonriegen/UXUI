# Known Issues

## Verification

- 2026-07-05: `npm run lint` passed.
- 2026-07-05: `npm run typecheck` passed.
- 2026-07-05: `npm run build` passed with dummy non-secret public env values.
- 2026-07-05 (QA session): `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed on `chore/workflow-state` branch. No dummy env values required.
- 2026-07-05 (PR 1 implementation): `npm run verify:is-minor` passed, `npm run typecheck` passed, `npm run lint` passed. `npm run build` not run in this implementation pass.
- 2026-07-05 (PR 1 security review): B1 profile `role`/`age` client-update bypass fixed with a trusted-server-only trigger; M1 talent directory email exposure fixed by removing `email` from the client select.
- 2026-07-05 (PR 1 QA + Security Pass, pre-push): `npm run verify:is-minor` ✓ (7/7), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env). Local validation is green; the PR #2 Vercel check failure is external, not a local validation failure.
- 2026-07-05 (PR #2 Vercel check): `Vercel` GitHub check on PR #2 **failed**; `Vercel Preview Comments` **passed**. Attempted local `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` returned `No existing credentials found` — the Vercel project is owned by a teammate / partner's GitHub account, so it is not visible / fixable from this user's account. See "External deployment issues" below.
- `npm run install:web` reported 21 dependency vulnerabilities from the current dependency tree. They were not auto-fixed to avoid unplanned breaking upgrades.
- Some historical migrations still include old project naming in comments only.

## Product Gaps

- Compatibility is scored but not yet fully explainable to users.
- Assisted application readiness checks are not yet implemented as a complete flow.

## Technical Gaps

- Large page files increase regression risk during feature work.
- RLS and API authorization need a dedicated review before production use.
- `supabase/schema.sql` was updated for PR 1 and PR 1B touched sections (contact requests, interviews, job_applications.applicant_id), but broader historical drift remains outside those sections (e.g., application_events, messages.kind, older trigger snapshots). Treat migrations as canonical until a dedicated schema snapshot regeneration is done.
- `apps/web/src/app/actions/interviews.ts::respondInterview` and `::cancelInterview` still use the admin client. They are out of PR 1 scope (`OPEN_QUESTIONS.md` Q14) and need a follow-up admin-client review before production hardening. The follow-up is a tracked debt item, not a PR 1 blocker.
- Runtime Supabase migration / RLS / trigger smoke tests for `supabase/migrations/20260705000001_contact_requests.sql` and `supabase/migrations/20260705000002_interviews_privacy_rls.sql` have not been run on a live instance in this pass (`OPEN_QUESTIONS.md` Q15). Local validation passed and the security review approved the diff; the runtime smoke tests are a recommended follow-up before merge / deploy, not a blocker.
- 2026-07-05 (PR 1B security hardening): `interviews_insert_company` bypass fixed in `supabase/migrations/20260705000002_interviews_privacy_rls.sql`; UPDATE integrity trigger `trg_interviews_guard_immutable` added. Structural verification (`npm run verify:interviews-privacy-rls`) passed. Runtime RLS / trigger smoke test on a live Supabase instance is pending; do not treat local structural verification as a remote security proof.

## External deployment issues

- **Vercel check failing on PR #2 — owner action required (2026-07-05).** The `Vercel` GitHub check on PR #2 (https://github.com/tvonriegen/UXUI/pull/2) **failed**; the `Vercel Preview Comments` check passed. The failing deployment id is `dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua`. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` reports `No existing credentials found`). The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner. Local code validation (lint, typecheck, build, `verify:is-minor`, `verify:interviews-privacy-rls`, `git diff --check`) is green — the failure is an external deployment / access blocker, not a local code validation problem. PR 1B changes are prepared for the PR #2 update / included in this branch once committed. Tracked in `docs/workflow/OPEN_QUESTIONS.md` Q16.
  - **Owner action.** Teammate / project owner who owns the Vercel project must:
    1. Run `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` from a machine with valid Vercel credentials, share the build logs with the user, and fix the build if the failure is actionable; or
    2. Grant the user access to the Vercel project so they can inspect / fix it.
  - **Merge policy decision.** Owner must decide whether to merge PR #2 into `caro-maturana` despite the failing external Vercel check (local validation passed) or wait for the Vercel failure to be resolved first. If the Vercel failure is a real code issue, the fix must land in this PR; if it is a Vercel project / environment / access issue, it is out of scope for the PR #2 code diff.
