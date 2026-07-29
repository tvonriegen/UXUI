import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const migration = readFileSync(
  resolve(rootDir, "supabase/migrations/20260728000003_restore_feed_rpcs.sql"),
  "utf8",
);
const securityMigration = readFileSync(
  resolve(rootDir, "supabase/migrations/20260729000001_harden_feed_rpc_security.sql"),
  "utf8",
);
const feedPage = readFileSync(
  resolve(rootDir, "apps/web/src/components/feed/FeedPage.tsx"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rpcNames = ["get_trending_tags", "toggle_post_like", "add_post_comment"];
for (const name of rpcNames) {
  assert(migration.includes(`FUNCTION public.${name}`), `${name} definition is missing`);
  assert(feedPage.includes(`rpc("${name}"`), `${name} client call is missing`);
  assert(migration.includes(`REVOKE ALL ON FUNCTION public.${name}`), `${name} PUBLIC revoke is missing`);
  assert(migration.includes(`GRANT EXECUTE ON FUNCTION public.${name}`), `${name} authenticated grant is missing`);
}

assert(migration.includes("get_trending_tags(p_limit integer DEFAULT 10)"), "trending tags signature is incorrect");
assert(migration.includes("toggle_post_like(p_post_id uuid, p_user_id uuid)"), "like toggle signature is incorrect");
assert(migration.includes("p_post_id uuid,\n  p_user_id uuid,\n  p_content text"), "comment signature is incorrect");
assert(migration.includes("get_trending_tags(p_limit integer DEFAULT 10)\nRETURNS TABLE(tag text, post_count bigint)\nLANGUAGE sql\nSTABLE\nSECURITY INVOKER"), "trending tags must be SECURITY INVOKER");
assert(
  (migration.match(/SECURITY DEFINER/g) ?? []).length === 2 &&
    (migration.match(/VOLATILE\n-- Required because the existing counter trigger/g) ?? []).length === 2,
  "mutating RPCs need the documented trigger justification",
);
assert(migration.includes("SELECT auth.uid()"), "feed RPCs must derive identity from auth.uid()");
assert(migration.includes("p_user_id IS DISTINCT FROM v_user_id"), "user-bound RPCs must reject mismatched caller ids");
assert(migration.includes("SET search_path = pg_catalog, public"), "feed RPCs must use a fixed search_path");
assert(!migration.includes("UPDATE public.posts SET likes_count"), "like RPC must not duplicate the likes trigger");
assert(!migration.includes("UPDATE public.posts SET comments_count"), "comment RPC must not duplicate the comments trigger");
assert(securityMigration.includes("ALTER FUNCTION public.toggle_post_like(uuid, uuid) SECURITY INVOKER"), "like RPC must finish as SECURITY INVOKER");
assert(securityMigration.includes("ALTER FUNCTION public.add_post_comment(uuid, uuid, text) SECURITY INVOKER"), "comment RPC must finish as SECURITY INVOKER");
assert((securityMigration.match(/SECURITY DEFINER/g) ?? []).length === 2, "only counter triggers may remain SECURITY DEFINER");
assert(securityMigration.includes("REVOKE ALL ON FUNCTION public.sync_likes_count() FROM PUBLIC, anon, authenticated"), "likes trigger must not be callable as an RPC");
assert(securityMigration.includes("REVOKE ALL ON FUNCTION public.sync_comments_count() FROM PUBLIC, anon, authenticated"), "comments trigger must not be callable as an RPC");

console.log("verify:feed-rpcs passed: contracts, caller binding, grants and trigger ownership are defined.");
