# TalentHub Workflow Status

## Current Branch

- `fix/privacy-contact-routing`

## Current Phase

- PR 1 — Privacy contact routing (minor students via school)

## Current PR / Task

- Task: `fix: privacy contact routing (minor students via school)`.
- Scope: route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data. Implementation is **complete on the working tree but uncommitted** on `fix/privacy-contact-routing`. Security review verdict after B1/M1 fixes: **APROBAR, sin BLOCKER / HIGH**. QA passed locally; runtime Supabase migration smoke test remains a recommended follow-up before merge.

## Last Completed Work

- PR 0 (`chore/workflow-state`) was **integrated locally into `caro-maturana` via fast-forward** on 2026-07-05. The full local branch head — including `e01cecf`, `f15550b`, and the final docs touch-up `adb64cf docs: clarify workflow branch handoff` — is now reachable from `caro-maturana`. PR 0 itself was validated before integration (`npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓ — 2026-07-05 QA session). The push of the now-integrated branch to `origin` remains the user's call (SSH credentials are still blocked on this machine); see `PR_TRACKER.md`.
- 2026-07-05 — Repository professionalization baseline on `caro-maturana` (commit `a3e36ba docs: record verification results`).
- `docs/git/GIT_WORKFLOW.md`, `docs/git/COMMIT_CONVENTION.md`, and `docs/roadmap/ROADMAP.md` are in place.

## Current Working State

- Working tree on `fix/privacy-contact-routing` carries the uncommitted PR 1 implementation diff (code + migration + schema snapshot + docs):
  - DB: `supabase/migrations/20260705000001_contact_requests.sql` (new) and `supabase/schema.sql` snapshot for PR 1 touched sections.
  - Server actions: `apps/web/src/app/actions/contact-requests.ts` (new) and refactor of `apps/web/src/app/actions/interviews.ts::proposeInterview` (admin client removed from the proposal path).
  - UI wiring: `apps/web/src/app/talent/page.tsx` (server-action call, `email` removed from the client select as the M1 fix) and `apps/web/src/components/dashboard/DashboardColegio.tsx` (school approve / reject queue).
  - Helpers / scripts: `apps/web/src/lib/utils/is-minor.ts` (new shared helper), `scripts/verify-is-minor.mjs` (new), root `verify:is-minor` script in `package.json`.
  - Docs: `docs/workflow/*`, `docs/technical/KNOWN_ISSUES.md`, `docs/architecture/SECURITY_MODEL.md`, `docs/requirements/TRACEABILITY_MATRIX.md`, `docs/workflow/DECISION_LOG.md` ADR-002 implementation note.
- Branch `fix/privacy-contact-routing` is **created**; the **decision package is approved with guardrails** (ADR-002), and the code implementation has landed locally. Nothing has been committed yet — the user must explicitly ask before any commit / push.
- Architecture-auditor verdict on PR 1 (2026-07-05): **Aprobar con observaciones** — guardrails captured in ADR-002 and incorporated in the implementation.
- Security follow-up verdict (2026-07-05, after the B1 and M1 fixes): **APROBAR, sin BLOCKER / HIGH**. Detail in `SESSION_LOG.md` (PR 1 QA + Security Pass).
- Validation in this implementation pass (2026-07-05): `npm run verify:is-minor` ✓ (7/7 canonical cases), `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (no dummy env required).
- Git operations confirmed at session start: clean at `7a2b42f docs: document privacy contact routing decisions`. Working tree is now intentionally dirty with PR 1 implementation changes.

## Known Breakages

- Git pull over SSH failed with `Permission denied (publickey)` against `origin`; local was reported in sync with `origin` per `git status` at session start. Push is blocked until SSH credentials are restored.
- 21 dependency vulnerabilities reported by `npm run install:web` on the baseline branch (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Historical migrations still include old project naming in comments only (tracked in `docs/technical/KNOWN_ISSUES.md`).
- Broader historical schema snapshot drift remains between `supabase/schema.sql`, `supabase/full_reset.sql`, and older migrations; PR 1 updated touched sections only. Tracked in `docs/technical/KNOWN_ISSUES.md`.
- Runtime Supabase migration / RLS / trigger behavior was not exercised on a live Supabase instance in this pass (the new migration in `supabase/migrations/20260705000001_contact_requests.sql` is unverified at runtime). Local validations passed. The runtime smoke test is a recommended follow-up before merge / deploy, not a blocker.

## Next Recommended Action

- **User must explicitly ask before any commit / push** on this branch. Do not auto-commit.
- **Review the PR 1 diff end-to-end**, especially the new RLS policies, the `can_converse` predicate, the `trg_profiles_guard_role_age` trigger (B1 fix), and the conversation / message insert gates, before opening the PR.
- **Optional commit grouping** (atomic, easy to revert), per `NEXT_ACTIONS.md` Immediate:
  1. `feat(db): contact_requests + RLS + can_converse + approval trigger` — migration only.
  2. `feat(web): is-minor shared helper + verify script` — `is-minor.ts`, `verify-is-minor.mjs`, `package.json` script.
  3. `refactor(web): proposeInterview on RLS-constrained client` — `interviews.ts` refactor.
  4. `feat(web): contact request server actions + UI wiring` — `contact-requests.ts`, `talent/page.tsx`, `DashboardColegio.tsx`.
  5. `chore(db): align schema.sql for PR 1 touched sections` — `supabase/schema.sql`.
  6. `docs: record PR 1 implementation / QA / security` — workflow + security + traceability docs.
- **Recommended follow-up before merge / deploy** (not a blocker): apply `20260705000001_contact_requests.sql` to a Supabase instance and exercise the RLS paths end-to-end (company minor request insert, school approve / reject, conversation reuse / create on approval, message soft-lock before approval, direct non-minor contact, `profiles.role` / `profiles.age` direct-update rejection for non-service roles).
- Push to `origin` is the user's call; SSH credentials are still blocked on this machine.

## Owner / Agent Notes

- Owner: not assigned.
- Agent: opencode (Session 1, 2026-07-05; PR 0). QA session: opencode (2026-07-05). PR 1 Start session: opencode (2026-07-05).
- No secrets, `.env.local`, service keys, or generated outputs may be added to this directory.
