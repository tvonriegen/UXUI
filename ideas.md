# ClassLink — Ideas & Suggestions

Creative feature ideas and UX improvements surfaced during development. Each entry includes context, rationale, and rough effort estimate.

---

## Effort Legend

| Label | Meaning |
|-------|---------|
| `S` | Small — a few hours, self-contained |
| `M` | Medium — 1–2 days, touches a few files |
| `L` | Large — multi-day, may need DB changes or new pages |

---

## Pending Ideas

### [M] RUT auto-formatter as the user types — `src/components/admin/SmartImporter.tsx`
- **Rationale:** Chilean RUTs are easier to verify visually when formatted as `XX.XXX.XXX-Y`. An onInput handler that formats the raw digits in real time reduces transcription errors. The check digit could also be auto-computed when the body digits are complete, offering a "Did you mean XX.XXX.XXX-K?" prompt.
- **Effort:** M — shared utility function + input mask component reusable in the importer and the admin edit modal.

### [M] Soft-delete / archive for posts and messages — `supabase/schema.sql`
- **Rationale:** Currently all deletes are hard deletes (no `deleted_at`). If any compliance requirement around data retention emerges, this will be a painful retroactive migration. Adding `deleted_at TIMESTAMPTZ` columns now (filtered in RLS) is cheap while the table is small.
- **Effort:** M — migration + RLS filter update + UI "undo delete" affordance within a 5-second window.

### [S] Auto-archive notifications older than 90 days — `supabase/`
- **Rationale:** The `notifications` table has no expiry mechanism and will accumulate indefinitely. A Supabase `pg_cron` job running weekly (`DELETE WHERE created_at < NOW() - INTERVAL '90 days'`) costs nothing and keeps the table lean.
- **Effort:** S — one-line SQL scheduled with `pg_cron`.

### [M] Structured LLM output for skill-gap analysis — `src/app/api/chat/route.ts`
- **Rationale:** The AI chatbot (Epic 3) will have access to student skill data and job requirements. A follow-up feature could request a structured JSON diff (skills student has vs. skills job requires) and render it as a "Gap Radar" chart in the Company dashboard, giving recruiters an at-a-glance fit score.
- **Effort:** M — extend chatbot tool schema + add a `SkillGapRadar` visualization component.

### [L] Async batch import with background job + email notification — `src/app/actions/school.ts`
- **Rationale:** Bulk creating 200+ students synchronously in the HTTP request window can hit Vercel's 30-second function timeout. A proper solution queues the import as a Supabase Edge Function job, processes it in the background, and emails the admin a results report when done.
- **Effort:** L — Edge Function + Supabase Queues (or pg_cron polling) + email via Resend/SendGrid.

### [M] Conversation search / message full-text search — `src/app/messages/page.tsx`
- **Rationale:** Once a school has 50+ students in the messaging sidebar, being able to search for a past message ("did I send the graduation form to Ana?") becomes critical. PostgreSQL's `tsvector` on `messages.content` can power this cheaply.
- **Effort:** M — migration to add a GIN index + `tsquery` search route + search UI in the message panel.

### [S] Theme-aware chatbot widget color — `src/components/chat/ChatWidget.tsx`
- **Rationale:** The profile customization system (migration 20260423) allows users to pick a `theme_color`. The chat bubble should read `profiles.theme_color` and apply the matching gradient so it feels like part of the user's personal workspace, not a bolted-on tool.
- **Effort:** S — pass `theme_color` from RoleContext into ChatWidget and map it to a Tailwind class.

### [M] Chatbot conversation persistence — `src/app/api/chat/route.ts`
- **Rationale:** The current chatbot stores conversation history only in React state (lost on page refresh). A `chat_sessions` table (or repurposing the existing `conversations` table with `kind: 'ai'`) would let users resume conversations across sessions and give the school/company a log of AI-assisted decisions.
- **Effort:** M — new table + server action to persist turns + UI to list past sessions.

### [S] Bulk Excel validation report download — `src/components/admin/SmartImporter.tsx`
- **Rationale:** After an import, the error report is only displayed in the UI and disappears when the modal is closed. A "Descargar reporte" button that generates a .xlsx with the failed rows + error messages would let admins fix the source file without re-reading the screen.
- **Effort:** S — use the already-installed `xlsx` library to generate the download client-side.

### [S] Profanity word list expansion with user reporting — `src/lib/utils/profanity.ts`
- **Rationale:** The current profanity filter uses a static list. A user-report mechanism ("Report this post") could flag posts for manual review and feed new terms into the filter, creating a community-moderated system.
- **Effort:** S — report button + `post_reports` table + admin review queue in `/administracion`.

### [M] Push notifications (browser) for real-time alerts — `src/lib/role-context.tsx`
- **Rationale:** The Supabase Realtime subscription already fires on new notifications. Wrapping it with the Web Push API would allow notifications to appear even when the tab is not active, making important events (interview proposal, application status change) much harder to miss.
- **Effort:** M — service worker + VAPID keys + Supabase edge function for push dispatch.

---

## Implemented Ideas

### [S] AI agent button visible for all roles with mock interactivity — ~~`src/components/chat/ChatWidget.tsx`~~
- **Rationale:** Was implemented but subsequently removed per teacher feedback (chatbot removed entirely from app). ChatWidget.tsx and /api/chat/route.ts deleted in commit `09ac8ceb`.
- **Status:** Removed.
