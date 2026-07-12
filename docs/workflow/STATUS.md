# TalentHub Workflow Status

## Current Branch

- `fix/privacy-contact-routing`

## Current Phase

- PR 1 — Privacy contact routing (minor students via school)

## Current PR / Task

- Task: `fix: privacy contact routing (minor students via school)` + PR 1B interview privacy RLS hardening.
- Scope: route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data; additionally, harden `interviews_insert_company` against direct-insert bypass and add an immutable UPDATE trigger. PR 1 implementation is **committed and pushed** on `fix/privacy-contact-routing` (HEAD `7a881f6`); PR 1B changes are prepared for the PR #2 update / included in this branch once committed. PR **#2** is opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. Security review verdict after B1/M1 fixes: **APROBAR, sin BLOCKER / HIGH**. Local validation passed (`npm ci --prefix apps/web`, `verify:is-minor`, `verify:interviews-privacy-rls`, `typecheck`, `lint`, `build`, `git diff --check`). Runtime Supabase migration smoke tests remain a recommended follow-up before merge; no remote Supabase instance was exercised in this pass.
- **Current blocker is external, not local.** GitHub check `Vercel` failed on PR #2; the `Vercel Preview Comments` check passed. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). The local diff passes lint / typecheck / build; the only failing check is the external deployment owned by someone else.

## Last Completed Work

