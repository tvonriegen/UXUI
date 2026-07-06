# PR 2 — Feature Boundaries Architecture

- Status: **Architecture planning, implementation gate pending.**
- Date: 2026-07-05.
- Branch: `refactor/feature-boundaries` (stacked on `fix/privacy-contact-routing` while PR #2 is held by the external Vercel blocker; see `DECISION_LOG.md` ADR-003).
- PR: PR 2 — `refactor: split high-risk feature pages into modules`.
- Architect verdict basis: 2026-07-05 architecture-auditor **Aprobar con observaciones** for plan/docs; **BLOQUEAR** implementation until the gate conditions in this document are met.

This document is the architectural entry point for PR 2. It is the single place where the target folder tree, layer contracts, extraction order, risk matrix, acceptance criteria, validation checklist, and commit plan live. Companion updates land in `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, and the workflow files in `docs/workflow/`. PR 2 does **not** introduce schema, RLS, migration, or `package.json` dependency changes except a minimal pure-service test runner if the owner explicitly approves it (see Phase A Gate 2 and `OPEN_QUESTIONS.md` Q17).

## Context

PR 1 (`fix: privacy contact routing (minor students via school)`) introduced the privacy-sensitive `contact_requests` flow, the `can_converse` gate, the trigger-owned `contact_request` notification, and the RLS-constrained `proposeInterview`. The implementation is committed and pushed to `fix/privacy-contact-routing` (HEAD `7a881f6`), and PR #2 is opened against `caro-maturana` at `https://github.com/tvonriegen/UXUI/pull/2`. The `Vercel` GitHub check on PR #2 failed while the `Vercel Preview Comments` check passed; the Vercel project is owned by a teammate / partner's GitHub account and is not visible or fixable from this workspace. The local validation matrix is green (`verify:is-minor` 7/7, `lint`, `typecheck`, `build` with no dummy env). Tracked in `docs/technical/KNOWN_ISSUES.md` (External deployment issues) and `docs/workflow/OPEN_QUESTIONS.md` Q16.

Because the merge of PR #2 into `caro-maturana` is blocked by an external party, the user has accepted a stacked branch: `refactor/feature-boundaries` is cut from `fix/privacy-contact-routing` and PR 2's PR will be opened against `fix/privacy-contact-routing` (not `caro-maturana`) until PR #2 lands. After PR #2 merges, PR 2 is retargeted or rebased to `caro-maturana` if needed (see `OPEN_QUESTIONS.md` Q18).

PR 2 decomposes the high-risk feature pages surfaced by the architecture review and the PR 1 follow-up into focused modules with clear boundaries, so that the privacy-sensitive paths identified by PR 1 are isolated and reusable, and the high-risk feature pages stop accumulating complexity.

## Goals

- Extract the low-risk service / UI boundaries that wrap the PR 1 contact-routing flow into focused, reusable modules without changing server action public exports, RLS, or runtime behavior.
- Reduce the visible complexity of the high-risk feature pages (`profile`, `muro`, `empleos`, `administracion`, `messages`) by moving presentational or pure-logic concerns into route-local modules.
- Make the privacy-sensitive contact-routing flow easy to find, easy to test, and easy to reuse from other surfaces (e.g. `talent`, `dashboard/school`, future school approval surfaces, future interview proposal surfaces).
- Land a small safety net (characterization tests) for the contact-routing service layer before moving any logic that touches minor-student data, so the refactor is not blind.

## Non-goals

- **No schema / RLS / migration changes in PR 2.** The privacy guarantee remains where the data lives (RLS + DB trigger + `can_converse`), per `DECISION_LOG.md` ADR-002. PR 2 only moves code, not data guarantees.
- **No behavior / UI changes.** PR 2 is a refactor. The company → minor contact request still creates or reuses a `contact_requests` row in `pending`; the school approve / reject queue still drives the same flow; the talent page CTA still calls the same server action; `proposeInterview` still does not use the admin client.
- **No ProfilePage deep split.** `apps/web/src/app/profile/page.tsx` (~2888 lines, complexity 61) is the largest single file in the repository, but a meaningful role-aware split touches data shape, evidence state, and the student vs. graduate vs. company vs. school render path. That is a dedicated PR (PR 3 or later) and is **out of scope for PR 2**; see "Deferred Work" below. PR 2 may extract a small, low-risk presentational fragment from `profile/page.tsx` only if it lands without changing the render path or the data contract.
- **No new `package.json` dependencies by default.** A minimal pure-service test runner is a recommendation, not an assumption; see Phase A Gate 2 and `OPEN_QUESTIONS.md` Q17. If the owner accepts a runner, it must be a small, well-known, low-friction choice and must be recorded in `DECISION_LOG.md` ADR-003 as a sub-decision.
- **No push, no commit during this architecture pass.** Architecture is staged on disk only. Commit / push is the user's call.

## High-risk files (baseline measurement, 2026-07-05)

Line counts from this branch (`refactor/feature-boundaries`, HEAD `c795e14`); complexity from the architecture review.

| File | Lines | Complexity | Privacy-sensitive? | Target phase |
| --- | --- | --- | --- | --- |
| `apps/web/src/app/profile/page.tsx` | 2888 | 61 | partial (school_id) | **Deferred** to dedicated PR |
| `apps/web/src/app/muro/page.tsx` | 1373 | 36 | no | Phase B (optional) |
| `apps/web/src/app/empleos/page.tsx` | 1036 | 29 | partial (school_id, applications) | Phase B (optional) |
| `apps/web/src/app/administracion/page.tsx` | 1309 | 19 | no | Phase B (optional) |
| `apps/web/src/app/messages/page.tsx` | 680 | 20 | yes (conversations / messages) | Phase A (low-risk service) or Phase B |
| `apps/web/src/components/dashboard/DashboardColegio.tsx` | 443 | n/a | **yes** (PR 1 queue) | Phase A (presentational split) |
| `apps/web/src/app/talent/page.tsx` | 659 | n/a | **yes** (PR 1 server-action call) | Phase A (presentational split / hook) |
| `apps/web/src/app/actions/contact-requests.ts` | 155 | low | **yes** (PR 1 server action) | Phase A (extract `ensureConversation` and contact-policy decision) |

## Target folder tree (PR 2 land state)

The folder tree below is the target after PR 2 is complete. New files are marked with `★`. Files moved / rewritten are marked with `↻`. Everything not marked is unchanged. **No schema, RLS, migration, or `package.json` dependency file is touched** in PR 2.

```text
apps/web/src
├── app
│   ├── actions
│   │   ├── contact-requests.ts                ↻ (exports unchanged; delegates to services)
│   │   ├── interviews.ts                      (unchanged, PR 1 already RLS-constrained)
│   │   ├── company.ts                         (unchanged)
│   │   └── school.ts                          (unchanged)
│   ├── profile
│   │   ├── page.tsx                           (unchanged, deferred)
│   │   └── _components
│   │       ├── BadgesGrid.tsx                 (unchanged)
│   │       └── PortfolioGrid.tsx              (unchanged)
│   ├── muro
│   │   ├── page.tsx                           ↻ (uses _components, _hooks, _types, _utils)
│   │   ├── _components
│   │   │   └── PostComposer.tsx               ★ (extracted in Phase B if pursued)
│   │   ├── _hooks
│   │   │   └── useMuroFeed.ts                 ★ (extracted in Phase B if pursued)
│   │   ├── _types
│   │   │   └── muro.ts                        ★ (extracted in Phase B if pursued)
│   │   └── _utils
│   │       └── feed.ts                        ★ (extracted in Phase B if pursued)
│   ├── empleos
│   │   ├── page.tsx                           ↻ (uses _components, _hooks, _types, _utils)
│   │   ├── _components
│   │   │   └── JobCard.tsx                    ★ (extracted in Phase B if pursued)
│   │   ├── _hooks
│   │   │   └── useJobList.ts                  ★ (extracted in Phase B if pursued)
│   │   ├── _types
│   │   │   └── job.ts                         ★ (extracted in Phase B if pursued)
│   │   └── _utils
│   │       └── filters.ts                     ★ (extracted in Phase B if pursued)
│   ├── administracion
│   │   ├── page.tsx                           ↻ (uses _components, _hooks, _types, _utils)
│   │   ├── _components
│   │   │   └── AdminPanel.tsx                 ★ (extracted in Phase B if pursued)
│   │   ├── _hooks
│   │   │   └── useAdminData.ts                ★ (extracted in Phase B if pursued)
│   │   ├── _types
│   │   │   └── admin.ts                       ★ (extracted in Phase B if pursued)
│   │   └── _utils
│   │       └── formatters.ts                  ★ (extracted in Phase B if pursued)
│   ├── messages
│   │   └── page.tsx                           (unchanged unless Phase A picks the conversations / messages surface)
│   └── talent
│       └── page.tsx                           ↻ (uses `useContactTalent` hook; no behavioral change)
├── components
│   ├── contact-routing                        ★ (new module)
│   │   ├── ContactRequestQueue.tsx            ★ (extracted from DashboardColegio)
│   │   ├── ContactTalentButton.tsx            ★ (extracted from talent page; thin wrapper around the server action)
│   │   └── types.ts                           ★ (shared types for the contact-routing UI)
│   ├── dashboard
│   │   ├── DashboardColegio.tsx               ↻ (uses ContactRequestQueue)
│   │   └── (others)                           (unchanged)
│   ├── talent
│   │   └── (existing)                         (unchanged)
│   └── (other components folders)             (unchanged)
└── lib
    ├── services                               ★ (new module)
    │   ├── conversations.ts                   ★ (ensureConversation pure, RLS-aware)
    │   ├── contact-policy.ts                  ★ (pure decision: who-can-contact-whom logic)
    │   └── contact-requests.ts                ★ (the contact-requests service used by the server action)
    ├── hooks
    │   ├── useContactTalent.ts                ★ (encapsulates the requestContactWithTalent call)
    │   ├── useQuestProgress.ts                (unchanged)
    │   └── useSound.ts                        (unchanged)
    ├── utils
    │   ├── is-minor.ts                        (unchanged, PR 1)
    │   └── matching.ts                        (unchanged)
    └── (other lib files)                      (unchanged)
```

Notes on the tree:

- `apps/web/src/lib/services` is **new**. It is a thin layer for pure / RLS-aware services that the server actions call. It is not a "domain model" attempt; it is just code motion for the dedup / decision logic that is already inside the server action.
- `apps/web/src/components/contact-routing` is **new**. It groups the presentational and hook surface of the contact-routing flow so that future surfaces (school approval, talent page CTA, dashboard queue, future interview proposal surface) all import from one place.
- The route-local `_components` / `_hooks` / `_types` / `_utils` folders are only created in **Phase B** (and only for `muro`, `empleos`, `administracion` if pursued). `profile/page.tsx` is intentionally not in Phase B; see "Deferred Work".
- Server action public exports stay byte-identical: `requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest`. Internally, the action body shrinks as it delegates to `lib/services/contact-requests.ts` and `lib/services/conversations.ts`. No call site changes.

## Layer contracts

### `lib/services/conversations.ts` — `ensureConversation`

- **Pure relative to PR 1 guarantees.** Takes a Supabase server-action client (the RLS-constrained one bound to `auth.uid()`) and two user ids. Returns the existing `conversations.id` if one exists for the canonical `(user1_id, user2_id)` pair, or inserts one and returns the new id. If the insert loses a race, the function re-reads the row and returns it.
- **No behavior change.** The body is moved from `apps/web/src/app/actions/contact-requests.ts::ensureConversation` (private) to `lib/services/conversations.ts` (exported). Canonical pair ordering, race-handling, and `last_message_at` initialization are preserved.
- **No new dependencies.** Uses only `@supabase/supabase-js` types already in use.
- **Testable.** The function takes its Supabase client as an argument and never imports the server-only `cookies()` helper, so it can be unit-tested with a fake client.

### `lib/services/contact-policy.ts` — pure decision logic

- **Pure.** No Supabase client, no `cookies()`, no `Date.now()` of interest. Inputs are the caller's role / id and the talent's role / age / school_id. Outputs are the decision: `{ kind: "direct" | "needs_school_approval" | "self" | "missing_school" | "unknown_role" }`.
- **No behavior change.** Mirrors the if/else cascade currently inlined in `requestContactWithTalent` for the `Empresa` ↔ minor branch. The server action still calls the policy and then dispatches the right code path.
- **Single source of truth.** The TS predicate is the one in `apps/web/src/lib/utils/is-minor.ts`. PR 2 imports it; it does not re-define it.
- **Testable.** Pure function: in / out, no IO. This is the file that the characterization test targets first (see Phase A Gate 2).

### `lib/services/contact-requests.ts` — service wrapper used by the server action

- **Thin wrapper.** Receives the RLS-constrained Supabase server-action client and the `auth.uid()`-bound user. Calls `contact-policy` to decide the path, then calls the `contact_requests` table for the dedup / insert path, and `conversations` (via `ensureConversation`) for the direct / approved path.
- **No behavior change.** The server action `requestContactWithTalent` becomes a thin shell that calls this service and translates errors. Public exports and return shapes are preserved.
- **No new dependencies.** Uses only `@supabase/supabase-js` types already in use.

### `lib/hooks/useContactTalent.ts` — UI hook

- **Encapsulates the server-action call.** `useContactTalent` returns `{ request, isRequesting, error }`. The talent page CTA uses the hook instead of calling `requestContactWithTalent` directly. The hook does not change the server-action contract or the user-visible behavior.
- **No behavior change.** Same shape returned by the server action, same error handling on the talent page.

### `components/contact-routing/ContactRequestQueue.tsx` — presentational component

- **Props-in, callbacks-out.** Receives `items: ContactRequestQueueItem[]`, `onApprove`, `onReject`, and the existing `reviewingId` / `reviewError` state plumbing is lifted into the parent (`DashboardColegio`) or kept inside the component (decision deferred to the implementation). Either way, no change in user-visible behavior: same loading skeleton, same review buttons, same error toast.
- **No data-shape change.** The `ContactRequestItem` type is renamed to `ContactRequestQueueItem` in the new module's `types.ts` and re-exported; `DashboardColegio` uses the new name. Other surfaces (if any) keep their own types.
- **No styling drift.** Existing Tailwind classes are preserved verbatim.

### `components/contact-routing/ContactTalentButton.tsx` — presentational component

- **Thin wrapper around the server action call.** Props: `talentId`, optional `message`, plus the existing button className / label / disabled states. Internally calls the server action via `useContactTalent` or directly; the implementation choice is recorded in the PR 2 implementation notes.
- **No behavior change.** Same user-visible button, same loading state, same toast on success / error.

## Phase A — low-risk extraction around the PR 1 flow (recommended first)

Phase A is the minimum PR 2 that the architect verdict approves. It is small, reversible, and wraps the privacy-sensitive code in reusable modules so future surfaces (and Phase B) can compose them.

### Phase A — scope

1. **`lib/services/conversations.ts` (new).** Move `ensureConversation` from the private body of `apps/web/src/app/actions/contact-requests.ts` into an exported function. Keep the race-handling, canonical pair ordering, and `last_message_at` semantics byte-identical.
2. **`lib/services/contact-policy.ts` (new).** Pure decision function that mirrors the if/else cascade in `requestContactWithTalent` for the Empresa ↔ minor branch. Returns a tagged union describing the path: direct conversation, needs school approval, self, missing school, unknown role. No IO. Uses the existing `isMinorProfile` from `lib/utils/is-minor.ts`.
3. **`lib/services/contact-requests.ts` (new).** Thin service wrapper that the server action delegates to. Calls `contact-policy` to decide the path, then the `contact_requests` table for dedup / insert, then `conversations.ensureConversation` for direct / approved. No public-API change to the server action.
4. **`components/contact-routing/ContactRequestQueue.tsx` (new).** Extract the pending contact-request list and approve / reject UI from `DashboardColegio` into a focused component. Same Tailwind classes, same loading skeleton, same review buttons. `DashboardColegio` imports the new component and removes the inline JSX.
5. **`lib/hooks/useContactTalent.ts` (new) and / or `components/contact-routing/ContactTalentButton.tsx` (new).** Encapsulate the talent page CTA call to `requestContactWithTalent`. Implementation choice (hook only, component only, or both) is captured in the PR 2 implementation notes; the user-visible CTA is unchanged.
6. **Server action public exports remain stable.** `requestContactWithTalent`, `approveContactRequest`, `rejectContactRequest`, `cancelContactRequest` keep their names, signatures, and return shapes. Internal body shrinks as it delegates to the new services.

### Phase A — gate conditions (must be true before code lands)

- **Gate 1 — Stacked branch accepted.** The user has accepted that `refactor/feature-boundaries` is cut from `fix/privacy-contact-routing` and PR 2 is opened against `fix/privacy-contact-routing` until PR #2 lands. Captured in `DECISION_LOG.md` ADR-003 (sub-decision "Stacked branch policy").
- **Gate 2 — Test mechanism decided.** Either (a) the owner accepts a minimal pure-service test runner (e.g. `node --test`, `vitest` with no extra deps beyond what's already in the lockfile, or a documented script-style verify script), or (b) PR 2 keeps the `verify:*` script approach used by PR 1 and adds a `verify:contact-policy` script for the canonical cases. The decision is captured in `DECISION_LOG.md` ADR-003 (sub-decision "Test mechanism") and in `OPEN_QUESTIONS.md` Q17.
- **Gate 3 — No behavior change documented.** The PR 2 implementation notes include a side-by-side before / after for each public function: same inputs, same outputs, same Supabase calls in the same order, same error messages.
- **Gate 4 — Validation green.** `npm run verify:is-minor` (PR 1), the new `verify:contact-policy` if added, `npm run typecheck`, `npm run lint`, and `npm run build` all pass. If a test runner was accepted, the corresponding test command passes too. No dummy env values required.

### Phase A — risk matrix

| Extraction | Behavior change risk | Reversibility | Testability | Notes |
| --- | --- | --- | --- | --- |
| `lib/services/conversations.ts` (move) | Low | High (one file moved) | High (pure relative to client) | Canonical pair ordering and race-handling must be preserved byte-for-byte. |
| `lib/services/contact-policy.ts` (new) | Low | High (one new file, no callers yet) | High (pure) | Mirror the if/else cascade in the server action; do not add new branches. |
| `lib/services/contact-requests.ts` (new) | Low | High (server action still in control) | Medium (Supabase client dependency) | Service takes client as argument; no `cookies()` import. |
| `ContactRequestQueue.tsx` (presentational split) | Low | High (component replacement) | Medium (DOM / interaction) | Preserve Tailwind classes; same loading skeleton; same review buttons. |
| `useContactTalent` / `ContactTalentButton` | Low | High (hook / component replacement) | Medium (interaction) | CTA label, disabled state, and toast text are preserved. |

### Phase A — commit plan

Five atomic commits, in this order, each runnable on its own:

1. `refactor(web): move ensureConversation to lib/services/conversations.ts` — pure code motion; server action imports from the new location. Public export unchanged.
2. `refactor(web): extract contact-policy pure decision logic` — new `lib/services/contact-policy.ts`; server action calls it; behavior unchanged.
3. `refactor(web): route contact-requests server action through services` — new `lib/services/contact-requests.ts`; server action becomes a thin shell; public exports unchanged.
4. `refactor(web): extract ContactRequestQueue presentational component` — new `components/contact-routing/ContactRequestQueue.tsx`; `DashboardColegio` uses it; no Tailwind or behavior change.
5. `refactor(web): encapsulate talent page contact CTA in hook and component` — `useContactTalent` and / or `ContactTalentButton` added; talent page CTA delegates; user-visible behavior unchanged.

If a verification script is added (e.g. `verify:contact-policy`), it lands as a separate `chore` commit on top, not folded into the refactor commits.

### Phase A — acceptance criteria

- Public exports of `apps/web/src/app/actions/contact-requests.ts` are byte-identical (names, parameter order, return shapes).
- `apps/web/src/app/actions/contact-requests.ts` line count is reduced by at least the size of the moved body (target: ≤ 80 lines for `requestContactWithTalent`, full file ≤ 200 lines, of which most is the four thin action shells).
- `apps/web/src/components/dashboard/DashboardColegio.tsx` line count is reduced by the size of the extracted JSX (target: −80 to −120 lines, depending on the JSX extracted). New component file is +80 to +150 lines.
- `apps/web/src/app/talent/page.tsx` CTA call site is reduced to a single hook call or a single component import; user-visible behavior unchanged.
- No new `package.json` dependencies (unless Gate 2 explicitly approves a test runner).
- No changes to `supabase/migrations/`, `supabase/schema.sql`, RLS policies, or any file under `apps/web/src/app/api/`.
- `npm run verify:is-minor` (PR 1) still green; `npm run typecheck` green; `npm run lint` green; `npm run build` green (no dummy env).
- If a test runner was accepted: the new tests cover at least: minor / non-minor / self / missing-school branches of `contact-policy`; `ensureConversation` reuse and race-recovery paths with a fake client; the server action's error translation.
- Documentation: `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, and `docs/workflow/PR_TRACKER.md` updated as the commits land; `docs/workflow/SESSION_LOG.md` records the implementation pass.

## Phase B — route-local presentational splits (optional, only if Phase A is small and green)

Phase B is **optional**. It exists to keep PR 2 from growing past the architect's "small and reversible" tolerance. If Phase A is too large to merge cleanly, Phase B is dropped and lands in a follow-up PR.

### Phase B — scope (only if pursued)

- `apps/web/src/app/muro/page.tsx` (1373 lines) — extract `PostComposer`, `useMuroFeed`, `muro` types, and `feed` utilities into `apps/web/src/app/muro/_components`, `_hooks`, `_types`, `_utils`. The page becomes a thin composition root.
- `apps/web/src/app/empleos/page.tsx` (1036 lines) — extract `JobCard`, `useJobList`, `job` types, and `filters` utilities. The page becomes a thin composition root.
- `apps/web/src/app/administracion/page.tsx` (1309 lines) — extract `AdminPanel`, `useAdminData`, `admin` types, and `formatters`. The page becomes a thin composition root.
- `apps/web/src/app/messages/page.tsx` (680 lines) — only extract a `useConversationList` hook and a `ConversationList` presentational component if the conversations / messages surface starts sharing helpers with the contact-routing services. If not, leave the file alone.

### Phase B — gate conditions

- **Gate B1 — Phase A is merged (or at minimum, locally green and the user accepts Phase B on the stacked branch).**
- **Gate B2 — Each route split is independent and revertible.** A bad split in `muro` must not block `empleos` or `administracion`. Each route ships as its own commit.
- **Gate B3 — No new tests required.** Phase B is presentational; the existing test surface (PR 1 `verify:is-minor`, optional Phase A `verify:contact-policy`) is enough.
- **Gate B4 — No new dependencies.** Same rule as Phase A.

### Phase B — risk matrix

| Route | Risk | Reversibility | Notes |
| --- | --- | --- | --- |
| `muro/page.tsx` | Low–Medium | High | Mostly presentational; the feed effects stay in the page or move to `_hooks` without changing call sites. |
| `empleos/page.tsx` | Low–Medium | High | Filter and sort logic is pure; safe to extract. |
| `administracion/page.tsx` | Low | High | Mostly form / table UI; safe to extract. |
| `messages/page.tsx` | Medium | High | Only if the conversations / messages surface starts sharing helpers with contact-routing. Otherwise leave alone. |

### Phase B — commit plan

Three independent commits, in this order, each runnable on its own:

1. `refactor(web): split muro page into route-local modules` — presentational split only; `muro/page.tsx` becomes a composition root.
2. `refactor(web): split empleos page into route-local modules` — presentational split only; `empleos/page.tsx` becomes a composition root.
3. `refactor(web): split administracion page into route-local modules` — presentational split only; `administracion/page.tsx` becomes a composition root.

If the `messages` surface is touched, it lands as a fourth, separate commit, not folded into the others.

## Deferred work (explicitly out of PR 2)

- **`apps/web/src/app/profile/page.tsx` deep split (2888 lines, complexity 61).** A role-aware split (Estudiante vs. Egresado vs. Empresa vs. Colegio) touches data shape, evidence state, and the render path. The architect verdict is to defer this to a dedicated PR (PR 3 or later) and not attempt it in PR 2. PR 2 may extract a small, low-risk presentational fragment from `profile/page.tsx` only if it lands without changing the render path or the data contract, and only if it does not grow PR 2 past the "small and reversible" tolerance.
- **`respondInterview` / `cancelInterview` admin-client review.** Out of PR 1 scope (`OPEN_QUESTIONS.md` Q14); tracked in `docs/technical/KNOWN_ISSUES.md`. Not a PR 2 deliverable; PR 2 may not touch these.
- **Broader schema snapshot drift.** Tracked in `KNOWN_ISSUES.md` (residual drift between `supabase/schema.sql`, `supabase/full_reset.sql`, and older migrations). Not a PR 2 deliverable; PR 2 may not touch this.
- **Dependency vulnerability triage (21 vulnerabilities).** Tracked in `KNOWN_ISSUES.md`; scheduled as a separate chore PR.
- **`talent/page.tsx` deeper refactor.** The activities playground, the search / filter logic, and the match / quiz activities are large but not privacy-sensitive and not in the PR 2 critical path. Touch only the CTA call site; defer the rest.

## Validation checklist

PR 2 implementation must satisfy the following before merge:

- `npm run verify:is-minor` (PR 1) — still green.
- `npm run verify:contact-policy` (Phase A Gate 2) — if added, all canonical cases pass.
- `npm run typecheck` — green.
- `npm run lint` — green.
- `npm run build` — green, no dummy env values required.
- If a test runner was accepted by Gate 2: the corresponding test command passes on the new services (`contact-policy`, `ensureConversation`, the `contact-requests` service).
- Public exports of `apps/web/src/app/actions/contact-requests.ts` byte-identical to PR 1 HEAD.
- No changes to `supabase/migrations/`, `supabase/schema.sql`, RLS policies, or `apps/web/src/app/api/`.
- No new `package.json` dependencies (unless Gate 2 explicitly approved).
- `docs/architecture/CODEBASE_MAP.md`, `docs/technical/REFACTORING_PLAN.md`, `docs/workflow/PR_TRACKER.md`, `docs/workflow/SESSION_LOG.md`, and `docs/requirements/TRACEABILITY_MATRIX.md` updated to reflect what landed.

## Risk register (cumulative)

- **External Vercel blocker remains.** PR 2 is stacked on `fix/privacy-contact-routing` because PR #2 cannot land in `caro-maturana` while the Vercel check is failing. Retargeting / rebasing to `caro-maturana` is a follow-up step after PR #2 lands; see `OPEN_QUESTIONS.md` Q18.
- **Test runner decision is unresolved.** Phase A Gate 2 is a hard gate. If the owner does not pick a mechanism, Phase A cannot start coding; PR 2 is held in architecture planning. Resolution path: `OPEN_QUESTIONS.md` Q17 + `DECISION_LOG.md` ADR-003 (sub-decision "Test mechanism").
- **`profile/page.tsx` deep split deferred.** The largest single file in the repo stays large after PR 2. The deferred split must be tracked in `OPEN_QUESTIONS.md` and a follow-up PR must be opened in `PR_TRACKER.md` to avoid losing the work.
- **Stacked branch may need to retarget.** If `caro-maturana` advances (e.g. dependency triage PR) before PR #2 lands, the stacked branch will need a rebase. The rebase risk is low because PR 2 does not touch `supabase/`, `package.json`, or `apps/web/src/app/api/`, but it is real and must be planned for.
- **Phase B growth risk.** If Phase A is larger than the "small and reversible" tolerance, Phase B is dropped. The gate is the commit count and the diff size, not a calendar date.

## Open decisions (gates to resolve before code lands)

- **Gate 1 — Stacked branch policy.** Already accepted by the user (2026-07-05). Captured in `DECISION_LOG.md` ADR-003 (sub-decision "Stacked branch policy"). Not a blocker.
- **Gate 2 — Test mechanism.** Open. See `OPEN_QUESTIONS.md` Q17. Must be answered before Phase A code lands.
- **Gate 3 — No behavior change.** Process gate; resolved by the implementation notes. Not a separate question.
- **Gate 4 — Validation green.** Process gate; resolved at the implementation pass. Not a separate question.
- **Open question — Retarget / rebase policy when PR #2 lands.** Open. See `OPEN_QUESTIONS.md` Q18. Resolution is mechanical: rebase / retarget to `caro-maturana` after PR #2 is merged. Not a blocker for the architecture pass.

## References

- `docs/architecture/CODEBASE_MAP.md` — current map (PR 1 contact-routing additions; PR 2 planned boundaries).
- `docs/architecture/SECURITY_MODEL.md` — PR 1 contact-routing decisions (C1–C4, M1–M8).
- `docs/architecture/TARGET_ARCHITECTURE.md` — long-term target architecture.
- `docs/architecture/CURRENT_STATE.md` — current state of the app.
- `docs/technical/REFACTORING_PLAN.md` — phases 1–3 (PR 2 phases A / B appended).
- `docs/technical/KNOWN_ISSUES.md` — Vercel external blocker, residual schema drift, dependency vulnerabilities.
- `docs/workflow/DECISION_LOG.md` — ADR-002 (PR 1), ADR-003 (PR 2 stacked branch + boundaries).
- `docs/workflow/OPEN_QUESTIONS.md` — Q12–Q16 resolved; Q17 (test mechanism) and Q18 (retarget) open.
- `docs/workflow/STATUS.md` — current branch `refactor/feature-boundaries`; phase PR 2 architecture planning.
- `docs/workflow/NEXT_ACTIONS.md` — immediate actions for the PR 2 architecture pass.
- `docs/workflow/PR_TRACKER.md` — PR 2 row and detail section.
- `docs/workflow/SESSION_LOG.md` — PR 2 architecture setup entry.
- `docs/requirements/TRACEABILITY_MATRIX.md` — PR 2 added as a technical-enabler row.
