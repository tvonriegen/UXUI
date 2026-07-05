# TalentHub Next Actions
## Immediate (PR 1 — `fix/privacy-contact-routing`)

Architecture-auditor verdict (2026-07-05): **Aprobar con observaciones** — do not block, provided the ajustes imprescindibles are incorporated into PR 1. The decision package (`DECISION_LOG.md` ADR-002) records those guardrails and is the prerequisite for implementation. The checklist below is the executable path forward on `fix/privacy-contact-routing`.

**Pre-implementation gate (docs only).** The decision documentation state is the explicit prerequisite for moving to implementation. Implementation must wait for an explicit implementation approval and/or a commit of the docs state.

1. **Commit the decision-documentation state on `fix/privacy-contact-routing`.** The uncommitted diff in the working tree (`docs/workflow/*` and the brief `docs/architecture/SECURITY_MODEL.md` decision summary) is the only safe change on the branch at the time of writing. Land it as a single docs-only commit.
2. **Open the PR 1 implementation plan.** Once the docs commit lands, draft the PR 1 implementation plan in `NEXT_ACTIONS.md` (this file) or in a sibling `docs/architecture/PR1_PLAN.md`, and circulate for review. The plan must inline the guardrails from ADR-002 and answer the residual implementation questions in `OPEN_QUESTIONS.md` (Q12–Q14).

**Guardrails to bake into the implementation (from ADR-002).**

- **CR-1 / C3 — no admin client in the contact/interview flow.** `proposeInterview` is refactored to the RLS-constrained server-action client bound to `auth.uid()`. No `createAdminClient()` call in the PR 1 contact/interview path; the admin client is permitted only with a concrete, narrow, documented reason (none in PR 1).
- **CR-2 / C2 — `can_converse` on both insert sides.** Gate `conversations INSERT` and `messages INSERT` with `can_converse(a, b)`. Keep `conversations SELECT` participant-based for history (soft-lock per M5).
- **M1 — `isMinor(role, age)` predicate.** Use the canonical definition `role === 'Estudiante' && (age === null || age < 18)` in both TS (shared helper) and SQL (RLS function); keep the two in sync.
- **M2 — `contact_requests` RLS.** SELECT for company / school; INSERT for company; UPDATE for company (cancel `pending`) and school (approve / reject); DELETE denied. A minor student does not see `pending` rows in PR 1.
- **M3 — indexes.** `contact_requests` pair/status for `can_converse` lookup; school/status for the school's review queue. Shipped in the same migration as the new policies.
- **M4 — `schema.sql` alignment.** Regenerate the snapshot for the sections PR 1 touches: `profiles.age`, `conversations.user1_id` / `user2_id` + unique index, `messages.kind` / `metadata`, `notifications` CHECK + `metadata`, `contact_requests` (table, columns, functions, policies). Record any residual drift in `docs/technical/KNOWN_ISSUES.md`.
- **M5 / M7 — `notifications.metadata`.** `jsonb NOT NULL DEFAULT '{}'`; CHECK accepts `contact_request`; status in `metadata.status`. Migration is idempotent.
- **M6 — verification mechanism.** Choose a concrete mechanism at implementation time: preferred — introduce a minimal test if the project already has a runner; fallback — documented verifiable cases as a script. The choice and justification live in the PR 1 implementation notes (resolves Q12).
- **M8 — `SECURITY DEFINER` hygiene.** Explicit `SET search_path = ...`, minimum grants, explicit `REVOKE` from `PUBLIC` where needed, `STABLE` for read-only helpers, no mutations.
- **Secondary.** Student-side visibility: no `pending` for minor students in PR 1. Cancellation: company may cancel `pending`. `rejection_reason`: optional, visible to company and school, not to student in PR 1. Colegio↔Egresado: deny by default in `can_converse`; any future allow rule is out of scope for PR 1.

**Implementation plan steps (high level; details in the implementation plan).**

1. Add the `contact_requests` table, supporting indexes, and RLS policies (M2, M3). Idempotent migration.
2. Add or update the `is_minor(role, age)` SQL function and the `can_converse(a, b)` SQL function with explicit `search_path`, `STABLE`, and minimum grants (M1, M3, M8).
3. Update `conversations` and `messages` RLS so that `can_converse` gates both inserts; keep `conversations SELECT` participant-based (CR-2 / C2, M5).
4. Extend `notifications` to include `metadata jsonb NOT NULL DEFAULT '{}'` and a CHECK that allows `contact_request` with `metadata.status` (M5, M7). Idempotent migration.
5. Add the `contact_request` DB trigger that writes the notification row (C4). The trigger is the only writer for the `contact_request` notification kind in PR 1.
6. Refactor `apps/web/src/app/actions/interviews.ts::proposeInterview` to drop the admin client; for minor candidates, create or reuse a `contact_requests` row in `pending` and do not move `job_applications.status` to `interviewing` (CR-1 / C3).
7. Add the school-side approve / reject path and the company-side cancel path on `contact_requests`; wire the approval outcome to the `can_converse` gate and to the soft-lock / reuse-or-create conversation logic (M2, M5; resolves Q13).
8. Regenerate `supabase/schema.sql` for the touched sections and record any residual drift (C1, M4).
9. Pick and document the `is-minor` / contact-routing verification mechanism (M6; resolves Q12).
10. Confirm the `respondInterview` / `cancelInterview` admin-client scope (resolves Q14): either confirm they stay out of scope for PR 1, or justify any admin-client use with a concrete, narrow, documented reason (per CR-1 / C3).
11. Run `npm run lint`, `npm run typecheck`, `npm run build`, and the chosen verification mechanism. Update `SESSION_LOG.md`, `PR_TRACKER.md`, and `DECISION_LOG.md` as the work lands.

**Validation criteria (next session, after the docs commit and the implementation plan are approved).**

- `npm run lint` ✓
- `npm run typecheck` ✓
- `npm run build` ✓
- The chosen verification mechanism passes: a company contact toward a minor candidate is routed through the school-mediated path; the minor's direct contact data is not exposed in the company-facing response; the existing direct conversation is soft-locked (history visible, new messages blocked) until a `contact_request` is approved.

## After Current PR

- PR 2: `refactor/feature-boundaries` — `refactor: split high-risk feature pages into modules`. Follow-up to PR 1, branched from `caro-maturana` after PR 1 is merged. Decomposes the high-risk feature pages surfaced by the PR 1 architecture review (e.g. `talent`, `messages`, interview proposal) into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable. Capture the concrete module split and migration steps in `PR_TRACKER.md` when PR 1 lands.

## Blocked

- **PR 1 implementation is not yet unblocked.** The decision package is approved, but the working tree carries an uncommitted docs diff. Implementation must wait for an explicit implementation approval and/or a commit of the docs state. The residual implementation questions in `OPEN_QUESTIONS.md` (Q12–Q14) must be resolved in the implementation plan before the code commit lands.
- **Push to `origin` is blocked.** SSH authentication fails with `Permission denied (publickey)`. Local branch is in sync with `origin` per `git status` at session start, but new commits cannot be pushed until credentials are restored.
- **`npm run install:web` reports 21 dependency vulnerabilities** on the baseline. Not auto-fixed to avoid unplanned breaking upgrades; tracked in `docs/technical/KNOWN_ISSUES.md`. Resolution to be scheduled as a dedicated chore PR.
