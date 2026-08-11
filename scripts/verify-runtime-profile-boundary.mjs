import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { createClient } = require(resolve(rootDir, "apps/web/node_modules/@supabase/supabase-js"));

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required runtime profile-boundary variable: ${name}`);
  return value;
};
const optional = (name) => process.env[name] || null;
const url = required("RUNTIME_SUPABASE_URL");
const anonKey = required("RUNTIME_SUPABASE_ANON_KEY");
const results = [];

function client() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(key, email = required(`RUNTIME_${key.toUpperCase()}_EMAIL`), password = required(`RUNTIME_${key.toUpperCase()}_PASSWORD`)) {
  const db = client();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Could not authenticate ${key} fixture`);
  return { db, user: data.user };
}

function check(actor, operation, expected, actual, pass, result = pass ? "PASS" : "FAIL") {
  results.push({ actor, operation, expected, actual, result });
}

async function runCheck(actor, operation, expected, action, predicate = ({ error }) => !error) {
  try {
    const response = await action();
    const pass = predicate(response);
    check(actor, operation, expected, describe(response), pass);
  } catch (error) {
    check(actor, operation, expected, `ERROR: ${error instanceof Error ? error.message : String(error)}`, false);
  }
}

function describe({ data, error }) {
  if (error) return `ERROR ${error.code ?? "unknown"}: ${error.message}`;
  if (Array.isArray(data)) return `OK rows=${data.length}`;
  if (data && typeof data === "object") return `OK ${JSON.stringify(data)}`;
  return "OK";
}

async function rows(db, relation, select, filters = {}) {
  let query = db.from(relation).select(select);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  return query;
}

async function main() {
  const anonymous = client();
  const [student, company, school] = await Promise.all([signIn("student"), signIn("company"), signIn("school")]);
  const secondSchoolEmail = optional("RUNTIME_SECOND_SCHOOL_EMAIL");
  const secondSchoolPassword = optional("RUNTIME_SECOND_SCHOOL_PASSWORD");
  const secondStudentEmail = optional("RUNTIME_SECOND_STUDENT_EMAIL");
  const secondStudentPassword = optional("RUNTIME_SECOND_STUDENT_PASSWORD");
  const secondSchool = secondSchoolEmail && secondSchoolPassword ? await signIn("second-school", secondSchoolEmail, secondSchoolPassword) : null;
  const secondStudent = secondStudentEmail && secondStudentPassword ? await signIn("second-student", secondStudentEmail, secondStudentPassword) : null;
  const suspended = optional("RUNTIME_SUSPENDED_EMAIL") && optional("RUNTIME_SUSPENDED_PASSWORD")
    ? await signIn("suspended", optional("RUNTIME_SUSPENDED_EMAIL"), optional("RUNTIME_SUSPENDED_PASSWORD"))
    : null;

  const publicStudent = await rows(anonymous, "public_student_profiles", "id,name,specialty,bio,availability,school_name,validated_skills,has_verified_evidence");
  check("anon", "public student projection", "allowed, no sensitive columns", describe(publicStudent), !publicStudent.error && (publicStudent.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)));
  const publicCompany = await rows(anonymous, "company_profile_directory", "id,name,company_name,bio,avatar,location,industry,employee_count,website,benefits,tech_stack");
  check("anon", "public company projection", "allowed, no sensitive columns", describe(publicCompany), !publicCompany.error && (publicCompany.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)));

  await runCheck("anon", "direct profiles sensitive read", "denied", () => rows(anonymous, "profiles", "email").limit(1), ({ error }) => Boolean(error));
  await runCheck("student", "direct profiles sensitive read", "denied", () => rows(student.db, "profiles", "email").eq("id", student.user.id), ({ error }) => Boolean(error));
  await runCheck("anon", "get_own_profile", "denied", () => anonymous.rpc("get_own_profile"), ({ error }) => Boolean(error));
  await runCheck("minor student", "own get_own_profile", "own row with sensitive self fields", () => student.db.rpc("get_own_profile"), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === student.user.id && typeof data[0]?.profile?.email === "string" && Number(data[0]?.profile?.age) < 18);
  await runCheck("company", "authenticated student directory", "allowed public rows", () => rows(company.db, "authenticated_profile_directory", "id,name,account_type,account_status"), ({ data, error }) => !error && (data ?? []).every((row) => row.account_type === "student" && row.account_status === "active"));
  await runCheck("company", "company directory", "allowed active company projection", () => rows(company.db, "company_profile_directory", "id,name,company_name,industry"), ({ data, error }) => !error && (data ?? []).every((row) => row.id && row.name !== undefined));
  await runCheck("school", "school_can_manage_student=true", "true for same-school student", () => school.db.rpc("school_can_manage_student", { p_student_id: student.user.id }), ({ data, error }) => !error && data === true);
  await runCheck("school", "school_can_manage_student=false", "false for unknown student", () => school.db.rpc("school_can_manage_student", { p_student_id: "00000000-0000-0000-0000-000000000000" }), ({ data, error }) => !error && data === false);

  if (secondSchool && secondStudent) {
    await runCheck("second-school", "cross-tenant school_can_manage_student", "false for other school student", () => secondSchool.db.rpc("school_can_manage_student", { p_student_id: student.user.id }), ({ data, error }) => !error && data === false);
    await runCheck("school", "cross-tenant student direct profile", "denied sensitive read", () => rows(school.db, "profiles", "email").eq("id", secondStudent.user.id), ({ error }) => Boolean(error));
  } else {
    check("fixtures", "cross-tenant actors", "second school + second student configured", "missing RUNTIME_SECOND_* credentials", false, "SKIP");
  }

  if (suspended) {
    await runCheck("anon", "suspended public student exclusion", "suspended id absent", () => rows(anonymous, "public_student_profiles", "id").eq("id", suspended.user.id), ({ data, error }) => !error && (data ?? []).length === 0);
    await runCheck("company", "suspended authenticated directory exclusion", "suspended id absent", () => rows(company.db, "authenticated_profile_directory", "id").eq("id", suspended.user.id), ({ data, error }) => !error && (data ?? []).length === 0);
  } else {
    check("fixtures", "suspended fail-closed", "RUNTIME_SUSPENDED_EMAIL/PASSWORD configured", "no suspended fixture", false, "SKIP");
  }

  // UPDATE grants are intentionally not probed with PATCH: this verifier is read-only.
  check("authenticated", "UPDATE grants", "allowlisted columns only; protected columns denied", "NOT RUNTIME-PROBED: mutation-free smoke", true, "SKIP");

  console.log("\nactor | operation | expected | actual | PASS-FAIL");
  console.log("--- | --- | --- | --- | ---");
  for (const row of results) console.log(`${row.actor} | ${row.operation} | ${row.expected} | ${row.actual} | ${row.result}`);
  const failures = results.filter((row) => row.result === "FAIL");
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`verify:runtime-profile-boundary failed before matrix completion: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
