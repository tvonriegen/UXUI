# Security Model

## Principles

- Browser code can only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed with `NEXT_PUBLIC_`.
- Authorization must be enforced server-side for API routes, server actions and Supabase policies.

## Current Controls

- Supabase SSR/browser clients are separated in `src/lib/supabase.ts` and `src/lib/supabase-server.ts`.
- Security headers are configured in `apps/web/next.config.js`.
- AI chat is disabled unless both public and server feature flags are enabled.

## Required Reviews

- Review all RLS policies before production use.
- Verify that school/company scoping is enforced server-side, not only in UI.
- `/api/seed` is unauthenticated only in local development; deployed environments require `SEED_SECRET` and reject missing configuration.

## PR 1 Contact Routing Decisions

Brief summary of the architectural decisions that resolve the 2026-07-05 architecture-auditor verdict on PR 1 (`fix: privacy contact routing (minor students via school)`). The full record — context, decision, consequences, and alternatives — lives in `docs/workflow/DECISION_LOG.md` ADR-002. Implementation details (table DDL, function bodies, test cases) are intentionally **not** in this section; they belong in the PR 1 implementation plan.

- **Schema canonicity (C1).** `supabase/migrations/` is the canonical, executable source. `supabase/schema.sql` is a derived snapshot regenerated in PR 1 for the sections PR 1 touches (M-4); residual drift is recorded in `KNOWN_ISSUES.md`.
- **Enforcement layering (C2).** Privacy guarantee is enforced primarily at the database layer (strong RLS). Server actions are the canonical UX entrypoint and use the RLS-constrained / `auth.uid()`-bound client. `can_converse(a, b)` gates `conversations INSERT` and `messages INSERT`; `conversations SELECT` remains participant-based to preserve history (soft-lock per M5).
- **`proposeInterview` refactor (C3).** `apps/web/src/app/actions/interviews.ts::proposeInterview` is refactored to the RLS-constrained server-action client bound to `auth.uid()`. The admin client is out of scope for the PR 1 contact / interview path. For minor candidates, the action creates or reuses a `contact_requests` row in `pending` and does not move `job_applications.status` to `interviewing` until approval.
- **Notifications (C4, M-5, M-7).** `notifications.type` CHECK is extended to accept `contact_request`; status lives in `notifications.metadata.status`. `notifications.metadata jsonb NOT NULL DEFAULT '{}'`. The migration is idempotent. `contact_request` notifications are emitted by a single database trigger.
- **`isMinor` predicate (M1).** Canonical definition `role === 'Estudiante' && (age === null || age < 18)`, implemented once in TypeScript (shared helper) and once in SQL (RLS function on `profiles.role` and `profiles.age`).
- **`contact_requests` RLS (M2).** SELECT for company / school; INSERT for company; UPDATE for company (cancel `pending`) and school (approve / reject); DELETE denied. A minor student does not see `pending` rows in PR 1.
- **Indexes (M3).** `contact_requests` pair/status for `can_converse` lookup; school/status for the school's review queue. Shipped in the same migration as the new policies.
- **Soft-lock for existing Empresa↔minor conversations (M5).** History visible to the participants; new messages blocked by `can_converse` on `messages INSERT` until a `contact_request` is approved. On approval, the implementation reuses the existing conversation if one exists, or creates a new one.
- **`SECURITY DEFINER` hygiene (M-8).** Explicit `search_path`, minimum grants, explicit `REVOKE` from `PUBLIC` where needed, `STABLE` for read-only helpers, no mutations.
- **Secondary.** A minor student does not see `contact_requests` rows in the `pending` state in PR 1. A company may cancel a `pending` row. `rejection_reason` is optional; when present, visible to the company and the school, not to the student in PR 1. `can_converse` denies Colegio↔Egresado by default; any future allow rule is out of scope for PR 1.
- **Implementation resolution (validated, 2026-07-26).** The contact-routing and readiness flows use no-new-dependency verification scripts. The approval trigger reuses or creates the canonical company-student conversation. `proposeInterview`, `respondInterview` and `cancelInterview` use the RLS-constrained server client. Local QA passed for all verification scripts, lint, typecheck and build. Runtime Supabase migration / RLS / trigger verification on a live staging instance remains external follow-up.

## PR 1B Interview INSERT Hardening

- **Bypass fixed.** The original `interviews_insert_company` policy only required `auth.uid() = company_id`, allowing a company to insert an interview for any application, substitute the student, choose an arbitrary initial status, or target another company's job. `supabase/migrations/20260705000002_interviews_privacy_rls.sql` replaces it with a policy that requires:
  - `auth.uid() = company_id` and `status = 'proposed'`;
  - the application exists and belongs to the caller's job posting (`job_applications` → `job_postings`);
  - the interview's `student_id` matches the application's canonical `applicant_id`;
  - `can_converse(company_id, student_id)` is true.
- **UPDATE integrity.** `interviews_update_participant` is participant-scoped. `trg_interviews_guard_immutable` prevents changes to `application_id`, `company_id`, `student_id` and `created_at`. `trg_interviews_guard_status` restricts lifecycle transitions to the authenticated participant and the current status.
- **Allowed status transitions.** A student can respond to `proposed` with `accepted` or `declined`, or cancel an active interview. A company can cancel, complete or reschedule only from allowed active states. Arbitrary status changes are rejected by the database trigger.
- **Verification.** Structural validation is provided by `scripts/verify-interviews-privacy-rls.mjs` (`npm run verify:interviews-privacy-rls`). Runtime RLS / trigger smoke testing on a live Supabase staging instance remains pending.
