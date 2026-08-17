import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/20260810000001_harden_authenticated_profiles.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8").replace(/\r\n/g, "\n");
const baseline = fs.readFileSync(
  path.join(root, "supabase/staging/profile-runtime-baseline.sql"),
  "utf8",
).replace(/\r\n/g, "\n");

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
  "CREATE OR REPLACE FUNCTION public.get_school_dashboard()",
  "UNION\n    SELECT s.id, s.name, school_profile.location",
  "HAVING count(*) = 1",
  "CREATE OR REPLACE FUNCTION public.get_school_students()",
  "GRANT EXECUTE ON FUNCTION public.get_school_students() TO authenticated",
  "GRANT EXECUTE ON FUNCTION public.get_school_dashboard() TO authenticated",
  "school_profile.account_type = 'school'",
  "school_profile.account_status = 'active'",
  "sm.status = 'active'",
  "sm.member_role IN ('owner','admin','teacher','reviewer')",
  "auth.uid()",
  "SET search_path = public",
  "CREATE VIEW public.authenticated_profile_directory",
  "security_invoker = true",
  "GRANT SELECT ON public.authenticated_profile_directory TO authenticated",
  "CREATE OR REPLACE FUNCTION private.profile_evidence_school_reviewer",
  "CREATE OR REPLACE FUNCTION private.is_active_school_member",
  "private.is_active_school_member(school_id, (select auth.uid()))",
  "private.profile_evidence_school_reviewer(owner_id, (select auth.uid()))",
  "CREATE OR REPLACE FUNCTION public.trg_fn_profile_evidence_guard()",
  "OLD.status = 'rejected' AND NEW.status = 'pending'",
  "rejected evidence resubmission must clear review metadata",
  "EXECUTE FUNCTION public.trg_fn_profile_evidence_guard()",
  'DROP POLICY IF EXISTS "profile_evidence_events_select"',
  "GRANT SELECT (id, name, avatar, bio, location, specialty, title, availability,\n  role, account_type, account_status) ON public.profiles TO anon",
  "REVOKE SELECT (school_id) ON public.student_profiles FROM anon, public",
];
const missing = required.filter((fragment) => !migration.includes(fragment));

const baselineRequired = [
  "CREATE VIEW public.public_student_profiles",
  "security_invoker = true, security_barrier = true",
  "CREATE POLICY student_profiles_public_projection",
  "USING (public_visibility);",
  "GRANT SELECT (profile_id, specialty, bio, availability, public_visibility)\n  ON public.student_profiles TO anon, authenticated",
  "REVOKE ALL ON public.profile_evidence_events FROM authenticated",
];
missing.push(...baselineRequired.filter((fragment) => !baseline.includes(fragment)));

const forbidden = [
  /profiles_select_authenticated_compat[\s\S]*?USING\s*\(\s*TRUE\s*\)/i,
  /CREATE\s+POLICY\s+profiles_(?:select|public_select)[^;]*?FOR\s+SELECT[^;]*?USING\s*\(\s*TRUE\s*\)/i,
  /GRANT\s+SELECT\s+ON\s+public\.profiles\s+TO\s+authenticated\s*;/i,
  /authenticated_profile_directory[\s\S]*?\bp\.gpa\b/i,
  /GRANT\s+SELECT\s*\([^)]*\bgpa\b[^)]*\)\s+ON\s+public\.profiles\s+TO\s+authenticated/i,
  /GRANT\s+SELECT\s+ON\s+public\.profile_evidence\s+TO\s+authenticated/i,
  /CREATE\s+POLICY\s+["']?profile_evidence_select["']?[\s\S]*?OR\s+status\s*=\s*['"]verified['"]/i,
  /GRANT\s+(?:SELECT|ALL)\s+ON\s+public\.profile_evidence(?:\s+TO\s+authenticated)?/i,
  /GRANT\s+(?:SELECT|ALL)\s+ON\s+public\.profile_evidence_events\s+TO\s+authenticated/i,
  /GRANT\s+SELECT\s*\([^)]*\bschool_id\b[^)]*\)\s+ON\s+public\.student_profiles\s+TO\s+authenticated/i,
  /GRANT\s+SELECT\s*\([^)]*\bschool_id\b[^)]*\)\s+ON\s+public\.student_profiles\s+TO\s+(?:anon|public)/i,
  /GRANT\s+SELECT\s*\([^)]*\b(?:email|rut|age|cellphone|phone|school_id|gpa|validation_note)\b[^)]*\)\s+ON\s+public\.(?:profiles|profile_evidence)\s+TO\s+anon/i,
];
const violations = forbidden.filter((pattern) => pattern.test(`${baseline}\n${migration}`));

