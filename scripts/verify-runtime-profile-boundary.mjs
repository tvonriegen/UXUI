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
const url = required("RUNTIME_SUPABASE_URL");
const anonKey = required("RUNTIME_SUPABASE_ANON_KEY");
const results = [];

function client() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(key) {
  const email = required(`RUNTIME_${key}_EMAIL`);
  const password = required(`RUNTIME_${key}_PASSWORD`);
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

function describeProjection(response) {
  if (response.error) return describe(response);
  const row = response.data?.[0];
  return `OK rows=${response.data?.length ?? 0} school_name=${JSON.stringify(row?.school_name ?? null)} validated_skills=${JSON.stringify(row?.validated_skills ?? [])} has_verified_evidence=${String(row?.has_verified_evidence ?? false)}`;
}

async function rows(db, relation, select, filters = {}) {
  let query = db.from(relation).select(select);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  return query;
}

function requireRows(response, label, predicate = () => true) {
  if (response.error || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error(`${label} produced no fixture rows: ${describe(response)}`);
  }
  if (!response.data.every(predicate)) throw new Error(`${label} contains an unexpected fixture row`);
  return response.data;
}

async function checkFixtureStatus(label, fixture, expectedType, expectedStatus) {
  await runCheck(label, "canonical fixture status", `${expectedType}/${expectedStatus}`, () => fixture.db.rpc("get_own_profile"), ({ data, error }) => {
    const profile = data?.[0]?.profile;
    return !error && data?.length === 1 && profile?.id === fixture.user.id
      && (!expectedType || profile?.account_type === expectedType) && profile?.account_status === expectedStatus;
  });
}

async function main() {
  const anonymous = client();
  const [studentMinor, studentAdult, studentSchoolB, schoolA, schoolB, companyA, companyB, externalA, suspended] = await Promise.all([
    signIn("STUDENT_MINOR_A"), signIn("STUDENT_ADULT_A"), signIn("STUDENT_SCHOOL_B"),
    signIn("SCHOOL_A"), signIn("SCHOOL_B"), signIn("COMPANY_A"), signIn("COMPANY_B"),
    signIn("EXTERNAL_A"), signIn("SUSPENDED"),
  ]);
  await Promise.all([
    checkFixtureStatus("StudentMinorA", studentMinor, "student", "active"),
    checkFixtureStatus("StudentAdultA", studentAdult, "student", "active"),
    checkFixtureStatus("StudentSchoolB", studentSchoolB, "student", "active"),
    checkFixtureStatus("SchoolA", schoolA, "school", "active"),
    checkFixtureStatus("SchoolB", schoolB, "school", "active"),
    checkFixtureStatus("CompanyA", companyA, "company", "active"),
    checkFixtureStatus("CompanyB", companyB, "company", "active"),
    checkFixtureStatus("ExternalA", externalA, "external", "active"),
    checkFixtureStatus("Suspended", suspended, null, "suspended"),
  ]);

  const publicStudent = await rows(anonymous, "public_student_profiles", "id,name,specialty,bio,availability,school_name,validated_skills,has_verified_evidence");
  check("anon", "public student projection", "allowed, no sensitive columns", describeProjection(publicStudent), !publicStudent.error && (publicStudent.data ?? []).length > 0 && (publicStudent.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)));
  const authenticatedStudent = await rows(studentMinor.db, "public_student_profiles", "id,name,specialty,bio,availability,school_name,validated_skills,has_verified_evidence");
  check("authenticated", "public student projection", "allowed, aggregate fields only", describeProjection(authenticatedStudent), !authenticatedStudent.error && (authenticatedStudent.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)) && (authenticatedStudent.data ?? []).length > 0);
  const publicCompany = await rows(anonymous, "company_profile_directory", "id,name,company_name,bio,avatar,location,industry,employee_count,website,benefits,tech_stack");
  check("anon", "public company projection", "allowed, no sensitive columns", describe(publicCompany), !publicCompany.error && (publicCompany.data ?? []).length > 0 && (publicCompany.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)));

  await runCheck("anon", "direct profiles sensitive read", "denied", () => rows(anonymous, "profiles", "email").limit(1), ({ error }) => Boolean(error));
  await runCheck("student minor", "direct profiles sensitive read", "denied", () => rows(studentMinor.db, "profiles", "email").eq("id", studentMinor.user.id), ({ error }) => Boolean(error));
  await runCheck("anon", "get_own_profile", "denied", () => anonymous.rpc("get_own_profile"), ({ error }) => Boolean(error));
  await runCheck("minor student", "own get_own_profile", "own row with age<18 and active", () => studentMinor.db.rpc("get_own_profile"), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === studentMinor.user.id && typeof data[0]?.profile?.email === "string" && Number(data[0]?.profile?.age) < 18 && data[0]?.profile?.account_status === "active");
  await runCheck("adult student", "own get_own_profile", "own row with age>=18 and active", () => studentAdult.db.rpc("get_own_profile"), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === studentAdult.user.id && Number(data[0]?.profile?.age) >= 18 && data[0]?.profile?.account_status === "active");
  await runCheck("suspended", "own get_own_profile", "own row with account_status=suspended", () => suspended.db.rpc("get_own_profile"), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === suspended.user.id && data[0]?.profile?.account_status === "suspended");
  await runCheck("company A", "authenticated student directory", "allowed public rows", () => rows(companyA.db, "authenticated_profile_directory", "id,name,account_type,account_status"), ({ data, error }) => !error && (data ?? []).length > 0 && (data ?? []).every((row) => row.account_type === "student" && row.account_status === "active"));
  await runCheck("company A", "company directory", "allowed active company projection", () => rows(companyA.db, "company_profile_directory", "id,name,company_name,industry"), ({ data, error }) => !error && (data ?? []).length > 0 && (data ?? []).every((row) => row.id && row.name !== undefined));
  await runCheck("school A", "school_can_manage_student=true", "true for same-school student", () => schoolA.db.rpc("school_can_manage_student", { p_student_id: studentMinor.user.id }), ({ data, error }) => !error && data === true);
  await runCheck("school A", "school_can_manage_student=false", "false for unknown student", () => schoolA.db.rpc("school_can_manage_student", { p_student_id: "00000000-0000-0000-0000-000000000000" }), ({ data, error }) => !error && data === false);
  await runCheck("school A", "get_school_dashboard", "one SchoolA aggregate", () => schoolA.db.rpc("get_school_dashboard"), ({ data, error }) => !error && data?.length === 1 && Number(data[0]?.student_count) >= 2);
  await runCheck("school B", "get_school_dashboard", "one SchoolB aggregate", () => schoolB.db.rpc("get_school_dashboard"), ({ data, error }) => !error && data?.length === 1 && Number(data[0]?.student_count) >= 1);
  await runCheck("school A", "school roster projection", "exact SchoolA roster, no sensitive metadata", () => schoolA.db.rpc("get_school_students"), ({ data, error }) => (
    !error && data?.length === 2 && new Set(data.map((row) => row.id)).size === 2
    && [studentMinor.user.id, studentAdult.user.id].every((id) => data.some((row) => row.id === id))
    && data.every((row) => !["email", "school_id", "student_stage", "validation_note"].some((key) => key in row))
  ));

  await runCheck("school B", "cross-tenant school_can_manage_student", "false for other school student", () => schoolB.db.rpc("school_can_manage_student", { p_student_id: studentMinor.user.id }), ({ data, error }) => !error && data === false);
  await runCheck("school B", "legacy owner without membership", "true for own SchoolB student", () => schoolB.db.rpc("school_can_manage_student", { p_student_id: studentSchoolB.user.id }), ({ data, error }) => !error && data === true);
  await runCheck("school B", "legacy owner roster projection", "exact SchoolB roster", () => schoolB.db.rpc("get_school_students"), ({ data, error }) => !error && data?.length === 1 && data[0]?.id === studentSchoolB.user.id);
  await runCheck("school A", "cross-tenant student direct profile", "denied sensitive read", () => rows(schoolA.db, "profiles", "email").eq("id", studentSchoolB.user.id), ({ error }) => Boolean(error));

  // S1 base relations are never public. Skills/validations are consumed only
  // by private projection aggregates; evidence/events remain owner/reviewer
  // scoped. This matrix is read-only and deliberately does not probe UPDATE.
  for (const relation of ["user_skills", "skill_validations"]) {
    await runCheck("anon", `${relation} direct read`, "denied", () => rows(anonymous, relation, "*"), ({ error }) => Boolean(error));
    await runCheck("student minor", `${relation} direct read`, "denied; aggregate only", () => rows(studentMinor.db, relation, "*"), ({ error }) => Boolean(error));
  }
  const evidenceSelect = "id,owner_id,status,reviewed_at";
  const evidenceScoped = (ownerIds) => ({ data, error }) =>
    !error && (data ?? []).every((row) => ownerIds.includes(row.owner_id));
  await runCheck("anon", "profile_evidence direct read", "denied", () => rows(anonymous, "profile_evidence", evidenceSelect), ({ error }) => Boolean(error));
  const studentEvidence = await rows(studentMinor.db, "profile_evidence", evidenceSelect);
  const schoolEvidence = await rows(schoolA.db, "profile_evidence", evidenceSelect);
  check("student minor", "profile_evidence direct read", "owner scoped", describe(studentEvidence), (studentEvidence.data ?? []).length > 0 && evidenceScoped([studentMinor.user.id])(studentEvidence));
  check("school A", "profile_evidence direct read", "same-school reviewer scoped", describe(schoolEvidence), (schoolEvidence.data ?? []).length > 0 && evidenceScoped([studentMinor.user.id, studentAdult.user.id])(schoolEvidence));
  const secondSchoolEvidence = await rows(schoolB.db, "profile_evidence", evidenceSelect);
  check("school B", "profile_evidence cross-school read", "denied/scoped; other owner absent", describe(secondSchoolEvidence), (secondSchoolEvidence.data ?? []).length > 0 && evidenceScoped([studentSchoolB.user.id])(secondSchoolEvidence));
  await runCheck("company A", "profile_evidence direct read", "denied", () => rows(companyA.db, "profile_evidence", evidenceSelect), ({ error }) => Boolean(error));
  const eventsSelect = "id,evidence_id,actor_id,from_status,to_status,note";
  await runCheck("anon", "profile_evidence_events direct read", "denied", () => rows(anonymous, "profile_evidence_events", eventsSelect), ({ error }) => Boolean(error));
  await runCheck("student minor", "profile_evidence_events direct read", "denied; audit relation is not an API", () => rows(studentMinor.db, "profile_evidence_events", eventsSelect), ({ error }) => Boolean(error));
  await runCheck("school A", "profile_evidence_events direct read", "denied; audit relation is not an API", () => rows(schoolA.db, "profile_evidence_events", eventsSelect), ({ error }) => Boolean(error));
  await runCheck("school B", "profile_evidence_events cross-school read", "denied; audit relation is not an API", () => rows(schoolB.db, "profile_evidence_events", eventsSelect), ({ error }) => Boolean(error));

  await runCheck("anon", "suspended public student exclusion", "suspended id absent", () => rows(anonymous, "public_student_profiles", "id").eq("id", suspended.user.id), ({ data, error }) => !error && (data ?? []).length === 0);
  await runCheck("company A", "suspended authenticated directory exclusion", "suspended id absent", () => rows(companyA.db, "authenticated_profile_directory", "id").eq("id", suspended.user.id), ({ data, error }) => !error && (data ?? []).length === 0);

  const originalNameResponse = await rows(studentMinor.db, "profiles", "id,name").eq("id", studentMinor.user.id).maybeSingle();
  const originalName = originalNameResponse.data?.name;
  await runCheck("student minor", "own safe UPDATE name", "allowed and rolled back", () => studentMinor.db
    .from("profiles").update({ name: `${originalName} [runtime-check]` }).eq("id", studentMinor.user.id).select("id"), ({ error, data }) => !error && data?.length === 1);
  const restoreName = await studentMinor.db.from("profiles").update({ name: originalName }).eq("id", studentMinor.user.id).select("id");
  check("student minor", "own safe UPDATE name restoration", "one row restored", describe(restoreName), !restoreName.error && restoreName.data?.length === 1);

  const insertedEvidence = await studentAdult.db.from("profile_evidence").insert({
    evidence_type: "project", title: `runtime-check-${Date.now()}`, description: "runtime verifier fixture",
  }).select("id,owner_id,status").single();
  check("evidence owner", "evidence INSERT", "one pending row returned", describe(insertedEvidence), !insertedEvidence.error && insertedEvidence.data?.owner_id === studentAdult.user.id && insertedEvidence.data?.status === "pending");
  if (insertedEvidence.data?.id) {
    const cleanupInsert = await studentAdult.db.from("profile_evidence").delete().eq("id", insertedEvidence.data.id).eq("owner_id", studentAdult.user.id).select("id");
    check("evidence owner", "evidence INSERT cleanup", "one row deleted", describe(cleanupInsert), !cleanupInsert.error && cleanupInsert.data?.length === 1);
  }

  for (const [actor, table, column, value, id] of [
    [studentMinor, "profiles", "age", 99, studentMinor.user.id],
    [studentMinor, "profiles", "account_type", "company", studentMinor.user.id],
    [studentMinor, "student_profiles", "student_stage", "graduated", studentMinor.user.id],
  ]) {
    const response = await actor.db.from(table).update({ [column]: value }).eq(table === "profiles" ? "id" : "profile_id", id)
      .select(table === "profiles" ? "id" : "profile_id");
    const blocked = Boolean(response.error) || (Array.isArray(response.data) && response.data.length === 0);
    check("student minor", `protected UPDATE ${table}.${column}`, "denied", describe(response), blocked);
    if (!blocked) {
      const restoreValue = column === "age" ? 16 : column === "account_type" ? "student" : "enrolled";
      await actor.db.from(table).update({ [column]: restoreValue }).eq(table === "profiles" ? "id" : "profile_id", id);
    }
  }

  const pendingEvidence = await rows(schoolA.db, "profile_evidence", "id,owner_id,status")
    .eq("status", "pending").eq("owner_id", studentAdult.user.id).limit(1);
  if ((pendingEvidence.data ?? []).length > 0 && !pendingEvidence.error) {
    const evidence = pendingEvidence.data[0];
    const reviewed = await schoolA.db.from("profile_evidence").update({ status: "rejected", validation_note: "runtime-check" }).eq("id", evidence.id).select("id,status,reviewed_by,reviewed_at");
    check("school A", "evidence review pending -> rejected", "one rejected row returned with reviewer", describe(reviewed), !reviewed.error && reviewed.data?.length === 1 && reviewed.data[0]?.id === evidence.id && reviewed.data[0]?.status === "rejected" && reviewed.data[0]?.reviewed_by === schoolA.user.id && reviewed.data[0]?.reviewed_at);
    const resubmitted = await studentAdult.db.from("profile_evidence").update({ status: "pending", validation_note: "" }).eq("id", evidence.id).eq("owner_id", evidence.owner_id).select("id,status,reviewed_by,reviewed_at,validation_note");
    check("evidence owner", "evidence rejected -> pending resubmit", "one pending row with cleared review metadata", describe(resubmitted), !resubmitted.error && resubmitted.data?.length === 1 && resubmitted.data[0]?.status === "pending" && resubmitted.data[0]?.reviewed_by === null && resubmitted.data[0]?.reviewed_at === null && resubmitted.data[0]?.validation_note === "");
    const events = await studentAdult.db.rpc("get_profile_evidence_events", { p_evidence_id: evidence.id });
    check("evidence owner", "evidence event audit", "insert, reject and resubmit events", describe(events), !events.error && events.data?.some((event) => event.from_status === null && event.to_status === "pending") && events.data?.some((event) => event.from_status === "pending" && event.to_status === "rejected") && events.data?.some((event) => event.from_status === "rejected" && event.to_status === "pending"));
    const cleanupEvidence = await studentAdult.db.from("profile_evidence").delete().eq("id", evidence.id).eq("owner_id", evidence.owner_id).select("id");
    check("evidence owner", "evidence fixture cleanup", "one row deleted", describe(cleanupEvidence), !cleanupEvidence.error && cleanupEvidence.data?.length === 1);
  } else {
    check("fixtures", "evidence review/resubmit", "pending evidence fixture", describe(pendingEvidence), false, "SKIP");
  }

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
