import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baselinePath = process.env.STAGING_BASELINE_PATH || resolve(root, "supabase/staging/full-runtime-baseline.sql");
const source = readFileSync(baselinePath, "utf8");
const normalizeRoutineType = (value) => {
  const tokens = value.replace(/\s+DEFAULT\s+[\s\S]*$/i, "").trim().split(/\s+/);
  return (tokens.length > 1 ? tokens.slice(1) : tokens).join(" ").toLowerCase();
};
const routineSignature = (schema, name, args) => `${schema.toLowerCase()}.${name.toLowerCase()}(${args.trim() ? args.split(",").map(normalizeRoutineType).join(",") : ""})`;
const splitFunctionReferences = (value) => {
  const references = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    if (value[index] === ")") depth -= 1;
    if (value[index] === "," && depth === 0) {
      references.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  references.push(value.slice(start).trim());
  return references.filter(Boolean);
};
const functionDefinitions = [...source.matchAll(/(?:CREATE|CREATE OR REPLACE)\s+FUNCTION\s+([a-z_][\w]*)\.([a-z_][\w]*)\s*\(([^)]*)\)/gi)]
  .map((match) => ({ signature: routineSignature(match[1], match[2], match[3]), position: match.index }));
const functionPrivileges = [...source.matchAll(/\b(?:REVOKE|GRANT)\b[^;]*?\bON\s+FUNCTION\s+([^;]+?)\s+(?:FROM|TO)\b/gi)];
for (const privilege of functionPrivileges) {
  const privilegePosition = privilege.index;
  for (const reference of splitFunctionReferences(privilege[1])) {
    const match = reference.match(/^([a-z_][\w]*)\.([a-z_][\w]*)\s*\(([^)]*)\)$/i);
    if (!match) throw new Error(`invalid function privilege reference: ${reference}`);
    const signature = routineSignature(match[1], match[2], match[3]);
    if (!functionDefinitions.some((definition) => definition.signature === signature && definition.position < privilegePosition)) {
      throw new Error(`function privilege references missing or not-yet-created routine: ${signature}`);
    }
  }
}
const evidenceGuardDefinitions = source.match(/(?:CREATE|CREATE OR REPLACE)\s+FUNCTION\s+public\.trg_fn_profile_evidence_guard\s*\(/gi) || [];
if (evidenceGuardDefinitions.length !== 1) {
  throw new Error(`expected exactly one profile evidence guard definition, found ${evidenceGuardDefinitions.length}`);
}
const evidenceGuardDefinition = source.match(/(?:CREATE|CREATE OR REPLACE)\s+FUNCTION\s+public\.trg_fn_profile_evidence_guard\s*\([\s\S]*?\$\$;/i)?.[0] || "";
if (!/SECURITY\s+DEFINER/i.test(evidenceGuardDefinition) || !/SET\s+search_path\s*=\s*public\s*,\s*pg_catalog/i.test(evidenceGuardDefinition)) {
  throw new Error("profile evidence guard must be SECURITY DEFINER with search_path = public, pg_catalog");
}
for (const routine of ["trg_fn_contact_request_guard", "trg_fn_contact_request_approval"]) {
  const definition = source.match(new RegExp(`(?:CREATE|CREATE OR REPLACE)\\s+FUNCTION\\s+public\\.${routine}\\s*\\([\\s\\S]*?\\$\\$;`, "i"))?.[0] || "";
  if (!definition || !/SECURITY\s+DEFINER/i.test(definition) || !/SET\s+search_path\s*=\s*public\s*,\s*pg_catalog/i.test(definition)) throw new Error(`${routine} lacks fixed SECURITY DEFINER search_path`);
}
for (const trigger of ["trg_contact_request_guard", "trg_contact_request_approval"]) if ((source.match(new RegExp(`CREATE TRIGGER ${trigger}\\b`, "gi")) || []).length !== 1) throw new Error(`${trigger} must have one effective definition`);
if (!/contact request identities and creation time are immutable/i.test(source) || !/NEW\.status = 'approved'[\s\S]*?INSERT INTO notifications/i.test(source)) throw new Error("contact trigger semantics are incomplete");
if (!/GRANT EXECUTE ON FUNCTION private\.is_active_school_member\(uuid,uuid\), private\.profile_evidence_school_reviewer\(uuid,uuid\) TO authenticated/i.test(source)) throw new Error("authenticated helper grants are missing");
if (!/OLD\.status\s*=\s*'rejected'[\s\S]*?NEW\.status\s*=\s*'pending'/i.test(evidenceGuardDefinition)
  || !/NEW\.status\s+NOT\s+IN\s*\(\s*'verified'\s*,\s*'rejected'\s*\)/i.test(evidenceGuardDefinition)
  || !/is_service_role/i.test(evidenceGuardDefinition)) {
  throw new Error("profile evidence guard S1 owner/reviewer/service-role semantics are incomplete");
}
const REQUIRED_CURRENT = [
  "profiles", "schools", "school_members", "student_profiles", "profile_evidence", "posts", "post_comments",
  "job_postings", "job_applications", "application_events", "opportunities", "opportunity_proposals",
  "contact_requests", "conversations", "messages", "notifications", "profile_views",
  "company_profiles", "external_profiles", "skills", "user_skills", "skill_validations", "profile_evidence_events", "post_likes", "interviews",
  "certifications", "portfolio_items", "portfolio_tags", "alliances", "school_reports", "recommendation_requests", "company_follows",
  "badges", "user_badges", "xp_events", "activity_results", "reputation_events", "saved_posts", "quest_templates", "user_daily_progress", "tech_radar_entries", "user_radar_snapshots",
];
const LEGACY_COMPAT = ["job_postings", "internship_requests", "opportunity_legacy_links"];
const DEFERRED_RETIRED = [];
const required = [...new Set([...REQUIRED_CURRENT, ...LEGACY_COMPAT])];
const checks = [
  [/CREATE EXTENSION IF NOT EXISTS pgcrypto/i, "pgcrypto dependency"],
  [/REFERENCES auth\.users\(id\)/i, "Auth dependency"],
  [/ALTER TABLE public\.%I ENABLE ROW LEVEL SECURITY|application_events.*?ENABLE ROW LEVEL SECURITY/is, "application events RLS"],
  [/actor_id\s*=\s*(?:\(select\s+)?auth\.uid\(\)/i, "application event actor ownership"],
  [/author_id\s*=\s*(?:\(select\s+)?auth\.uid\(\)/i, "comment author ownership"],
  [/viewer_id\s*=\s*(?:\(select\s+)?auth\.uid\(\)/i, "profile view ownership"],
  [/security_invoker\s*=\s*true/i, "security invoker view"],
  [/CREATE SCHEMA IF NOT EXISTS private/i, "private helper schema"],
  [/REVOKE ALL ON FUNCTION private\.is_active_school_member/i, "private helper revoke"],
  [/CREATE UNIQUE INDEX contact_requests_active_pair_idx/i, "contact uniqueness"],
  [/CREATE UNIQUE INDEX conversations_canonical_idx/i, "canonical conversation index"],
  [/CREATE TRIGGER profile_evidence_audit_insert/i, "evidence audit trigger"],
  [/CREATE TRIGGER trg_profile_evidence_guard[\s\S]*?EXECUTE FUNCTION public\.trg_fn_profile_evidence_guard/i, "evidence guard trigger"],
  [/REVOKE ALL ON FUNCTION public\.trg_fn_profile_evidence_guard\(\) FROM PUBLIC, anon, authenticated/i, "evidence guard revoke"],
  [/CREATE TRIGGER post_comment_count_insert/i, "comment counter trigger"],
  [/CREATE POLICY "contact_requests_select_company_school"[\s\S]*?TO authenticated/i, "contact request select role"],
  [/CREATE POLICY "contact_requests_school_review"[\s\S]*?TO authenticated/i, "contact request update role"],
  [/CREATE VIEW public\.authenticated_profile_directory\b/i, "authenticated profile directory view"],
  [/CREATE VIEW public\.company_profile_directory\b/i, "company profile directory view"],
  [/(?:CREATE\s+POLICY\s+company_profile_directory_select_active\s+ON\s+public\.profiles\s+FOR\s+SELECT\s+TO\s+anon\s*,\s*authenticated\s+USING\s*\(\s*account_type\s*=\s*'company'\s+AND\s+account_status\s*=\s*'active'\s+AND\s+role\s*=\s*'Empresa'\s*\)\s*;)/i, "company directory active projection policy"],
  [/(?:CREATE\s+POLICY\s+profiles_select_public_company_projection\s+ON\s+public\.profiles\s+FOR\s+SELECT\s+TO\s+anon\s*,\s*authenticated\s+USING\s*\(\s*account_type\s*=\s*'company'\s+AND\s+account_status\s*=\s*'active'\s+AND\s+role\s*=\s*'Empresa'\s*\)\s*;)/i, "safe public company projection policy"],
  [/CREATE FUNCTION private\.public_school_name\s*\(/i, "private school name helper"],
  [/CREATE FUNCTION private\.public_validated_skills\s*\(/i, "private validated skills helper"],
  [/CREATE FUNCTION private\.public_has_verified_evidence\s*\(/i, "private verified evidence helper"],
  [/CREATE TABLE public\.student_profiles[\s\S]*\bschool_name\s+text[\s\S]*\bvalidated_skills\s+jsonb[\s\S]*\bhas_verified_evidence\s+boolean/i, "student projection columns"],
  [/s\.profile_id\s*=\s*contact_requests\.school_id/i, "contact school profile mapping"],
  [/private\.is_active_school_member\(s\.id,\s*\(?auth\.uid\(\)?/i, "contact policies pass schools.id to membership helper"],
  [/INSERT INTO contact_requests\s*\([^)]*school_id[^)]*\)[\s\S]*?SELECT[\s\S]*?s\.profile_id[\s\S]*?FROM schools s/i, "contact RPC stores school profile id"],
  [/CREATE OR REPLACE FUNCTION public\.can_request_student_contact[\s\S]*?VALUES\s*\(actor,\s*p_student_id,\s*school_profile_id,/i, "final contact RPC inserts the school profile id"],
  [/GRANT SELECT \([^)]*specialty[^)]*title[^)]*xp[^)]*level[^)]*streak[^)]*availability[^)]*years_experience[^)]*reputation_score[^)]*\) ON public\.profiles TO authenticated/i, "authenticated profile column allowlist"],
  [/GRANT SELECT \([^)]*owner_id[^)]*evidence_type[^)]*title[^)]*status[^)]*\) ON public\.profile_evidence TO authenticated/i, "profile evidence minimum grant"],
  [/GRANT SELECT \(\s*id\s*,\s*job_id\s*,\s*opportunity_id\s*,\s*applicant_id\s*,\s*student_id\s*,\s*status\s*,\s*cover_letter\s*,\s*readiness_snapshot\s*,\s*readiness_model_version\s*,\s*readiness_checked_at\s*,\s*created_at\s*,\s*updated_at\s*\)\s+ON public\.job_applications TO authenticated\s*;/i, "authenticated job applications column allowlist"],
  [/GRANT SELECT ON public\.opportunities TO anon, authenticated\s*;/i, "opportunities SELECT grant"],
  [/CREATE\s+POLICY\s+proposals_select_scope\s+ON\s+public\.opportunity_proposals\s+FOR\s+SELECT\s+TO\s+authenticated/i, "proposals select policy"],
  [/CREATE\s+POLICY\s+proposals_insert_student\s+ON\s+public\.opportunity_proposals\s+FOR\s+INSERT\s+TO\s+authenticated/i, "proposals insert policy"],
  [/CREATE\s+POLICY\s+proposals_update_applicant\s+ON\s+public\.opportunity_proposals\s+FOR\s+UPDATE\s+TO\s+authenticated/i, "proposals applicant update policy"],
  [/CREATE\s+POLICY\s+proposals_update_publisher\s+ON\s+public\.opportunity_proposals\s+FOR\s+UPDATE\s+TO\s+authenticated/i, "proposals publisher update policy"],
  [/REVOKE\s+ALL\s+ON\s+public\.opportunity_proposals\s+FROM\s+anon\s*;/i, "proposals anon revoke"],
  [/GRANT\s+SELECT\s*,\s*INSERT\s*,\s*UPDATE\s+ON\s+public\.opportunity_proposals\s+TO\s+authenticated\s*;/i, "proposals authenticated grants"],
  [/o\.status\s+IN\s*\(\s*'open'\s*,\s*'closed'\s*,\s*'expired'\s*\)/i, "historical external contact opportunity states"],
  [/GRANT\s+USAGE\s+ON\s+SCHEMA\s+public\s+TO\s+service_role\s*;/i, "service_role public schema usage grant"],
];
const rpcDefinitions = source.match(/(?:CREATE|CREATE OR REPLACE) FUNCTION public\.can_request_student_contact\s*\(/gi) || [];
if (rpcDefinitions.length !== 1) throw new Error(`expected exactly one baseline contact RPC definition, found ${rpcDefinitions.length}`);
const companyPolicyDefinitions = source.match(/CREATE\s+POLICY\s+profiles_select_public_company_projection\b/gi) || [];
if (companyPolicyDefinitions.length !== 1) throw new Error(`expected exactly one public company projection policy, found ${companyPolicyDefinitions.length}`);
const companyDirectoryPolicyDefinitions = source.match(/CREATE\s+POLICY\s+company_profile_directory_select_active\b/gi) || [];
if (companyDirectoryPolicyDefinitions.length !== 1) throw new Error(`expected exactly one company directory active policy, found ${companyDirectoryPolicyDefinitions.length}`);
const companyDirectoryPolicy = source.match(/CREATE\s+POLICY\s+company_profile_directory_select_active[\s\S]*?;/i)?.[0] || "";
if (!/ON\s+public\.profiles\s+FOR\s+SELECT\s+TO\s+anon\s*,\s*authenticated/i.test(companyDirectoryPolicy)
  || !/account_type\s*=\s*'company'/i.test(companyDirectoryPolicy)
  || !/account_status\s*=\s*'active'/i.test(companyDirectoryPolicy)
  || !/role\s*=\s*'Empresa'/i.test(companyDirectoryPolicy)) {
  throw new Error("company directory policy must expose only active canonical companies");
}
const companyPolicy = source.match(/CREATE\s+POLICY\s+profiles_select_public_company_projection[\s\S]*?;/i)?.[0] || "";
if (!/ON\s+public\.profiles\s+FOR\s+SELECT\s+TO\s+anon\s*,\s*authenticated/i.test(companyPolicy)
  || !/account_type\s*=\s*'company'/i.test(companyPolicy)
  || !/account_status\s*=\s*'active'/i.test(companyPolicy)
  || !/role\s*=\s*'Empresa'/i.test(companyPolicy)
  || /USING\s*\(\s*true\s*\)/i.test(companyPolicy)) {
  throw new Error("public company projection policy must be explicit, active/company-only, and non-permissive");
}
const contactSelectPolicy = source.match(/CREATE\s+POLICY\s+["']?contact_requests_select_company_school["']?[\s\S]*?;/i)?.[0] || "";
if (!/ON\s+public\.contact_requests\s+FOR\s+SELECT\s+TO\s+authenticated/i.test(contactSelectPolicy)
  || !/private\.can_review_contact_request\s*\(/i.test(contactSelectPolicy)) {
  throw new Error("contact request select policy must use the review helper");
}
const contactReviewPolicy = source.match(/CREATE\s+POLICY\s+["']?contact_requests_school_review["']?[\s\S]*?;/i)?.[0] || "";
const contactReviewUsing = contactReviewPolicy.match(/\bUSING\s*\(([\s\S]*?)\)\s*(?:WITH\s+CHECK|;)/i)?.[1] || "";
const contactReviewWithCheck = contactReviewPolicy.match(/\bWITH\s+CHECK\s*\(([\s\S]*?)\)\s*;/i)?.[1] || "";
if (!/ON\s+public\.contact_requests\s+FOR\s+UPDATE\s+TO\s+authenticated/i.test(contactReviewPolicy)
  || !/private\.can_review_contact_request\s*\(/i.test(contactReviewUsing)
  || !/private\.can_review_contact_request\s*\(/i.test(contactReviewWithCheck)) {
  throw new Error("contact request review policy must use the review helper in USING and WITH CHECK");
}
const proposalPolicies = new Map([
  ["proposals_select_scope", source.match(/CREATE\s+POLICY\s+proposals_select_scope\b[\s\S]*?;/i)?.[0] || ""],
  ["proposals_insert_student", source.match(/CREATE\s+POLICY\s+proposals_insert_student\b[\s\S]*?;/i)?.[0] || ""],
  ["proposals_update_applicant", source.match(/CREATE\s+POLICY\s+proposals_update_applicant\b[\s\S]*?;/i)?.[0] || ""],
  ["proposals_update_publisher", source.match(/CREATE\s+POLICY\s+proposals_update_publisher\b[\s\S]*?;/i)?.[0] || ""],
]);
for (const [name, policy] of proposalPolicies) {
  if (!policy || !new RegExp(`CREATE\\s+POLICY\\s+${name}\\s+ON\\s+public\\.opportunity_proposals`, "i").test(policy)) {
    throw new Error(`proposal policy is missing or targets the wrong table: ${name}`);
  }
  if (/USING\s*\(\s*true\s*\)/i.test(policy)) throw new Error(`proposal policy is permissive: ${name}`);
}
const proposalSelectPolicy = proposalPolicies.get("proposals_select_scope");
if (!/FOR\s+SELECT\s+TO\s+authenticated/i.test(proposalSelectPolicy)
  || !/applicant_id\s*=\s*\(select\s+auth\.uid\(\)\)/i.test(proposalSelectPolicy)
  || !/publisher_id\s*=\s*\(select\s+auth\.uid\(\)\)/i.test(proposalSelectPolicy)) {
  throw new Error("proposal select policy must scope the applicant or opportunity publisher");
}
const proposalInsertPolicy = proposalPolicies.get("proposals_insert_student");
if (!/FOR\s+INSERT\s+TO\s+authenticated/i.test(proposalInsertPolicy)
  || !/account_type\s*=\s*'student'/i.test(proposalInsertPolicy)
  || !/account_status\s*=\s*'active'/i.test(proposalInsertPolicy)
  || !/opportunity_type\s*=\s*'freelance'/i.test(proposalInsertPolicy)
  || !/status\s*=\s*'open'/i.test(proposalInsertPolicy)
  || !/closes_at\s+IS\s+NULL[\s\S]*closes_at\s*>\s*now\(\)/i.test(proposalInsertPolicy)
  || !/status\s*=\s*'pending'/i.test(proposalInsertPolicy)) {
  throw new Error("proposal insert policy must enforce active students, open freelance opportunities, and pending status");
}
const proposalApplicantUpdatePolicy = proposalPolicies.get("proposals_update_applicant");
if (!/FOR\s+UPDATE\s+TO\s+authenticated/i.test(proposalApplicantUpdatePolicy)
  || !/USING\s*\([\s\S]*applicant_id\s*=\s*\(select\s+auth\.uid\(\)\)[\s\S]*status\s*=\s*'pending'/i.test(proposalApplicantUpdatePolicy)
  || !/WITH\s+CHECK\s*\([\s\S]*status\s*=\s*'withdrawn'/i.test(proposalApplicantUpdatePolicy)) {
  throw new Error("proposal applicant update policy must allow own pending proposals to become withdrawn");
}
const proposalPublisherUpdatePolicy = proposalPolicies.get("proposals_update_publisher");
if (!/FOR\s+UPDATE\s+TO\s+authenticated/i.test(proposalPublisherUpdatePolicy)
  || !/publisher_id\s*=\s*\(select\s+auth\.uid\(\)\)/i.test(proposalPublisherUpdatePolicy)
  || !/status\s+IN\s*\(\s*'accepted'\s*,\s*'rejected'\s*\)/i.test(proposalPublisherUpdatePolicy)) {
  throw new Error("proposal publisher update policy must restrict decisions to accepted or rejected");
}
if (/VALUES\s*\([^;]*school_id_var/i.test(source)) throw new Error("final contact RPC incorrectly inserts schools.id as contact school_id");
for (const table of required) {
  if (!new RegExp(`CREATE TABLE public\\.${table}\\b`, "i").test(source)) throw new Error(`missing required table: ${table}`);
}
console.log(`SCHEMA TOTAL ${required.length}`);
console.log(`REQUIRED TABLES ${REQUIRED_CURRENT.join(", ")}`);
console.log(`LEGACY COMPAT TABLES ${LEGACY_COMPAT.join(", ")}`);
console.log(`MISSING ${required.filter((table) => !new RegExp(`CREATE TABLE public\\.${table}\\b`, "i").test(source)).join(", ") || "none"}`);
console.log(`UNEXPECTED ${DEFERRED_RETIRED.join(", ") || "none"}`);
for (const [pattern, label] of checks) if (!pattern.test(source)) throw new Error(`bootstrap structural check failed: ${label}`);
for (const forbidden of [/USING\s*\(true\).*?profiles/i, /CREATE POLICY .* ON public\.profile_views[\s\S]{0,300}WITH CHECK\s*\(auth\.uid\(\) IS NOT NULL/i]) {
  if (forbidden.test(source)) throw new Error(`forbidden permissive policy detected: ${forbidden}`);
}

const databaseUrl = process.env.STAGING_DATABASE_URL;
if (databaseUrl) {
  let pg;
  try { pg = await import("pg"); } catch { throw new Error("DB mode requires the pg package; static preflight was not accepted"); }
   const client = new pg.Client({ connectionString: databaseUrl, ssl: process.env.STAGING_DATABASE_SSL === "false" ? false : { rejectUnauthorized: true } });
  await client.connect();
  try {
     const tableRows = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
     const actualTables = new Set(tableRows.rows.map((row) => row.table_name));
     console.log(`SCHEMA TOTAL ${actualTables.size}`);
     console.log(`REQUIRED TABLES ${REQUIRED_CURRENT.join(", ")}`);
     console.log(`LEGACY COMPAT TABLES ${LEGACY_COMPAT.join(", ")}`);
     console.log(`MISSING ${required.filter((table) => !actualTables.has(table)).join(", ") || "none"}`);
     console.log(`UNEXPECTED ${[...actualTables].filter((table) => !required.includes(table)).sort().join(", ") || "none"}`);
     for (const table of required) if (!actualTables.has(table)) throw new Error(`DB catalog missing required table: ${table}`);
    if (actualTables.size !== required.length) throw new Error(`DB schema parity failed: expected ${required.length} tables, found ${actualTables.size}`);
    const counts = {};
    for (const table of [...actualTables].sort()) counts[table] = Number((await client.query(`SELECT count(*)::int AS count FROM public."${table.replaceAll('"', '""')}"`)).rows[0].count);
    console.log(`DB TABLE COUNTS ${JSON.stringify(counts)}`);
    const catalog = await client.query(`
      SELECT c.relname AS table_name, a.attname AS column_name, c.relrowsecurity AS rls
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE n.nspname='public' AND c.relkind='r'`);
    const columns = new Map();
    for (const row of catalog.rows) { if (!columns.has(row.table_name)) columns.set(row.table_name, new Set()); columns.get(row.table_name).add(row.column_name); if (!row.rls) throw new Error(`DB table ${row.table_name} has RLS disabled`); }
      const keyColumns = [["application_events", "application_id"], ["application_events", "actor_id"], ["profile_views", "viewer_id"], ["post_comments", "author_id"], ["contact_requests", "school_id"], ["opportunity_proposals", "applicant_id"], ["student_profiles", "school_id"], ["student_profiles", "school_name"], ["student_profiles", "validated_skills"], ["student_profiles", "has_verified_evidence"]];
    for (const [table, column] of keyColumns) if (!columns.get(table)?.has(column)) throw new Error(`DB catalog missing ${table}.${column}`);
     const constraints = await client.query(`
       SELECT n.nspname AS schema_name, c.relname AS table_name, con.contype,
              pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
       JOIN pg_class c ON c.oid=con.conrelid
       JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public'`);
     if (!constraints.rows.some((row) => row.schema_name === 'public' && row.table_name === 'job_applications' && row.contype === 'p')) throw new Error('DB catalog missing job_applications primary key');
      const policies = await client.query("SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname='public'");
       const companyPolicies = policies.rows.filter((policy) => policy.policyname === 'profiles_select_public_company_projection' && policy.tablename === 'profiles');
      if (companyPolicies.length !== 1) throw new Error(`DB public company projection policy count is not exactly one (found ${companyPolicies.length})`);
      const companyPolicyExpression = `${companyPolicies[0].qual || ''} ${companyPolicies[0].with_check || ''}`;
      if (!/account_type\s*=\s*'company'/i.test(companyPolicyExpression)
        || !/account_status\s*=\s*'active'/i.test(companyPolicyExpression)
        || !/role\s*=\s*'Empresa'/i.test(companyPolicyExpression)
        || /\btrue\b/i.test(companyPolicyExpression)) {
         throw new Error('DB public company projection policy is not the required safe predicate');
       }
       const companyDirectoryPolicies = policies.rows.filter((policy) => policy.policyname === 'company_profile_directory_select_active' && policy.tablename === 'profiles');
       if (companyDirectoryPolicies.length !== 1) throw new Error(`DB company directory active policy count is not exactly one (found ${companyDirectoryPolicies.length})`);
       const companyDirectoryPolicyExpression = `${companyDirectoryPolicies[0].qual || ''} ${companyDirectoryPolicies[0].with_check || ''}`;
       if (!/account_type\s*=\s*'company'/i.test(companyDirectoryPolicyExpression)
         || !/account_status\s*=\s*'active'/i.test(companyDirectoryPolicyExpression)
         || !/role\s*=\s*'Empresa'/i.test(companyDirectoryPolicyExpression)
         || /\btrue\b/i.test(companyDirectoryPolicyExpression)) {
         throw new Error('DB company directory active policy is not the required safe predicate');
       }
      const policyText = policies.rows.map((row) => `${row.policyname} ${row.qual || ''} ${row.with_check || ''}`).join("\n");
      for (const token of ["actor_id", "viewer_id", "author_id"])
        if (!policyText.includes(token)) throw new Error(`DB policies missing ownership predicate for ${token}`);
      const contactSelectPolicies = policies.rows.filter((policy) => policy.policyname === 'contact_requests_select_company_school' && policy.tablename === 'contact_requests');
      if (contactSelectPolicies.length !== 1 || !/private\.can_review_contact_request\s*\(/i.test(`${contactSelectPolicies[0]?.qual || ''} ${contactSelectPolicies[0]?.with_check || ''}`)) throw new Error('DB contact request select policy is not scoped by the review helper');
      const contactReviewPolicies = policies.rows.filter((policy) => policy.policyname === 'contact_requests_school_review' && policy.tablename === 'contact_requests');
      if (contactReviewPolicies.length !== 1
        || !/private\.can_review_contact_request\s*\(/i.test(contactReviewPolicies[0]?.qual || '')
        || !/private\.can_review_contact_request\s*\(/i.test(contactReviewPolicies[0]?.with_check || '')) {
        throw new Error('DB contact request review policy must use the review helper in USING and WITH CHECK');
      }
     const userOwnershipTables = ["user_badges", "xp_events", "activity_results", "saved_posts", "user_daily_progress", "user_radar_snapshots"];
     const hasUserOwnershipPredicate = (policy) => {
       const expression = `${policy.qual || ""} ${policy.with_check || ""}`;
       return /\buser_id\b\s*=\s*(?:\(\s*)?(?:select\s+)?auth\.uid\(\s*\)(?:\s*\))?/i.test(expression);
     };
     for (const table of userOwnershipTables) {
       const tablePolicies = policies.rows.filter((policy) => policy.tablename === table);
       if (!tablePolicies.some(hasUserOwnershipPredicate)) {
         throw new Error(`DB policies missing user_id/auth.uid() ownership predicate for ${table}`);
       }
     }
     if (policyText.includes("USING (true)") && !/badge_catalog_read|quest_catalog_read|radar_catalog_read/.test(policyText)) throw new Error("DB has an unexpected permissive policy");
    const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
    for (const name of ["application_events_application_created_idx", "profile_views_viewed_created_idx", "post_comments_post_created_idx", "contact_requests_active_pair_idx"]) if (!indexes.rows.some((row) => row.indexname === name)) throw new Error(`DB catalog missing index: ${name}`);
      const routines = await client.query(`
         SELECT n.nspname AS schema_name,
                p.proname AS routine_name,
                p.oid AS routine_oid,
                COALESCE(array_agg(format_type(arg_type.oid, NULL) ORDER BY arg.ordinality) FILTER (WHERE arg_type.oid IS NOT NULL), ARRAY[]::text[]) AS argument_types,
               p.prosecdef,
               p.proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace
        LEFT JOIN LATERAL unnest(p.proargtypes::oid[]) WITH ORDINALITY AS arg(oid, ordinality) ON true
        LEFT JOIN pg_type arg_type ON arg_type.oid=arg.oid
        WHERE n.nspname IN ('public', 'private')
        GROUP BY n.nspname, p.proname, p.oid, p.prosecdef, p.proconfig`);
      const requiredRoutines = [
        ['public', 'can_request_student_contact', ['uuid', 'text']],
        ['public', 'get_own_profile', []],
        ['public', 'school_can_manage_student', ['uuid']],
        ['public', 'get_school_students', []],
        ['public', 'get_school_dashboard', []],
       ['public', 'get_profile_evidence_events', ['uuid']],
       ['public', 'trg_fn_profile_evidence_guard', []],
       ['public', 'trg_fn_contact_request_guard', []],
       ['public', 'trg_fn_contact_request_approval', []],
      ];
      const normalizeIdentifier = (value) => String(value).replaceAll('"', '').trim().toLowerCase();
      const normalizeType = (value) => normalizeIdentifier(value).replace(/\s+/g, '');
      for (const [schema, name, argumentTypes] of requiredRoutines) {
        const matches = routines.rows.some((row) => normalizeIdentifier(row.schema_name) === normalizeIdentifier(schema)
          && normalizeIdentifier(row.routine_name) === normalizeIdentifier(name)
          && row.argument_types.length === argumentTypes.length
          && row.argument_types.every((type, index) => normalizeType(type) === normalizeType(argumentTypes[index])));
        if (!matches) {
          throw new Error(`DB catalog missing function: ${schema}.${name}(${argumentTypes.join(', ')})`);
        }
      }
     const normalizeSearchPath = (value) => value
       .replaceAll('"', '')
       .replace(/\s+/g, '')
       .toLowerCase();
      const hasSafeSearchPath = (row) => (row.proconfig || [])
       .filter((setting) => /^search_path\s*=/i.test(setting))
        .some((setting) => normalizeSearchPath(setting.replace(/^search_path\s*=\s*/i, '')) === 'public,pg_catalog');
       const guardMatches = routines.rows.filter((row) => row.schema_name === 'public' && row.routine_name === 'trg_fn_profile_evidence_guard' && row.argument_types.length === 0);
       if (guardMatches.length !== 1) throw new Error(`DB profile evidence guard function count is not exactly one (found ${guardMatches.length})`);
       const guard = guardMatches[0];
       if (!guard.prosecdef || !hasSafeSearchPath(guard)) throw new Error('DB profile evidence guard lacks SECURITY DEFINER fixed search_path');
       // pg_get_functiondef uses PostgreSQL's canonical `SET search_path TO ...`
       // spelling (and may quote the entries); proconfig above is the source of
       // truth for the effective setting, while this confirms the definition too.
       const guardDefinition = await client.query("SELECT pg_get_functiondef($1::oid) AS definition", [guard.routine_oid]);
       const normalizedGuardDefinition = String(guardDefinition.rows[0]?.definition || '').replaceAll('"', '').replace(/\s+/g, ' ');
       if (guardDefinition.rows.length !== 1 || !/SECURITY DEFINER/i.test(normalizedGuardDefinition) || !/SET\s+search_path\s+(?:TO|=)\s+'?public'?\s*,\s*'?(?:pg_catalog)'?/i.test(normalizedGuardDefinition)) throw new Error('DB profile evidence guard definition is not the required final definition');
       const guardTriggers = await client.query("SELECT t.tgname, t.tgfoid FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='profile_evidence' AND NOT t.tgisinternal AND t.tgfoid=$1::oid", [guard.routine_oid]);
       if (guardTriggers.rows.length !== 1 || guardTriggers.rows[0].tgname !== 'trg_profile_evidence_guard') throw new Error('DB profile evidence guard trigger count/function is not exactly one');
       const guardPrivileges = await client.query(`
         SELECT COALESCE(grantee.rolname, 'PUBLIC') AS grantee
         FROM pg_proc p
         LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) privilege ON true
         LEFT JOIN pg_roles grantee ON grantee.oid = privilege.grantee
         WHERE p.oid=$1::oid AND privilege.privilege_type='EXECUTE'
           AND (privilege.grantee=0 OR grantee.rolname IN ('anon','authenticated'))`, [guard.routine_oid]);
       if (guardPrivileges.rows.length) throw new Error(`DB profile evidence guard has unexpected EXECUTE grants: ${guardPrivileges.rows.map((row) => row.grantee).join(', ')}`);
     const definerRoutines = routines.rows.filter((row) => row.prosecdef);
     const badRoutine = definerRoutines.find((row) => !hasSafeSearchPath(row));
     if (badRoutine) throw new Error(`SECURITY DEFINER function lacks fixed safe search_path: ${badRoutine.schema_name}.${badRoutine.routine_name}(${badRoutine.argument_types.join(', ')})`);
    const views = await client.query("SELECT table_name, is_updatable FROM information_schema.views WHERE table_schema='public'");
      for (const viewName of ['public_student_profiles', 'authenticated_profile_directory', 'company_profile_directory']) if (!views.rows.some((row) => row.table_name === viewName)) throw new Error(`DB catalog missing ${viewName} view`);
     const viewOptions = await client.query("SELECT c.relname, c.reloptions FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v'");
    const publicView = viewOptions.rows.find((row) => row.relname === 'public_student_profiles');
    if (!publicView?.reloptions?.some((option) => option === 'security_invoker=true')) throw new Error('DB public_student_profiles is not security_invoker');
      const grants = await client.query("SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges WHERE specific_schema='public'");
     if (grants.rows.some((row) => row.routine_name === "can_request_student_contact" && ["PUBLIC", "anon"].includes(row.grantee) && row.privilege_type === "EXECUTE")) throw new Error("DB contact RPC is executable by anon/PUBLIC");
     const tableGrants = await client.query("SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee='service_role'");
     if (!tableGrants.rows.some((row) => row.table_name === 'profiles' && row.privilege_type === 'INSERT')) throw new Error('service_role lacks profiles INSERT grant');
     if (!tableGrants.rows.some((row) => row.table_name === 'profiles' && row.privilege_type === 'UPDATE')) throw new Error('service_role lacks profiles UPDATE grant');
      const schemaUsage = await client.query("SELECT has_schema_privilege('service_role','public','USAGE') AS has_usage");
      if (schemaUsage.rows[0]?.has_usage !== true) throw new Error('service_role lacks public schema USAGE grant');
      if (!grants.rows.some((row) => row.routine_name === 'can_request_student_contact' && row.grantee === 'service_role' && row.privilege_type === 'EXECUTE')) throw new Error('service_role lacks explicit RPC EXECUTE grant');
      const columnGrants = await client.query(`
        SELECT table_name, grantee, privilege_type, column_name
        FROM information_schema.column_privileges
        WHERE table_schema='public' AND grantee IN ('anon','authenticated')`);
      const hasColumnGrant = (table, grantee, privilege, columns) => columns.every((column) => columnGrants.rows.some((row) => row.table_name === table && row.grantee === grantee && row.privilege_type === privilege && row.column_name === column));
      if (!hasColumnGrant('student_profiles', 'anon', 'SELECT', ['profile_id', 'specialty', 'bio', 'availability', 'public_visibility'])) throw new Error('anon student_profiles column allowlist is incomplete');
      if (!hasColumnGrant('student_profiles', 'authenticated', 'SELECT', ['profile_id', 'specialty', 'bio', 'availability', 'public_visibility'])) throw new Error('authenticated student_profiles column allowlist is incomplete');
      if (!hasColumnGrant('profile_evidence', 'authenticated', 'SELECT', ['id', 'owner_id', 'evidence_type', 'title', 'status'])) throw new Error('authenticated profile_evidence minimum column grant is incomplete');
      const profileGrantRows = columnGrants.rows.filter((row) => row.table_name === 'profiles' && row.grantee === 'authenticated' && row.privilege_type === 'SELECT').map((row) => row.column_name);
      for (const forbidden of ['email', 'age', 'rut', 'cellphone', 'gender', 'school_id']) if (profileGrantRows.includes(forbidden)) throw new Error(`authenticated profiles grant exposes forbidden column: ${forbidden}`);
      if (!views.rows.some((row) => row.table_name === 'public_student_profiles')) throw new Error('DB catalog missing public_student_profiles view');
     console.log(`verify:staging-bootstrap passed DB catalog validation (${required.length} tables) using ${baselinePath}`);
  } finally { await client.end(); }
} else {
  console.log(`STATIC verify:staging-bootstrap passed SQL-only checks; DB parity was not evaluated (${required.length} reference tables) using ${baselinePath}`);
}
