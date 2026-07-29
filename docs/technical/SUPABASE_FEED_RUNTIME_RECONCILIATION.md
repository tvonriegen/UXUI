# Supabase Feed Runtime Reconciliation

Status: production RPCs restored; runtime write smoke test remains intentionally pending.

Branch: `fix/supabase-feed-runtime-reconciliation`

## Remote Production Snapshot

Project URL: `https://eghskwwupruomiactvji.supabase.co`

- PostgreSQL version: `17.6`.
- Remote migration history: 22 entries.
- Remote definitions for `get_trending_tags`, `toggle_post_like` and `add_post_comment`: present.
- Remote triggers `sync_likes_count` and `sync_comments_count`: present and own the counter updates.
- Remote public tables: RLS enabled on all inspected tables.
- Remote public view `public_student_profiles`: `security_invoker=true`, `security_barrier=true`.

## RPC Contract Audit

### `get_trending_tags`

Current caller: `apps/web/src/components/feed/FeedPage.tsx:201`.

Historical signature:

```sql
get_trending_tags(p_limit integer DEFAULT 10)
RETURNS TABLE(tag text, post_count bigint)
```

Observed behavior: stable aggregation of non-empty `posts.tag`, ordered by count descending and tag ascending, limited by `p_limit`.

Generated types: no Supabase-generated `Database` type file was found in the repository; the application uses local domain types instead.

### `toggle_post_like`

Current caller: `FeedPage.tsx:349`.

Historical and current client signature:

```sql
toggle_post_like(p_post_id uuid, p_user_id uuid)
RETURNS integer
```

Observed behavior: toggles the caller's row in `post_likes` and returns `posts.likes_count`.

Historical risk: the original function was `SECURITY DEFINER`, trusted `p_user_id`, and manually changed `posts.likes_count`. A later historical migration removed the manual counter update because `sync_likes_count` already changes the counter. That later migration was deleted during repository restructuring and is not in the current migration folder or remote migration history.

### `add_post_comment`

Current caller: `FeedPage.tsx:507`.

Historical signature:

```sql
add_post_comment(p_post_id uuid, p_user_id uuid, p_content text)
RETURNS jsonb
```

Returned JSON contract:

```json
{
  "id": "uuid",
  "post_id": "uuid",
  "author_id": "uuid",
  "content": "text",
  "created_at": "timestamptz",
  "profiles": { "name": "text", "avatar": "text", "role": "text" }
}
```

Historical risk: the original function was `SECURITY DEFINER`, trusted `p_user_id`, and manually changed `posts.comments_count`, duplicating the existing trigger behavior.

## Applied SQL

The repository source migration is:

`supabase/migrations/20260728000003_restore_feed_rpcs.sql`

It restores only the three functions. It does not create/drop tables, alter policies, alter triggers, or update counters directly. The production migration runner applied the three function sections as separate tracked migrations to avoid a same-second migration-history collision:

- `restore_feed_comment_rpc`
- `restore_feed_trending_tags`
- `restore_feed_like_rpc`

Identity enforcement:

```sql
v_user_id := (SELECT auth.uid());
IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
  RAISE EXCEPTION 'p_user_id must match the authenticated user';
END IF;
```

Security properties:

- `get_trending_tags` explicitly uses `SECURITY INVOKER`.
- The two mutating functions finish as `SECURITY INVOKER`; the counter triggers use `SECURITY DEFINER` with a fixed search path because they update `posts` owned by another user.
- The two mutating functions bind `p_user_id` to `auth.uid()` before any write, preventing caller impersonation.
- All three functions use `SET search_path = pg_catalog, public`.
- `PUBLIC` and `anon` execution are revoked.
- Only `authenticated` receives `EXECUTE`.
- Like/comment counters remain owned by existing triggers.
- The trigger functions are not executable by `PUBLIC`, `anon` or `authenticated` as direct RPCs.

## Tables Affected

The functions read or write only these existing tables:

- `public.posts`: read the tag/count result and current counter.
- `public.post_likes`: insert/delete the authenticated user's own like.
- `public.post_comments`: insert the authenticated user's own comment.
- `public.profiles`: read the authenticated author's display fields.

Existing triggers may update `public.posts.likes_count` and `public.posts.comments_count`; the proposed migration does not modify those triggers.

## Proposed Staging Tests

Static:

```bash
npm run verify:feed-rpcs
```

This checks the exact client calls, signatures, `auth.uid()` binding, fixed search path, grants, documented security modes and absence of direct counter updates.

Runtime staging-only:

```bash
npm run verify:runtime-feed-rpcs
```

Required variables:

- `RUNTIME_SUPABASE_URL`
- `RUNTIME_SUPABASE_ANON_KEY`
- `RUNTIME_STUDENT_EMAIL`
- `RUNTIME_STUDENT_PASSWORD`
- `RUNTIME_FEED_POST_ID`

The runtime test reads trending tags, toggles a like twice and restores the initial state, inserts a comment, validates the returned JSON contract, then deletes the temporary comment. It must target only the separate free staging project described in `docs/technical/STAGING_SETUP.md`.

## Rollback Proposal

No rollback has been executed or applied remotely.

If the migration is later approved for production and must be reverted, use a reviewed follow-up migration that:

1. Revokes `EXECUTE` from `authenticated` for the three signatures.
2. Drops only the three functions with their exact signatures.
3. Sends `NOTIFY pgrst, 'reload schema'`.

Do not roll back by changing tables, triggers or existing RLS policies.

## Migration Drift Diff

Current repository:

- 38 migration files under `supabase/migrations/` before this proposal.
- The current local history contains `20260415000003_rpcs_and_fixes.sql`, which defines the three RPCs using the old `SECURITY DEFINER` contract.
- The historical `20260507000001_fix_likes_double_count.sql` existed in the pre-workspace path, was later deleted, and is not present in the current migration folder.
- New proposal: `20260728000003_restore_feed_rpcs.sql`.

Remote production:

- 22 migration history entries, with the three feed RPC records added at `20260729221936`, `20260729221955` and `20260729222020`.
- The three feed RPC definitions are present in `pg_proc` with authenticated-only execution; the two mutating RPCs are invoker-secure and only the private trigger path is definer-secure.

Conclusion: the migration folder is not a reliable replayable representation of the remote production database. The repository and remote history also use incompatible version sequences. The feed RPCs are now restored in production through three forward migration records; do not run `db push`, reset or repair against production without a new reviewed baseline.

## Baseline Strategy Proposal

Preferred sequence, not executed:

1. Capture a remote schema/functions/policies/grants snapshot as the operational baseline.
2. Reconcile that snapshot against the repository's intended application contract.
3. Mark the current remote state with a reviewed baseline artifact rather than replaying the 38 local migrations.
4. Keep only forward migrations after the baseline, beginning with the approved feed RPC migration.
5. Use migration repair only after the baseline mapping is approved and tested in the separate non-production project.

Alternative: generate a full remote baseline/squash migration and archive the current local history as legacy reference. This is safer than replaying historical migrations because several contain superseded or more permissive policies.