- PR 0 (`chore/workflow-state`) was **integrated locally into `caro-maturana` via fast-forward** on 2026-07-05. The full local branch head — including `e01cecf`, `f15550b`, and the final docs touch-up `adb64cf docs: clarify workflow branch handoff` — is now reachable from `caro-maturana`. PR 0 itself was validated before integration (`npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓ — 2026-07-05 QA session). The push of the now-integrated branch to `origin` remains the user's call (SSH credentials are still blocked on this machine); see `PR_TRACKER.md`.
- 2026-07-05 — Repository professionalization baseline on `caro-maturana` (commit `a3e36ba docs: record verification results`).
- `docs/git/GIT_WORKFLOW.md`, `docs/git/COMMIT_CONVENTION.md`, and `docs/roadmap/ROADMAP.md` are in place.

## Current Working State

- Branch `fix/privacy-contact-routing` is **committed and pushed to `origin/fix/privacy-contact-routing`**; HEAD is `7a881f6 docs: record privacy contact routing implementation`. PR 1B changes (`supabase/migrations/20260705000002_interviews_privacy_rls.sql`, `scripts/verify-interviews-privacy-rls.mjs`, root script, and doc updates) are prepared for the PR #2 update / included in this branch once committed.
- Commits added on top of the previous docs-only state `7a2b42f docs: document privacy contact routing decisions`:
  - `bfbe3d5 feat(db): add mediated contact requests RLS` — `supabase/migrations/20260705000001_contact_requests.sql` (contact_requests, RLS, `is_minor_profile`, `can_converse`, `trg_profiles_guard_role_age`, approval conversation trigger, message / conversation gates).
  - `7843e1b feat(web): add minor contact policy helper` — `apps/web/src/lib/utils/is-minor.ts` + `scripts/verify-is-minor.mjs` + root `verify:is-minor` script.
  - `0bf3ecc feat(web): add school-mediated contact flow` — `apps/web/src/app/actions/contact-requests.ts` (new) + UI wiring on `apps/web/src/app/talent/page.tsx` (server-action call, `email` removed from the client select as the M1 fix) + `apps/web/src/components/dashboard/DashboardColegio.tsx` (school approve / reject queue).
  - `4a86621 refactor(web): route interview proposals through privacy checks` — `apps/web/src/app/actions/interviews.ts::proposeInterview` (admin client removed from the proposal path).
  - `62b7f56 chore(db): align schema snapshot for contact routing` — `supabase/schema.sql` snapshot for PR 1 touched sections.
  - `7a881f6 docs: record privacy contact routing implementation` — workflow / security / traceability docs.
- PR **#2** opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`.
- GitHub checks on PR #2 (as observed at this session): `Vercel` **failed**, `Vercel Preview Comments` **passed**.
- Architecture-auditor verdict on PR 1 (2026-07-05): **Aprobar con observaciones** — guardrails captured in ADR-002 and incorporated in the implementation.
- Security follow-up verdict (2026-07-05, after the B1 and M1 fixes): **APROBAR, sin BLOCKER / HIGH**. Detail in `SESSION_LOG.md` (PR 1 QA + Security Pass).
- Local validation (2026-07-05, PR 1B pass): `npm ci --prefix apps/web` ✓ (21 baseline vulnerabilities), `npm run verify:is-minor` ✓ (7/7 canonical cases), `npm run verify:interviews-privacy-rls` ✓, `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (`.env.local` detected but no values read/displayed), `git diff --check` ✓.

## Known Breakages

- **Vercel check failing on PR #2 — external / out-of-this-workspace blocker.** The `Vercel` GitHub check on PR #2 failed. The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found` here). The `Vercel Preview Comments` check passed. The user explicitly stated they cannot fix Vercel because the project belongs to the teammate / partner. This is an **external** deployment issue, not a local code validation problem. Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16. Owner action: teammate / project owner must inspect / fix Vercel or grant access.
- Git pull over SSH failed with `Permission denied (publickey)` against `origin`; local is in sync with `origin` per `git status` and the push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier in this session. Future pushes are still blocked until SSH credentials are restored.
- 21 dependency vulnerabilities reported by `npm run install:web` on the baseline branch (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Historical migrations still include old project naming in comments only (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Broader historical schema snapshot drift remains between `supabase/schema.sql`, `supabase/full_reset.sql`, and older migrations; PR 1 updated touched sections only. Tracked in `docs/technical/KNOWN_ISSUES.md`.
- Runtime Supabase migration / RLS / trigger behavior was not exercised on a live Supabase instance in this pass (`supabase/migrations/20260705000001_contact_requests.sql` and the PR 1B `supabase/migrations/20260705000002_interviews_privacy_rls.sql` are unverified at runtime). Local validations passed. The runtime smoke tests are a recommended follow-up before merge / deploy, not a blocker.

## Next Recommended Action

- **PR #2 is committed and pushed; the blocker is the Vercel check, which is external.** PR 1B changes are prepared for the PR #2 update / included in this branch once committed. Local validation already passed (lint, typecheck, build, `verify:is-minor`, `verify:interviews-privacy-rls`). The next decision is the **merge policy** while the Vercel check is failing.
- **Recommended next actions (in order).**
  1. **Teammate / project owner (Vercel side).** Ask the teammate / project owner who owns the Vercel project to inspect the failing deployment, share the build logs, fix the build if the failure is actionable, or grant the user access so they can fix it. Exact command for the owner to run from a machine with Vercel credentials:
     ```
     npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs
     ```
  2. **Owner merge-policy decision.** Decide whether to merge PR #2 into `caro-maturana` despite the failing external Vercel check (local validation passed; the only failing check is the external one) or wait for the Vercel failure to be resolved. If the Vercel failure is a real code issue it must be fixed in this PR; if it is a Vercel project / environment / access issue, it is out of scope for this PR's code diff.
  3. **If PR #2 is accepted despite Vercel:** decide whether to amend PR #2 with the PR 1B changes or keep them for a follow-up commit; merge `fix/privacy-contact-routing` into `caro-maturana` (the user already pushed the branch up to `7a881f6`; the merge itself is the user's call).
  4. **Once PR #2 lands in `caro-maturana`:** start the next branch `refactor/feature-boundaries` (PR 2) per `NEXT_ACTIONS.md` "After Current PR" and `PR_TRACKER.md`. If PR #2 has to wait for the Vercel fix, PR 2 can also be prepared as a stacked branch off the local `caro-maturana` only if explicitly accepted.
- **Do not start coding PR 2 until the merge policy for PR #2 is decided**, so the diff for `refactor/feature-boundaries` can be based on the correct `caro-maturana` state.
- Phase 1C authorizes the documentation-only commit of these updates; the actual commit/push is performed by the user.

## Owner / Agent Notes

- Owner: not assigned.
- Agent: opencode (Session 1, 2026-07-05; PR 0). QA session: opencode (2026-07-05). PR 1 Start session: opencode (2026-07-05).
- No secrets, `.env.local`, service keys, or generated outputs may be added to this directory.