const publicStudentPolicy = baseline.match(
  /CREATE POLICY student_profiles_public_projection[\s\S]*?USING\s*\(([^;]*?)\);/i,
)?.[1] ?? "";
const profilesPublicPolicy = baseline.match(
  /CREATE POLICY profiles_select_public_student_projection[\s\S]*?USING\s*\(([^;]*?)\);/i,
)?.[1] ?? "";
if (!publicStudentPolicy || /\bprofiles\b/i.test(publicStudentPolicy)) {
  violations.push("student_profiles public policy must not consult profiles (RLS recursion)");
}
if (!/student_profiles/i.test(profilesPublicPolicy) || !/public_visibility/i.test(profilesPublicPolicy)) {
  violations.push("profiles public policy must filter through student_profiles.public_visibility");
}

const schoolMembersPolicy = migration.match(
  /CREATE POLICY school_members_scope_read[\s\S]*?USING\s*\(([^;]*?)\);/i,
)?.[1] ?? "";
const studentScopePolicy = migration.match(
  /CREATE POLICY student_profiles_scope_read[\s\S]*?USING\s*\(([^;]*?)\);/i,
)?.[1] ?? "";
for (const [name, predicate] of [
  ["school_members_scope_read", schoolMembersPolicy],
  ["student_profiles_scope_read", studentScopePolicy],
]) {
  if (!predicate || /FROM\s+public\.school_members|FROM\s+public\.student_profiles/i.test(predicate)) {
    violations.push(`${name} must use the private membership helper, not an autorreferential RLS predicate`);
  }
  if (/\bUSING\s*\(\s*TRUE\s*\)/i.test(predicate)) {
    violations.push(`${name} has an unrestricted USING predicate`);
  }
}
if (!/private\.is_active_school_member[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_catalog/i.test(migration)) {
  violations.push("school membership helper must be private SECURITY DEFINER with fixed search_path");
}

const studentView = baseline.match(
  /CREATE VIEW public\.public_student_profiles[\s\S]*?;/i,
)?.[0] ?? "";
if (!/private\.public_validated_skills\(sp\.profile_id\)/i.test(studentView)) {
  violations.push("public_student_profiles must expose only validated skills through the private aggregate");
}
if (!/private\.public_validated_skills\(sp\.profile_id\)/i.test(`${baseline}\n${migration}`)) {
  violations.push("public student projection must use the private validated-skills aggregate");
}
if (!/private\.public_has_verified_evidence\(sp\.profile_id\)/i.test(`${baseline}\n${migration}`)) {
  violations.push("public student projection must use the private evidence aggregate");
}
const recursiveBaselinePolicies = [
  /CREATE POLICY school_members_scope_read[\s\S]*?FROM\s+public\.school_members/i,
  /CREATE POLICY student_profiles_scope_read[\s\S]*?FROM\s+public\.school_members/i,
];
if (recursiveBaselinePolicies.some((pattern) => pattern.test(baseline))) {
  for (const policy of ["school_members_scope_read", "student_profiles_scope_read"]) {
    if (!new RegExp(`DROP POLICY IF EXISTS ${policy}`, "i").test(migration)) {
      violations.push(`recursive baseline policy ${policy} is not replaced by the hotfix`);
    }
  }
}
const publicStudentProjection = baseline.match(
  /CREATE VIEW public\.public_student_profiles[\s\S]*?AS\s+SELECT([\s\S]*?)FROM public\.student_profiles/i,
)?.[1] ?? "";
if (/\b(?:school_id|gpa|validation_note)\b/i.test(
  publicStudentProjection,
)) {
  violations.push("public_student_profiles contains a forbidden S1 column");
}
if (/\bvalidation_note\b/i.test(
  migration.match(/CREATE VIEW public\.authenticated_profile_directory[\s\S]*?;\n/i)?.[0] ?? "",
)) {
  violations.push("authenticated directory contains validation_note");
}
const publicStudentView = baseline.match(
  /CREATE VIEW public\.public_student_profiles[\s\S]*?;/i,
)?.[0] ?? "";
if (/\bschool_id\b/i.test(publicStudentView)) {
  violations.push("public_student_profiles must not reference school_id");
}

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

if (!/CREATE VIEW public\.company_profile_directory[\s\S]*?security_invoker\s*=\s*true/i.test(migration)) {
  console.error("verify:authenticated-profile-boundary company directory must be security_invoker");
  process.exit(1);
}
for (const helper of ["is_active_school_member", "profile_evidence_school_reviewer"]) {
  if (!new RegExp(`DROP FUNCTION IF EXISTS public\\.${helper}\\(`, "i").test(migration)) {
    console.error(`verify:authenticated-profile-boundary public helper remains undecommissioned: ${helper}`);
    process.exit(1);
  }
}

if (!/CREATE OR REPLACE FUNCTION private\.profile_evidence_school_reviewer[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_catalog/i.test(migration)) {
  console.error("verify:authenticated-profile-boundary private reviewer must use a fixed search_path");
  process.exit(1);
}
if (!/REVOKE ALL ON SCHEMA private FROM PUBLIC, anon/i.test(migration)
  || !/GRANT EXECUTE ON FUNCTION private\.profile_evidence_school_reviewer\(UUID, UUID\)\s+TO authenticated/i.test(migration)) {
  console.error("verify:authenticated-profile-boundary private reviewer schema/function grants are not minimal");
  process.exit(1);
}
if (/CREATE(?: OR REPLACE)? FUNCTION public\.profile_evidence_school_reviewer/i.test(migration)) {
  console.error("verify:authenticated-profile-boundary public reviewer function is recreated");
  process.exit(1);
}

const publicReviewerDrop = migration.indexOf(
  "DROP FUNCTION IF EXISTS public.profile_evidence_school_reviewer(UUID, UUID)",
);
const policyRewrite = migration.indexOf(
  'DROP POLICY IF EXISTS "profile_evidence_events_select"',
);
if (publicReviewerDrop === -1 || policyRewrite === -1 || publicReviewerDrop < policyRewrite) {
  console.error("verify:authenticated-profile-boundary public reviewer is dropped before policy dependencies are rewritten");
  process.exit(1);
}

const criticalConsumers = [
  ["apps/web/src/components/talent/TalentPage.tsx", "authenticated_profile_directory"],
  ["apps/web/src/lib/services/contact-requests.ts", "can_request_student_contact"],
  ["apps/web/src/lib/own-profile-query.ts", 'rpc("get_own_profile")'],
  ["apps/web/src/lib/own-profile-query.ts", "isMissingRpcError(rpcError)"],
  ["apps/web/src/lib/own-profile-query.ts", '.eq("id", userId)'],
  ["apps/web/src/components/talent/TalentPage.tsx", "fetchOwnProfile<"],
  ["apps/web/src/components/dashboard/DashboardEstudiante.tsx", "fetchOwnProfile<"],
  ["apps/web/src/components/dashboard/DashboardEmpresa.tsx", "fetchOwnProfile<"],
  ["apps/web/src/components/dashboard/DashboardColegio.tsx", 'rpc("get_school_dashboard")'],
  ["apps/web/src/components/profile/ProfilePage.tsx", "fetchOwnProfile<"],
  ["apps/web/src/app/empresa/[id]/page.tsx", 'from("company_profile_directory")'],
  ["apps/web/src/app/actions/school.ts", 'rpc(\n    "school_can_manage_student"'],
];
for (const [file, fragment] of criticalConsumers) {
  const source = fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  if (!source.includes(fragment)) {
    console.error(`verify:authenticated-profile-boundary missing critical consumer contract: ${file}`);
    process.exit(1);
  }
}

const talentPage = fs.readFileSync(
  path.join(root, "apps/web/src/components/talent/TalentPage.tsx"),
  "utf8",
);
if (/from\(["']authenticated_profile_directory["']\)[\s\S]{0,700}\bgpa\b/i.test(talentPage)) {
  console.error("verify:authenticated-profile-boundary TalentPage still consumes gpa from authenticated_profile_directory");
  process.exit(1);
}
const studentDashboard = fs.readFileSync(
  path.join(root, "apps/web/src/components/dashboard/DashboardEstudiante.tsx"),
  "utf8",
);
if (/from\(["']profiles["']\)[\s\S]{0,300}\bgpa\b/i.test(studentDashboard)) {
  console.error("verify:authenticated-profile-boundary student dashboard still consumes gpa from profiles");
  process.exit(1);
}
if (/from\(["']profiles["']\)/i.test(studentDashboard)) {
  console.error("verify:authenticated-profile-boundary student dashboard must use get_own_profile");
  process.exit(1);
}
const schoolDashboard = fs.readFileSync(
  path.join(root, "apps/web/src/components/dashboard/DashboardColegio.tsx"),
  "utf8",
);
if (/from\(["']profiles["']\)/i.test(schoolDashboard) || /from\(["']student_profiles["']\)/i.test(schoolDashboard)) {
  console.error("verify:authenticated-profile-boundary school dashboard must use the scoped aggregate RPC");
  process.exit(1);
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
