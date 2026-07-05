# TalentHub Next Actions
## Immediate (PR 1 — `fix/privacy-contact-routing`)

Architecture-auditor verdict (2026-07-05): **Aprobar con observaciones**. Security follow-up verdict after the B1 / M1 fixes (2026-07-05): **APROBAR, sin BLOCKER / HIGH**. PR 1 implementation has landed locally on `fix/privacy-contact-routing` and passed local validation, but **is not yet committed**. The user must explicitly ask before any commit / push.

**Current implementation status.** PR 1 code is implemented locally and uncommitted. `npm run verify:is-minor` (7/7 canonical cases), `npm run typecheck`, `npm run lint`, and `npm run build` (no dummy env) all pass. Security review approved after the B1 (`trg_profiles_guard_role_age` trigger + tightened `profiles_update` policy) and M1 (`email` removed from the talent directory client select) fixes. Runtime Supabase migration / RLS / trigger verification on a live instance is still recommended before merge / deploy, not a blocker.

**Reviewer checklist (before commit).** Read the new `contact_requests` policies, the `can_converse` predicate, the `trg_profiles_guard_role_age` trigger, the contact request notification trigger, the approval-time conversation reuse / create trigger, the `conversations` / `messages` insert gates, the `proposeInterview` refactor, and the talent directory + school dashboard wiring. All diffs sit on the working tree; nothing is committed yet.

**Recommended atomic commit groups (optional, easy to revert).** The user may commit the full diff as one commit, or split into the following six atomic groups. Suggested subject lines follow the repo's `docs/git/COMMIT_CONVENTION.md`:

1. `feat(db): contact_requests + RLS + can_converse + approval trigger`
   - `supabase/migrations/20260705000001_contact_requests.sql` (new).
2. `feat(web): is-minor shared helper + verify script`
   - `apps/web/src/lib/utils/is-minor.ts` (new), `scripts/verify-is-minor.mjs` (new), `package.json` (`verify:is-minor` script).
3. `refactor(web): proposeInterview on RLS-constrained client`
   - `apps/web/src/app/actions/interviews.ts` (admin client removed from the proposal path; minor routing through `contact_requests`).
4. `feat(web): contact request server actions + UI wiring`
   - `apps/web/src/app/actions/contact-requests.ts` (new), `apps/web/src/app/talent/page.tsx` (server-action call, `email` removed from select), `apps/web/src/components/dashboard/DashboardColegio.tsx` (school approve / reject queue).
5. `chore(db): align schema.sql for PR 1 touched sections`
   - `supabase/schema.sql`.
6. `docs: record PR 1 implementation / QA / security`
   - `docs/workflow/STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, `OPEN_QUESTIONS.md`, `DECISION_LOG.md`, `docs/architecture/SECURITY_MODEL.md`, `docs/requirements/TRACEABILITY_MATRIX.md`, `docs/technical/KNOWN_ISSUES.md`.

**Runtime Supabase migration smoke test (recommended follow-up, not a blocker).** Apply `supabase/migrations/20260705000001_contact_requests.sql` to a Supabase instance and exercise, at minimum:

- Company minor contact request insert (RLS accepts) and direct non-minor contact path.
- `profiles.role` / `profiles.age` direct update from a non-service role is rejected (B1 fix); update from a service role succeeds.
- School approve path opens / reuses the company↔student conversation and unlocks message inserts.
- School reject path closes the request and the `contact_request` notification is emitted by the trigger (not the server action).
- Message soft-lock holds before approval: `messages INSERT` between a company and a minor student without an approved `contact_request` is denied.

**Push / remote.** Push to `origin` is the user's call; SSH credentials are still blocked on this machine (`Permission denied (publickey)`).

**Guardrails baked into PR 1 (from ADR-002).**

- **CR-1 / C3 — no admin client in the contact/interview flow.** `proposeInterview` is on the RLS-constrained server-action client bound to `auth.uid()`. No `createAdminClient()` call in the PR 1 contact / interview path.
- **CR-2 / C2 — `can_converse` on both insert sides.** Gate `conversations INSERT` and `messages INSERT` with `can_converse(a, b)`. `conversations SELECT` is participant-based for history (soft-lock per M5).
- **M1 — `isMinor(role, age)` predicate.** Canonical `role === 'Estudiante' && (age === null || age < 18)` shared between TS helper and SQL function.
- **M2 — `contact_requests` RLS.** SELECT for company / school; INSERT for company; UPDATE for company (cancel `pending`) and school (approve / reject); DELETE denied. A minor student does not see `pending` rows in PR 1.
- **M3 — indexes.** Pair/status for `can_converse` lookup; school/status for the review queue. Shipped in the same migration.
- **M4 — `schema.sql` alignment.** Regenerated for the PR 1 touched sections; residual broader drift recorded in `KNOWN_ISSUES.md`.
- **M5 / M7 — `notifications.metadata`.** `jsonb NOT NULL DEFAULT '{}'`; CHECK accepts `contact_request`; status in `metadata.status`. Migration is idempotent.
- **M6 — verification mechanism.** `scripts/verify-is-minor.mjs` (7 canonical cases) plus root `verify:is-minor` script; no new dependency added.
- **M8 — `SECURITY DEFINER` hygiene.** Explicit `SET search_path = public`, minimum grants, explicit `REVOKE` from `PUBLIC`, `STABLE` for read-only helpers, no mutations in the new functions.
- **Secondary.** Student-side visibility: no `pending` for minor students in PR 1. Cancellation: company may cancel `pending`. `rejection_reason`: optional, visible to company and school, not to student in PR 1. Colegio↔Egresado: deny by default in `can_converse`; any future allow rule is out of scope for PR 1.

**Validation criteria (this implementation pass, 2026-07-05).**

- `npm run verify:is-minor` ✓ (7/7 canonical cases).
- `npm run typecheck` ✓.
- `npm run lint` ✓.
- `npm run build` ✓ (no dummy env values required).
- Security review (post B1 / M1 fixes): **APROBAR, sin BLOCKER / HIGH**.
- Runtime Supabase migration / RLS / trigger verification: recommended follow-up before merge / deploy, not a blocker.

## After Current PR

- PR 2: `refactor/feature-boundaries` — `refactor: split high-risk feature pages into modules`. Follow-up to PR 1, branched from `caro-maturana` after PR 1 is merged. Decomposes the high-risk feature pages surfaced by the PR 1 architecture review (e.g. `talent`, `messages`, interview proposal) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable. Capture the concrete module split and migration steps in `PR_TRACKER.md` when PR 1 lands.

## Blocked

- **Push to `origin` is blocked.** SSH authentication fails with `Permission denied (publickey)`. Local branch is in sync with `origin` per `git status` at session start, but new commits cannot be pushed until credentials are restored.
- **`npm run install:web` reports 21 dependency vulnerabilities** on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
