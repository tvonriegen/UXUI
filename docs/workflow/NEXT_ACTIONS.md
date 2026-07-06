# TalentHub Next Actions
## Immediate (PR 1 — `fix/privacy-contact-routing` → PR #2 against `caro-maturana`)

Architecture-auditor verdict (2026-07-05): **Aprobar con observaciones**. Security follow-up verdict after the B1 / M1 fixes (2026-07-05): **APROBAR, sin BLOCKER / HIGH**. PR 1 implementation is **committed and pushed** to `origin/fix/privacy-contact-routing` (HEAD `7a881f6`), and PR **#2** is opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. The user must explicitly ask before any further commit / push.

**Current implementation status.** PR 1 code is committed, pushed, and local validation passed: `npm run verify:is-minor` (7/7 canonical cases), `npm run typecheck`, `npm run lint`, and `npm run build` (no dummy env) all green. Security review approved after the B1 (`trg_profiles_guard_role_age` trigger + tightened `profiles_update` policy) and M1 (`email` removed from the talent directory client select) fixes. Runtime Supabase migration / RLS / trigger verification on a live instance is still recommended before merge / deploy, not a blocker.

**GitHub checks on PR #2.** `Vercel` **failed**, `Vercel Preview Comments` **passed**. The user cannot inspect / fix the Vercel failure from this workspace because the Vercel project is owned by a teammate / partner's GitHub account (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). The failure is an **external** deployment / access blocker, not a local code validation problem.

### Immediate actions (PR #2 / Vercel external blocker)

1. **Document the Vercel external blocker.** Done in this pass: `STATUS.md`, `NEXT_ACTIONS.md` (this file), `PR_TRACKER.md`, `SESSION_LOG.md`, `KNOWN_ISSUES.md`, `OPEN_QUESTIONS.md` (Q16).
2. **Ask the teammate / project owner for Vercel logs / settings.** The Vercel project is not visible as owned by this user, so the owner must inspect or grant access. Exact command for the owner to run from a machine with valid Vercel credentials:
   ```
   npx vercel inspect dpl_EssKcBKdJbuTK6n8JB3JkmgwDwua --logs
   ```
   If the failure is a real code issue, the owner / user must surface the build error and a fix is required in PR #2. If the failure is a Vercel project / environment / access issue, it is out of scope for the PR #2 code diff and should be tracked in `KNOWN_ISSUES.md` until resolved.
3. **Merge policy decision (owner).** Decide whether to merge PR #2 into `caro-maturana` despite the failing external Vercel check (local validation passed; the only failing check is the external one) or wait for the Vercel failure to be resolved. Capture the decision in `SESSION_LOG.md` once known.
4. **If PR #2 is accepted despite Vercel:** merge `fix/privacy-contact-routing` into `caro-maturana` (the user already pushed the branch; the merge itself is the user's call). Then proceed to PR 2 (see "After Current PR" below).
5. **If PR #2 is held for the Vercel fix:** do not start coding PR 2 yet — wait for the merge policy decision so the next branch is based on the correct `caro-maturana` state.

**Push / remote.** The push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier in this session. Future pushes are still blocked by SSH credentials (`Permission denied (publickey)`); restore credentials before any further push.

**Runtime Supabase migration smoke test (recommended follow-up, not a blocker).** Apply `supabase/migrations/20260705000001_contact_requests.sql` to a Supabase instance and exercise, at minimum:

- Company minor contact request insert (RLS accepts) and direct non-minor contact path.
- `profiles.role` / `profiles.age` direct update from a non-service role is rejected (B1 fix); update from a service role succeeds.
- School approve path opens / reuses the company↔student conversation and unlocks message inserts.
- School reject path closes the request and the `contact_request` notification is emitted by the trigger (not the server action).
- Message soft-lock holds before approval: `messages INSERT` between a company and a minor student without an approved `contact_request` is denied.

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

- **PR 2: `refactor/feature-boundaries` — `refactor: split high-risk feature pages into modules`.** Follow-up to PR 1. Branch from `caro-maturana` **after PR 1 is merged** (i.e. after PR #2 lands in `caro-maturana`). Decomposes the high-risk feature pages surfaced by the PR 1 architecture review (e.g. `talent`, `messages`, interview proposal) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable. If the merge of PR #2 is held by the Vercel blocker, PR 2 can be prepared as a stacked branch off the local `caro-maturana` only if explicitly accepted by the owner. Capture the concrete module split and migration steps in `PR_TRACKER.md` when the work starts.

## Blocked

- **Vercel check on PR #2 is failing — external / out-of-this-workspace blocker.** The Vercel project is owned by a teammate / partner's GitHub account, so the user cannot inspect or fix it from this workspace (`npx vercel inspect <deployment> --logs` reports `No existing credentials found`). Owner action: teammate / project owner must inspect / fix Vercel or grant access. Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16.
- **Push to `origin` is blocked.** SSH authentication fails with `Permission denied (publickey)`. The push of `fix/privacy-contact-routing` (up to `7a881f6`) succeeded earlier in this session; further pushes remain blocked until credentials are restored.
- **`npm run install:web` reports 21 dependency vulnerabilities** on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
