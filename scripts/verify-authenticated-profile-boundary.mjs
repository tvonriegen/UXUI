import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/20260810000001_harden_authenticated_profiles.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");

const required = [
  "DROP POLICY IF EXISTS profiles_select_authenticated_compat",
  "CREATE POLICY profiles_select_owner",
  "USING (id = (select auth.uid()))",
  "REVOKE SELECT ON public.profiles FROM authenticated",
  "GRANT UPDATE (",
  "name, bio, location, specialty, title, availability, website, industry,",
  "avatar, banner_url, theme_color, soft_skills, benefits, tech_stack, updated_at",
  "profiles_update_own",
  "profiles_update_school_student",
  "CREATE POLICY profiles_select_authenticated_directory",
  "sp.public_visibility = TRUE",
  "account_status = 'active'",
  "CREATE OR REPLACE FUNCTION public.get_own_profile()",
  "auth.uid()",
  "SET search_path = public",
  "CREATE VIEW public.authenticated_profile_directory",
  "security_invoker = true",
  "GRANT SELECT ON public.authenticated_profile_directory TO authenticated",
];
const missing = required.filter((fragment) => !migration.includes(fragment));

const forbidden = [
  /profiles_select_authenticated_compat[\s\S]*?USING\s*\(\s*TRUE\s*\)/i,
  /CREATE\s+POLICY\s+profiles_(?:select|public_select)[\s\S]*?FOR\s+SELECT[\s\S]*?USING\s*\(\s*TRUE\s*\)/i,
  /GRANT\s+SELECT\s+ON\s+public\.profiles\s+TO\s+authenticated\s*;/i,
];
const violations = forbidden.filter((pattern) => pattern.test(migration));

const updateGrantColumns = migration.match(
  /GRANT\s+UPDATE\s*\(([^)]*)\)\s+ON\s+public\.profiles\s+TO\s+authenticated/i,
)?.[1] ?? "";
const unsafeUpdateGrant = /\b(?:id|email|role|account_type|account_status|school_id|age|gender|cellphone|rut)\b/i.test(updateGrantColumns);
if (unsafeUpdateGrant) {
  violations.push("unsafe authenticated profiles UPDATE column grant");
}

const historicalPolicies = fs
  .readdirSync(path.join(root, "supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map((file) => fs.readFileSync(path.join(root, "supabase/migrations", file), "utf8"))
  .join("\n");
for (const policy of ['CREATE POLICY "profiles_update_own"', 'CREATE POLICY "profiles_update_school_student"']) {
  if (!historicalPolicies.includes(policy)) missing.push(policy);
}

if (missing.length || violations.length) {
  console.error("verify:authenticated-profile-boundary failed.");
  for (const fragment of missing) console.error(`Missing: ${fragment}`);
  for (const pattern of violations) console.error(`Forbidden: ${pattern}`);
  process.exit(1);
}

const projection = migration.match(
  /CREATE VIEW public\.authenticated_profile_directory[\s\S]*?AS\s+SELECT([\s\S]*?)FROM public\.profiles/i,
)?.[1] ?? "";
for (const sensitive of ["email", "age", "school_id", "cellphone", "rut"]) {
  if (new RegExp(`\\b${sensitive}\\b`, "i").test(projection)) {
    console.error(`verify:authenticated-profile-boundary exposed sensitive field: ${sensitive}`);
    process.exit(1);
  }
}

const criticalConsumers = [
  ["apps/web/src/components/talent/TalentPage.tsx", "authenticated_profile_directory"],
  ["apps/web/src/lib/services/contact-requests.ts", "requiere autorización de dominio en staging"],
  ["apps/web/src/components/talent/TalentPage.tsx", 'rpc("get_own_profile")'],
  ["apps/web/src/components/profile/ProfilePage.tsx", 'rpc("get_own_profile")'],
  ["apps/web/src/app/empresa/[id]/page.tsx", 'from("company_profile_directory")'],
  ["apps/web/src/app/actions/school.ts", 'rpc(\n    "school_can_manage_student"'],
];
for (const [file, fragment] of criticalConsumers) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (!source.includes(fragment)) {
    console.error(`verify:authenticated-profile-boundary missing critical consumer contract: ${file}`);
    process.exit(1);
  }
}
const contactService = fs.readFileSync(
  path.join(root, "apps/web/src/lib/services/contact-requests.ts"),
  "utf8",
);
if (/from\(["']profiles["']\)[\s\S]{0,120}?\.select\(["'][^"']*(age|school_id|cellphone|rut)/i.test(contactService)) {
  console.error("verify:authenticated-profile-boundary found a sensitive direct contact read.");
  process.exit(1);
}
if (/authenticated_profile_directory[\s\S]*?from\(["']profiles["']\)/i.test(fs.readFileSync(path.join(root, "apps/web/src/components/talent/TalentPage.tsx"), "utf8"))) {
  console.error("verify:authenticated-profile-boundary found a directory fallback to profiles.");
  process.exit(1);
}

// Keep this verifier structural rather than growing a manual consumer list.
// Every direct profiles read is classified from its query shape. Owner reads
// must be scoped to the authenticated identity; arbitrary ids and sensitive
// columns are rejected. Writes/upserts are intentionally outside this check:
// their authorization remains in the existing RLS/action boundaries.
const sourceRoot = path.join(root, "apps/web/src");
const sourceFiles = [];
function collectSourceFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(entryPath);
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name)) {
      sourceFiles.push(entryPath);
    }
  }
}
collectSourceFiles(sourceRoot);

const directProfileFindings = [];
const sensitiveColumns = /\b(?:email|rut|age|school_id|cellphone|gender)\b/i;
const ownerIdentity = /(?:user|caller|account|session)\.id|auth\.uid\(\)/i;
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/\.from\(["']profiles["']\)/g)) {
    const start = match.index ?? 0;
    const end = source.indexOf(";", start);
    const chain = source.slice(start, end === -1 ? source.length : end);
    if (!/\.select\s*\(/i.test(chain)) continue;

    const selected = chain.match(/\.select\s*\(\s*["'`]([^"'`]*)/i)?.[1] ?? "";
    const thirdPartyFilter = chain.match(/\.eq\s*\(\s*["']id["']\s*,\s*([^,)]+)/i)?.[1] ?? "";
    const isOwnerRead = !thirdPartyFilter || ownerIdentity.test(thirdPartyFilter);
    const relativeFile = path.relative(root, file);
    const classification = sensitiveColumns.test(selected)
      ? "sensitive-column"
      : isOwnerRead ? "owner-or-unscoped" : "third-party";
    directProfileFindings.push({ relativeFile, classification, selected, chain });
  }
}

const boundaryViolations = directProfileFindings.filter(({ relativeFile, classification }) =>
  (classification === "sensitive-column" || classification === "third-party") &&
  /(?:apps[\\/]web[\\/]src[\\/]app[\\/]actions[\\/]school\.ts|apps[\\/]web[\\/]src[\\/]app[\\/]empresa[\\/])/i.test(relativeFile),
);
if (boundaryViolations.length) {
  console.error("verify:authenticated-profile-boundary found direct profiles reads outside the migrated boundary.");
  for (const finding of boundaryViolations) {
    console.error(`${finding.classification}: ${finding.relativeFile} select(${finding.selected})`);
  }
  process.exit(1);
}

console.log("verify:authenticated-profile-boundary passed.");
