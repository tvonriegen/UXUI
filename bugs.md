# ClassLink — Bug Tracker

Bugs are discovered during task work and annotated here. Each entry includes severity, location, description, and reproduction steps where known. Resolved bugs are moved to the **Resolved** section.

---

## Severity Legend

| Label | Meaning |
|-------|---------|
| `critical` | App crash, data loss, auth bypass |
| `high` | Feature broken, bad UX with no workaround |
| `medium` | Feature partially broken or inconsistent |
| `low` | Visual glitch, minor inconsistency |

---

## Open Bugs

### [high] `profiles` table missing mandatory student fields — `src/app/actions/school.ts`
- **Discovered:** Phase 1 exploration — Epic 1 kick-off
- **File/line:** `supabase/schema.sql:17-54`, `src/app/actions/school.ts:14-21`
- **Description:** `createStudent` and `bulkCreateStudents` only accept `firstName`, `lastName`, `email`, `tempPassword`, `specialty`, `grade`. The fields `rut`, `gender`, `cellphone`, `class_name`, and `age` are either missing from the DB schema or present but never validated/required on creation.
- **Repro:** Create a student via SmartImporter — no RUT, gender, cellphone, age, or class_name is collected.
- **Fix:** New migration + schema + action updates (Epic 1).

### [high] `SmartImporter` only accepts CSV — `src/components/admin/SmartImporter.tsx:180`
- **Discovered:** Phase 1 exploration
- **File/line:** `src/components/admin/SmartImporter.tsx:180`
- **Description:** Schools typically maintain student lists in Excel (`.xlsx`, `.xls`). The importer rejects any non-`.csv` file and has no XLSX parser, so schools cannot use real-world nomination files (e.g., `nomina_excel.xls` in `Excel Tipo Real/`).
- **Repro:** Drag an `.xlsx` file into the importer → "Solo se aceptan archivos .csv" error.
- **Fix:** Integrate `xlsx` library, detect file type, parse accordingly (Epic 1).

### [medium] `conversations` UNIQUE constraint is not direction-agnostic — `supabase/migrations/20260410000003_audit_fixes.sql:77-95`
- **Discovered:** Phase 1 exploration
- **File/line:** `supabase/schema.sql:251`, `src/app/actions/interviews.ts`
- **Description:** `UNIQUE(user1_id, user2_id)` only prevents exact duplicates in that column order. If a conversation is created with `(Alice, Bob)` and another is attempted with `(Bob, Alice)`, the constraint does NOT prevent it because the tuple is different. The server action sorts UUIDs alphabetically to enforce a canonical ordering, but if that ordering is ever inconsistent (e.g., old rows pre-dating the fix), duplicate conversation rows can exist for the same pair.
- **Fix:** Add a function-based unique index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_canonical ON conversations(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));` (Epic 4 migration).

### [medium] In-memory rate limiter resets on cold start — `src/app/api/xp/route.ts`
- **Discovered:** Phase 1 exploration
- **File/line:** `src/app/api/xp/route.ts` (rate limit Map)
- **Description:** The rate limiter uses a module-level `Map`, which is wiped on every serverless cold start. On Vercel/serverless, each deployment instance has its own Map, so the same user can bypass the 30 req/min limit by hitting multiple instances simultaneously.
- **Fix:** Replace with an edge-compatible rate limiter (Upstash Redis, or Supabase rate-limit table) or accept the limitation for low-traffic MVP.

### [low] `processFile` in SmartImporter always reads files as UTF-8 — `src/components/admin/SmartImporter.tsx:200`
- **Discovered:** Phase 1 exploration
- **File/line:** `src/components/admin/SmartImporter.tsx:200`
- **Description:** `reader.readAsText(file, "UTF-8")` is hardcoded. Excel exports from Windows (especially ANSI-encoded CSV) may produce garbled accented characters (e.g., ñ, á, é become ???).
- **Fix:** Auto-detect encoding or allow the user to select it; the XLSX library handles encoding natively for Excel files.

### [medium] `profile/page.tsx` duplicates school-admin UI from `/administracion` — `src/app/profile/page.tsx`
- **Discovered:** During Epic 1 implementation
- **File/line:** `src/app/profile/page.tsx:769-790`
- **Description:** The profile page has its own "Add Student" form that duplicates the one in `/administracion/page.tsx`. It calls `createStudent` directly from a UI that is not gated to the `/administracion` route. Both forms now collect the new mandatory fields, but the duplication means future changes must be made in two places.
- **Fix:** Extract a shared `AddStudentModal` component reused in both pages, or remove the one from `/profile`.

### [low] `openStudentConvo` in `messages/page.tsx` queries conversations with an OR-of-OR pattern — `src/app/messages/page.tsx`
- **Discovered:** During Epic 4 implementation
- **File/line:** `src/app/messages/page.tsx` — `openStudentConvo` function
- **Description:** The query to find an existing conversation between school and student uses two `.or()` chained calls, which does not yield `(user1_id = A AND user2_id = B) OR (user1_id = B AND user2_id = A)`. The canonical unique index added in migration `20260430000001` will prevent duplicates at DB level, but the client-side check before INSERT could return a false "not found" and trigger an INSERT that then collides (harmlessly, via the unique index).
- **Fix:** Use a single `.or('and(user1_id.eq.A,user2_id.eq.B),and(user1_id.eq.B,user2_id.eq.A)')` PostgREST filter syntax.

---

## Resolved Bugs

### [high] Likes double-count race condition — `src/app/muro/page.tsx`
- **Discovered:** Teacher feedback round
- **File/line:** `src/app/muro/page.tsx` — `toggleLike()`
- **Description:** Rapid double-clicks on the like button triggered two simultaneous RPC calls before the first resolved. The optimistic update ran twice, incrementing likes by 2.
- **Fix:** Added `likingPostIds` Set guard — if a like is already in-flight for a post, subsequent clicks are ignored until the RPC returns.
- **Status:** ✅ Fixed in commit `09ac8ceb`

### [medium] Profile completion percentage never updated for avatar — `src/app/profile/page.tsx:706`
- **Discovered:** Teacher feedback round
- **File/line:** `src/app/profile/page.tsx:706`
- **Description:** "Foto de perfil" completion item had `weight: 0`, meaning uploading a profile picture never increased the percentage. Also "Asistencia" was always `done: true` (hardcoded), always granting 10 free points regardless of actual attendance. "Certificaciones" duplicated "Portafolio" with the same condition.
- **Fix:** Corrected weights (avatar=10, skills=20, removed Certificaciones, attendance now checks DB value). Weights rebalanced to sum to 100.
- **Status:** ✅ Fixed in commit `09ac8ceb`

### [medium] Inline profile edit didn't persist to DB — `src/app/profile/page.tsx:824`
- **Discovered:** Teacher feedback round
- **File/line:** `src/app/profile/page.tsx:824` — `saveInlineEdit()`
- **Description:** The inline edit mode for student bio, location, and soft skills updated React local state only. After page refresh, all inline edits were lost.
- **Fix:** `saveInlineEdit` now awaits a Supabase `profiles.update()` call persisting bio, location, and soft_skills.
- **Status:** ✅ Fixed in commit `09ac8ceb`
