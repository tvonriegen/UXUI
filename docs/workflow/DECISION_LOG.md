# TalentHub Decision Log

## ADR-001 — Persistent workflow state tracked in versioned Markdown

- Status: Accepted
- Date: 2026-07-05
- Branch: `chore/workflow-state`
- PR: PR 0 — `chore: add persistent workflow state tracking`

### Context

The TalentHub repository lacks a durable, in-repo record of the current branch, active PR, validation status, and follow-up actions. This forces every contributor to reconstruct context from `git log`, `git status`, and chat history, and there is no single place to document known breakages or open questions between sessions.

### Decision

Track the persistent workflow state of the project in versioned Markdown files under `docs/workflow/`:

- `STATUS.md` — current branch, phase, PR/task, working state, known breakages, next action.
- `NEXT_ACTIONS.md` — immediate, after current PR, and blocked actions.
- `SESSION_LOG.md` — chronological log of sessions, commands inspected, validation results, commits, risks, and next session.
- `DECISION_LOG.md` — this file, recording architectural and process decisions.
- `OPEN_QUESTIONS.md` — unresolved questions and blockers.
- `PR_TRACKER.md` — ordered list of planned and in-progress PRs with validation status.

The discipline is enforced through `docs/git/GIT_WORKFLOW.md`, which requires every session to read `STATUS.md`, `NEXT_ACTIONS.md`, and `PR_TRACKER.md` at start, and to update `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at close.

### Consequences

Positive:
- Context survives across sessions, restarts, and onboarding.
- A single diff in the PR shows what changed in the workflow state, not only in code.
- Compatible with the existing documentation conventions in `docs/` and with the AGENTS.md rule of small, reviewable changes.
- No new tooling, scripts, or runtime dependencies required.

Negative / Trade-offs:
- The files are only as accurate as the discipline applied; stale entries are a risk. Mitigated by mandating the read/update ritual in `GIT_WORKFLOW.md`.
- Some duplication with `docs/roadmap/ROADMAP.md` and `docs/technical/KNOWN_ISSUES.md`. Mitigated by pointing to those files from `STATUS.md` and `NEXT_ACTIONS.md` instead of copying their content.

### Alternatives Considered

- Issue tracker only (GitHub Issues / project board). Rejected: not durable inside the repo, requires network access, and is not part of the change set a PR reviews.
- A single `WORKFLOW.md` file. Rejected: mixes concerns (status, actions, log, decisions, questions) and becomes hard to scan and update.
- A generated report from a script. Rejected for PR 0 because it adds tooling overhead and a runtime dependency; can be revisited later if the manual discipline proves insufficient.

## ADR-002 — PR 1 privacy contact routing: enforcement design and migration strategy

- Status: Accepted
- Date: 2026-07-05
- Branch: `fix/privacy-contact-routing`
- PR: PR 1 — `fix: privacy contact routing (minor students via school)`
- Auditor verdict basis: 2026-07-05 architecture-auditor **Aprobar con observaciones** (no bloquear, siempre que se incorporen los ajustes imprescindibles antes/durante implementación).

### Context

PR 1 must route company contact with minor students through the school (school-mediated path) instead of exposing the student's direct contact data. The architecture-auditor returned a verdict of **Aprobar con observaciones** and required the following ajustes imprescindibles to be incorporated before/during implementation:

- **CR-1 / C3.** `proposeInterview` cannot use the admin client at all, not even on the non-minor path. The "idealmente" framing is removed: the entire flow must use the RLS-constrained / server-action client bound to `auth.uid()`. The admin client is permitted only with a concrete, narrow, documented reason; in PR 1 there is none for the contact/interview path, so the admin client is not used there.
- **CR-2 / C2.** `can_converse` must gate both `conversations INSERT` and `messages INSERT`. `conversations SELECT` may remain participant-based to preserve history (soft-lock for the cases in M5).
- **M-1.** Specify the RLS for `contact_requests`: SELECT for company / school; INSERT for company; UPDATE for company to cancel a `pending` row and for school to approve / reject a `pending` row; DELETE denied for all roles; a minor student does not see `pending` rows in PR 1.
- **M-2.** `SECURITY DEFINER` functions must declare an explicit `search_path`, hold the minimum required grants with explicit `REVOKE` from `PUBLIC` where needed, be marked `STABLE` when read-only, and contain no mutating statements.
- **M-3.** Indexes on `contact_requests`, especially a pair/status index for the `can_converse` lookup and a school/status index for the school's review queue. Shipped in the same migration as the new policies.
- **M-4.** `supabase/schema.sql` must be aligned for the sections PR 1 touches: `profiles.age`, `conversations.user1_id` / `user2_id` plus the unique index, `messages.kind` / `metadata`, `notifications` CHECK + `metadata`, `contact_requests` (table, columns, functions, policies).
- **M-5.** `notifications.metadata jsonb NOT NULL DEFAULT '{}'`; the CHECK must accept `contact_request` (with status in `metadata.status`); the migration that adds the column and extends the CHECK is idempotent.
- **M-6.** `is-minor` verification mechanism must be chosen explicitly at implementation time. Preferred: introduce a minimal test if the project already has a runner. Fallback: a documented set of verifiable cases runnable as a script. The choice and justification live in the PR 1 implementation notes.
- **Residual implementation questions** (must be resolved before code lands, but are not blockers for this ADR): `job_applications.status` for minor applicants, `rejection_reason` visibility, the approval trigger's create-or-reuse conversation mechanics, `respondInterview` / `cancelInterview` admin-client scope, and the default Colegio↔Egresado rule for `can_converse`.

This ADR records the architectural decisions that resolve the auditor's findings so PR 1 can move to implementation planning with the guardrails baked in. Questions that are decided here are referenced from `OPEN_QUESTIONS.md` (Q6–Q11); questions that remain open are listed in `OPEN_QUESTIONS.md` under "Residual implementation questions (PR 1)".

### Decision

#### C1 — Schema canonicity

- `supabase/migrations/` is the canonical, executable source of truth for the database schema in PR 1 and going forward.
- `supabase/schema.sql` is a derived snapshot. In PR 1, the snapshot must be regenerated for every section PR 1 touches (see M-4). Any drift between the two that PR 1 does not resolve is recorded in `docs/technical/KNOWN_ISSUES.md` and addressed in the next migration that touches the drifted section.

#### C2 — Enforcement layering: RLS primary + server actions as canonical UX

- The privacy guarantee for minor students is enforced primarily at the database layer (strong RLS). Server actions are the canonical UX entrypoint and must call the RLS-constrained / `auth.uid()`-bound client (see CR-1 / C3).
- `can_converse(a, b)` is the database-level predicate that gates `conversations INSERT` and `messages INSERT`. `conversations SELECT` remains participant-based so existing history is still visible to the participants (soft-lock for the cases in M5).
- Server actions must never compensate for a missing RLS policy: a flow that needs `can_converse` must rely on the policy, not on a pre-check in TS that can be bypassed by a direct Supabase client.

#### C3 — `proposeInterview` refactor: no admin client in PR 1

- `proposeInterview` is refactored to use the RLS-constrained server-action client bound to `auth.uid()`. The "idealmente" framing is removed: the entire contact/interview flow in PR 1 must run through that client. The admin client is permitted only with a concrete, narrow, documented reason; in PR 1 there is none for the contact/interview path, so the admin client is not used there.
- When the target candidate is a minor (see M1), `proposeInterview` must create or reuse a `contact_requests` row in the `pending` state, instead of opening a direct conversation, sending a direct message, or recording a direct interview.
- For a minor applicant, `job_applications.status` is **not** moved to `interviewing` until the school approves the corresponding `contact_request`. The application state is updated only on approval, not on the proposal.

#### C4 — `notifications.type` CHECK extension and DB-trigger emission

- The `notifications.type` CHECK is extended to accept `contact_request` (in the same migration that ships the RLS changes; idempotent per M-5). The status of a `contact_request` (pending / approved / rejected / cancelled) lives in `notifications.metadata.status`, not in a separate CHECK, to avoid CHECK inflation.
- `contact_request` notifications are emitted by a single database trigger so that the notification cannot be bypassed by a server-action bug or a direct client insert. The trigger is the only writer for the `contact_request` notification kind in PR 1.

#### M1 — `isMinor(role, age)` semantics

- Canonical definition: `isMinor(role, age) = role === 'Estudiante' && (age === null || age < 18)`.
- Implemented once in TypeScript (a shared helper used by server actions and the student-facing UI) and once in SQL (a function used by RLS, with the source columns `profiles.role` and `profiles.age`). The two implementations must agree on the predicate and on the source columns and are kept in sync by the PR 1 implementation notes.

#### M2 — `contact_requests` RLS

- `SELECT`: company (the requester) and school (the mediator).
- `INSERT`: company only.
- `UPDATE`: company may cancel a `pending` row; school may approve or reject a `pending` row.
- `DELETE`: denied for all roles.
- A minor student does not see `contact_requests` rows in the `pending` state in PR 1. Any future relaxation of student-side visibility is a follow-up PR, not part of PR 1.

#### M3 — `can_converse` enforcement surface and supporting indexes

- `can_converse(a, b)` gates `conversations INSERT` and `messages INSERT`. `conversations SELECT` may remain participant-based to preserve history (soft-lock per M5).
- Supporting indexes on `contact_requests`: a pair/status index used by the `can_converse` lookup and a school/status index used by the school's review queue. Both ship in the same migration as the new policies.

#### M4 — `schema.sql` alignment scope for PR 1

- The PR 1 migration and the regenerated `supabase/schema.sql` must agree on: `profiles.age`, `conversations.user1_id` / `user2_id` plus the unique index, `messages.kind` / `metadata`, `notifications` CHECK + `metadata`, `contact_requests` (table, columns, functions, policies), and the `is_minor` / `can_converse` functions.

#### M5 — Soft-lock for existing Empresa↔minor conversations

- Existing direct conversations between a company and a minor student are soft-locked: history remains visible to the participants (`conversations SELECT` by participant), but new messages are blocked by `can_converse` on `messages INSERT` until a `contact_request` is approved.
- On approval, the implementation reuses the existing conversation if one exists, or creates a new one. The trigger mechanics of "reuse-or-create" are an implementation detail captured in the implementation plan; they are not blockers for this ADR (see residual question in `OPEN_QUESTIONS.md`).

#### M6 — `is-minor` verification mechanism (selection deferred to implementation)

- The implementation chooses one of: (a) introduce a minimal test in the project's existing test runner if one is present; (b) a documented set of verifiable cases runnable as a script. The choice is made when the implementation plan is drafted, is justified in the PR 1 implementation notes, and answers the audit's preference for a minimal test where viable.

#### M7 — `notifications.metadata`

- `notifications.metadata jsonb NOT NULL DEFAULT '{}'`. The CHECK allows `contact_request` rows with a shape that includes `metadata.status` (`pending` | `approved` | `rejected` | `cancelled`). The migration that adds the column and extends the CHECK is idempotent.

#### M8 — `SECURITY DEFINER` function hygiene

- All `SECURITY DEFINER` functions introduced or modified in PR 1 declare an explicit `SET search_path = ...`, hold the minimum required grants with explicit `REVOKE` from `PUBLIC` where appropriate, are marked `STABLE` when read-only, and contain no mutating statements.

#### Secondary decisions (also accepted for PR 1)

- A minor student does not see `contact_requests` rows in the `pending` state in PR 1 (consistency with M2).
- A company may cancel a `contact_request` in the `pending` state (consistency with M2).
- `rejection_reason` is optional. When present, it is visible to the company and the school but not to the student in PR 1. A follow-up PR may revisit student-side visibility if product requires it.
- `can_converse` denies Colegio↔Egresado by default. Any future rule that allows it must be added explicitly to `can_converse` and to its tests; it is not a PR 1 deliverable.

### Consequences

Positive:
- The privacy guarantee is enforced where the data lives (RLS) and reinforced at the UX boundary (server actions + DB trigger), satisfying CR-1, CR-2 / C2, and C3.
- `can_converse` becomes a single, testable predicate with explicit insert-side coverage, while history preservation is preserved (M5).
- Drift between the canonical migrations and the snapshot is bounded to the sections PR 1 actually touches, and any residual drift is recorded in `KNOWN_ISSUES.md` (C1, M-4).
- `notifications.metadata` becomes the single place where per-event state lives, avoiding CHECK inflation (C4, M-5 / M-7).
- `SECURITY DEFINER` hygiene is enforced as a PR 1 guardrail (M-2 / M-8), reducing the surface area for privilege escalation.
- Student-side visibility, cancellation, and rejection-reason policies are pinned to a single place (M2 + secondary), avoiding drift between RLS, server actions, and the student-facing UI.

Negative / Trade-offs:
- Refactoring `proposeInterview` to drop the admin client is a behavior change for any caller that currently relies on the bypass. The implementation plan must enumerate those callers and add coverage.
- Soft-locking existing Empresa↔minor conversations is observable: history is preserved, but new messages stop until approval. User-facing copy that explains the soft-lock is out of scope for PR 1.
- The M6 verification mechanism is selected at implementation time. The audit's preference is "introduce a minimal test if viable", so the implementation plan must justify the choice and the residual question in `OPEN_QUESTIONS.md` must be answered.
- Some implementation details (the approval trigger's reuse-or-create mechanics, the test mechanism, the precise `respondInterview` / `cancelInterview` admin-client scoping) remain as residual questions and must be resolved before the code commit lands, but they do not block this ADR.

### Alternatives Considered

- Admin client retained for `proposeInterview`, with TS-level guards. Rejected: a TS guard is not a security boundary; it does not satisfy CR-1 / C3.
- Server actions as the sole enforcement, with relaxed RLS. Rejected: a server action can be bypassed by a direct Supabase client; the privacy guarantee must hold at the DB layer (C2).
- CHECK-based per-status column on `notifications`. Rejected: the CHECK inflates and duplicates state already represented by `contact_requests.status`; `metadata.status` is sufficient (C4, M-5 / M-7).
- Hard-migrating existing Empresa↔minor conversations to a school-mediated thread. Rejected for PR 1: it would alter or hide history; soft-lock + reuse-or-create on approval preserves history and is reversible.
- Allow Colegio↔Egresado by default in `can_converse`. Rejected: deny-by-default keeps the privacy surface small; any future allow rule must be added explicitly and tested, and is not a PR 1 deliverable (secondary decisions).
