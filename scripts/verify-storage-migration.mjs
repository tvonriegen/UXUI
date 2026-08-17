import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260813000001_reconcile_storage_buckets.sql"),
  "utf8",
);

// Ignore comments so commented-out SQL cannot satisfy an invariant.
const sql = migration
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--[^\r\n]*/g, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const bucketContracts = {
  avatars: { limit: "5242880", mime: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  banners: { limit: "5242880", mime: ["image/jpeg", "image/png", "image/webp"] },
  "post-media": { limit: "10485760", mime: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"] },
};

for (const [bucket, contract] of Object.entries(bucketContracts)) {
  const block = sql.match(new RegExp(`VALUES\\s*\\(\\s*'${bucket}'[\\s\\S]*?\\)\\s*ON CONFLICT \\(id\\) DO UPDATE`, "i"));
  assert(block, `storage bucket declaration missing: ${bucket}`);
  assert(/,\s*true\s*,/i.test(block[0]), `bucket must remain public=true: ${bucket}`);
  assert(block[0].includes(contract.limit), `exact file size limit missing: ${bucket}`);
  const mimeValues = [...block[0].matchAll(/'([^']+)'/g)].slice(2).map(([, value]) => value);
  assert(JSON.stringify(mimeValues) === JSON.stringify(contract.mime), `exact MIME allowlist mismatch: ${bucket}`);
}
assert((sql.match(/ON CONFLICT \(id\) DO UPDATE/g) ?? []).length === 3, "each storage bucket must be upserted");

for (const publicPolicy of [
  "avatars_public_select",
  "banners_public_select",
  "banners_public_read",
  "post_media_public_select",
]) {
  assert(
    sql.includes(`DROP POLICY IF EXISTS "${publicPolicy}" ON storage.objects`),
    `public SELECT policy must be revoked: ${publicPolicy}`,
  );
  assert(
    !sql.includes(`CREATE POLICY "${publicPolicy}"`),
    `public SELECT policy must not be recreated: ${publicPolicy}`,
  );
}

for (const legacyPolicy of ["banners_user_upload", "banners_user_update", "banners_user_delete"]) {
  assert(
    sql.includes(`DROP POLICY IF EXISTS "${legacyPolicy}" ON storage.objects`),
    `legacy banners policy must be revoked: ${legacyPolicy}`,
  );
  assert(
    !sql.includes(`CREATE POLICY "${legacyPolicy}"`),
    `legacy banners policy must not be recreated: ${legacyPolicy}`,
  );
}

for (const policy of ["avatars", "banners", "post_media"]) {
  for (const action of ["insert", "update", "delete"]) {
    assert(
      sql.includes(`"${policy}_owner_${action}"`),
      `owner policy missing: ${policy}_${action}`,
    );
  }
}

for (const bucket of ["avatars", "banners", "post-media"]) {
  assert(
    sql.includes(`bucket_id = '${bucket}'`),
    `owner policies must remain bucket-scoped: ${bucket}`,
  );
}
assert(sql.includes("(select auth.uid())"), "owner policies must remain auth-scoped");

for (const policy of ["avatars", "banners", "post_media"]) {
  for (const action of ["insert", "update", "delete"]) {
    const block = sql.match(new RegExp(`CREATE POLICY "${policy}_owner_${action}"[\\s\\S]*?(?=CREATE POLICY|DROP POLICY|NOTIFY|$)`, "i"));
    assert(block, `owner policy definition missing: ${policy}_${action}`);
    assert(/bucket_id\s*=\s*'[^']+'/.test(block[0]), `owner policy must be bucket-scoped: ${policy}_${action}`);
    assert(/auth\.uid\(\)/.test(block[0]), `owner policy must be auth-scoped: ${policy}_${action}`);
    if (action === "update") assert(/USING\s*\(/i.test(block[0]) && /WITH CHECK\s*\(/i.test(block[0]), `update policy needs USING and WITH CHECK: ${policy}`);
  }
}

assert(!sql.includes("DELETE FROM storage.objects"), "migration must not delete objects");
assert(!sql.includes("TRUNCATE storage.objects"), "migration must not truncate objects");

console.log("verify:storage-migration passed: bucket, policy and non-destructive invariants.");
