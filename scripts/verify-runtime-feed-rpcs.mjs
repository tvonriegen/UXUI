import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createClient } = require(resolve(rootDir, "apps/web/node_modules/@supabase/supabase-js"));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing feed RPC runtime variable: ${name}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectError(promise, message) {
  const { error } = await promise;
  assert(error, message);
}

const url = required("RUNTIME_SUPABASE_URL");
const anonKey = required("RUNTIME_SUPABASE_ANON_KEY");
const feedPostId = required("RUNTIME_FEED_POST_ID");
const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } = await client.auth.signInWithPassword({
  email: required("RUNTIME_STUDENT_EMAIL"),
  password: required("RUNTIME_STUDENT_PASSWORD"),
});
assert(!authError && authData.user, "student fixture could not authenticate");

const wrongUserId = "00000000-0000-0000-0000-000000000000";
await expectError(
  client.rpc("toggle_post_like", { p_post_id: feedPostId, p_user_id: wrongUserId }),
  "toggle_post_like accepted a mismatched p_user_id",
);
await expectError(
  client.rpc("add_post_comment", {
    p_post_id: feedPostId,
    p_user_id: wrongUserId,
    p_content: "this must be rejected",
  }),
  "add_post_comment accepted a mismatched p_user_id",
);

const { data: tags, error: tagsError } = await client.rpc("get_trending_tags", { p_limit: 8 });
assert(!tagsError && Array.isArray(tags), "get_trending_tags failed");
assert(tags.length <= 8, "get_trending_tags exceeded its limit");
for (const row of tags) {
  assert(typeof row.tag === "string", "get_trending_tags returned an invalid tag");
  assert(Number.isFinite(Number(row.post_count)), "get_trending_tags returned an invalid count");
}

async function isLiked() {
  const { data, error } = await client
    .from("post_likes")
    .select("post_id")
    .eq("post_id", feedPostId)
    .eq("user_id", authData.user.id);
  assert(!error, "could not inspect the staging like fixture");
  return (data ?? []).length > 0;
}

const initialLiked = await isLiked();
try {
  const { data: firstCount, error: firstError } = await client.rpc("toggle_post_like", {
    p_post_id: feedPostId,
    p_user_id: authData.user.id,
  });
  assert(!firstError && Number.isInteger(firstCount), "toggle_post_like first call failed");
  assert((await isLiked()) === !initialLiked, "toggle_post_like did not change the like state");

  const { data: secondCount, error: secondError } = await client.rpc("toggle_post_like", {
    p_post_id: feedPostId,
    p_user_id: authData.user.id,
  });
  assert(!secondError && Number.isInteger(secondCount), "toggle_post_like second call failed");
  assert((await isLiked()) === initialLiked, "toggle_post_like did not restore the like state");
} finally {
  if ((await isLiked()) !== initialLiked) {
    await client.rpc("toggle_post_like", {
      p_post_id: feedPostId,
      p_user_id: authData.user.id,
    });
  }
}

const { data: comment, error: commentError } = await client.rpc("add_post_comment", {
  p_post_id: feedPostId,
  p_user_id: authData.user.id,
  p_content: `staging feed RPC smoke ${Date.now()}`,
});
assert(!commentError && comment && typeof comment === "object", "add_post_comment failed");
assert(comment.author_id === authData.user.id, "add_post_comment returned the wrong author");
assert(comment.post_id === feedPostId, "add_post_comment returned the wrong post");
assert(typeof comment.id === "string", "add_post_comment did not return a comment id");

const { error: cleanupError } = await client
  .from("post_comments")
  .delete()
  .eq("id", comment.id)
  .eq("author_id", authData.user.id);
assert(!cleanupError, "could not clean up the staging comment fixture");

console.log("verify:runtime-feed-rpcs passed: trending tags, like toggle, comment insert and cleanup.");
