# Known Issues

## Verification

- 2026-07-05: `npm run lint` passed.
- 2026-07-05: `npm run typecheck` passed.
- 2026-07-05: `npm run build` passed with dummy non-secret public env values.
- 2026-07-05 (QA session): `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed on `chore/workflow-state` branch. No dummy env values required.
- 2026-07-05 (PR 1 implementation): `npm run verify:is-minor` passed, `npm run typecheck` passed, `npm run lint` passed. `npm run build` not run in this implementation pass.
- 2026-07-05 (PR 1 security review): B1 profile `role`/`age` client-update bypass fixed with a trusted-server-only trigger; M1 talent directory email exposure fixed by removing `email` from the client select.
- 2026-07-05 (PR 1 QA + Security Pass, pre-push): `npm run verify:is-minor` ✓ (7/7), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env). Local validation is green; the PR #2 Vercel check failure is external, not a local validation failure.
- 2026-07-12 (PR #2 Vercel check, historical): `Vercel` GitHub check on PR #2 **failed**; `Vercel Preview Comments` **passed**. Attempted local `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` returned `No existing credentials found` — the Vercel project is owned by a teammate / partner's GitHub account, so it is not visible / fixable from this user's account. PR **#2** was **merged to `caro-maturana`** on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f` despite the failing check (option (a) of the original Q16 merge policy question); the failure is now **historical for PR #2** and remains tracked in this file under "External deployment issues" for future reference. The merge brought in PR 1 + PR 1B (commit `8f39ce63b67f43f11d5dd49a23d28876c4413d05 fix(security): enforce interview privacy at RLS`). See "External deployment issues" below.
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
- Runtime Supabase migration / RLS / trigger smoke tests for `supabase/migrations/20260705000001_contact_requests.sql` and `supabase/migrations/20260705000002_interviews_privacy_rls.sql` have not been run on a live **staging** instance in this pass (`OPEN_QUESTIONS.md` Q15). Local validation passed and the security review approved the diff; the runtime smoke tests are a **follow-up before `main`**, not a blocker for the privacy PR #2 merge. The **mandatory pre-`main` follow-up** is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — this is **not** the INSERT/immutable trigger correction (already applied in PR 1B), and is the gate for promoting `caro-maturana` → `main`.
- 2026-07-05 (PR 1B security hardening): `interviews_insert_company` bypass fixed in `supabase/migrations/20260705000002_interviews_privacy_rls.sql`; UPDATE integrity trigger `trg_interviews_guard_immutable` added on identity columns (`application_id`, `company_id`, `student_id`, `created_at`). Structural verification (`npm run verify:interviews-privacy-rls`) passed. The PR 1B INSERT/immutable-trigger correction (hardened `interviews_insert_company` `WITH CHECK` + `trg_interviews_guard_immutable` BEFORE UPDATE trigger on identity columns) is **already applied**. The **mandatory pre-`main` follow-up** is the **hardening of `interviews.status` UPDATE transitions** (a policy UPDATE that gates who can change `interviews.status` between `proposed` / `accepted` / `rejected` / `cancelled`) — this is **not** the INSERT/immutable trigger correction, and is the gate for promoting `caro-maturana` → `main`. Runtime RLS / trigger smoke test on a live Supabase **staging** instance is pending; do not treat local structural verification as a remote security proof.

## External deployment issues

- **Vercel check failing on PR #2 — historical for PR #2, owner action still recommended (2026-07-12, historical).** The `Vercel` GitHub check on PR #2 (https://github.com/tvonriegen/UXUI/pull/2) **failed**; the `Vercel Preview Comments` check passed. The failing deployment id is `dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua`. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` reports `No existing credentials found`). The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner. Local code validation (lint, typecheck, build, `verify:is-minor`, `verify:interviews-privacy-rls`, `git diff --check`) was green — the failure was an external deployment / access blocker, not a local code validation problem. **PR #2 was merged to `caro-maturana` on 2026-07-12 (`T23:12:36Z`) with merge commit `6f2be0f5740bc37764e360c4298b8adbcd64fa5f` despite the failing Vercel check** (option (a) of the original Q16 merge policy question); the failure is now **historical for PR #2** and remains in this file for future reference and for future PRs. The merge brought in PR 1 + PR 1B (commit `8f39ce63b67f43f11d5dd49a23d28876c4413d05 fix(security): enforce interview privacy at RLS`). PR **#2 is not asserted as "open"**; the merge is complete. Tracked in `docs/workflow/OPEN_QUESTIONS.md` Q16 (answered; merge policy was option (a)).
  - **Owner action (recommended, post-merge, not a blocker).** Teammate / project owner who owns the Vercel project should:
    1. Run `npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs` from a machine with valid Vercel credentials, share the build logs with the user, and fix the build if the failure is actionable; or
    2. Grant the user access to the Vercel project so future failures can be inspected / fixed from this workspace.
