import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
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
const authFixtures = new WeakMap();

function client() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(key) {
  const email = required(`RUNTIME_${key}_EMAIL`);
  const password = required(`RUNTIME_${key}_PASSWORD`);
  const db = client();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Could not authenticate ${key} fixture`);
  const fixture = { db, user: data.user, email, password };
  authFixtures.set(db, fixture);
  return fixture;
}

function isFutureJwt(errorOrResponse) {
  const error = errorOrResponse?.error ?? errorOrResponse;
  return error?.code === "PGRST303"
    && /JWT issued at future/i.test(error?.message ?? "");
}

async function refreshAuth(actor) {
  const fixture = authFixtures.get(actor?.db ?? actor);
  if (!fixture) return;
  try {
    const refreshed = await fixture.db.auth.refreshSession();
    if (!refreshed.error) return;
  } catch {
    // Fall through to the explicit fixture re-authentication below.
  }
  const reauthenticated = await fixture.db.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  if (reauthenticated.error || !reauthenticated.data?.user) {
    throw reauthenticated.error ?? new Error("Could not refresh authenticated runtime fixture");
  }
}

async function retryTransientJwt(actor, action) {
  for (const delay of [0, 1000, 2000]) {
    if (delay) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      await refreshAuth(actor);
    }
    try {
      const response = await action();
      if (!isFutureJwt(response) || delay === 2000) return response;
    } catch (error) {
      if (!isFutureJwt(error) || delay === 2000) throw error;
    }
  }
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

function rows(db, relation, select, filters = {}) {
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
  await runCheck(label, "canonical fixture status", `${expectedType}/${expectedStatus}`, () => retryTransientJwt(fixture, () => fixture.db.rpc("get_own_profile")), ({ data, error }) => {
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

  const publicStudent = await retryTransientJwt(anonymous, () => rows(anonymous, "public_student_profiles", "id,name,specialty,bio,availability,school_name,validated_skills,has_verified_evidence"));
  check("anon", "public student projection", "allowed, no sensitive columns", describeProjection(publicStudent), !publicStudent.error && (publicStudent.data ?? []).length > 0 && (publicStudent.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)));
  const authenticatedStudent = await retryTransientJwt(studentMinor, () => rows(studentMinor.db, "public_student_profiles", "id,name,specialty,bio,availability,school_name,validated_skills,has_verified_evidence"));
  check("authenticated", "public student projection", "allowed, aggregate fields only", describeProjection(authenticatedStudent), !authenticatedStudent.error && (authenticatedStudent.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)) && (authenticatedStudent.data ?? []).length > 0);
  const publicCompany = await retryTransientJwt(anonymous, () => rows(anonymous, "company_profile_directory", "id,name,company_name,bio,avatar,location,industry,employee_count,website,benefits,tech_stack"));
  check("anon", "public company projection", "allowed, no sensitive columns", describe(publicCompany), !publicCompany.error && (publicCompany.data ?? []).length > 0 && (publicCompany.data ?? []).every((row) => !["email", "rut", "cellphone", "age", "gender", "school_id"].some((key) => key in row)));

  await runCheck("anon", "direct profiles sensitive read", "denied", () => retryTransientJwt(anonymous, () => rows(anonymous, "profiles", "email").limit(1)), ({ error }) => Boolean(error));
  await runCheck("student minor", "direct profiles sensitive read", "denied", () => retryTransientJwt(studentMinor, () => rows(studentMinor.db, "profiles", "email").eq("id", studentMinor.user.id)), ({ error }) => Boolean(error));
  await runCheck("anon", "get_own_profile", "denied", () => retryTransientJwt(anonymous, () => anonymous.rpc("get_own_profile")), ({ error }) => Boolean(error));
  await runCheck("minor student", "own get_own_profile", "own row with age<18 and active", () => retryTransientJwt(studentMinor, () => studentMinor.db.rpc("get_own_profile")), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === studentMinor.user.id && typeof data[0]?.profile?.email === "string" && Number(data[0]?.profile?.age) < 18 && data[0]?.profile?.account_status === "active");
  await runCheck("adult student", "own get_own_profile", "own row with age>=18 and active", () => retryTransientJwt(studentAdult, () => studentAdult.db.rpc("get_own_profile")), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === studentAdult.user.id && Number(data[0]?.profile?.age) >= 18 && data[0]?.profile?.account_status === "active");
  await runCheck("suspended", "own get_own_profile", "own row with account_status=suspended", () => retryTransientJwt(suspended, () => suspended.db.rpc("get_own_profile")), ({ data, error }) => !error && data?.length === 1 && data[0]?.profile?.id === suspended.user.id && data[0]?.profile?.account_status === "suspended");
  await runCheck("company A", "authenticated student directory", "allowed public rows", () => retryTransientJwt(companyA, () => rows(companyA.db, "authenticated_profile_directory", "id,name,account_type,account_status")), ({ data, error }) => !error && (data ?? []).length > 0 && (data ?? []).every((row) => row.account_type === "student" && row.account_status === "active"));
  await runCheck("company A", "company directory", "allowed active company projection", () => retryTransientJwt(companyA, () => rows(companyA.db, "company_profile_directory", "id,name,company_name,industry")), ({ data, error }) => !error && (data ?? []).length > 0 && (data ?? []).every((row) => row.id && row.name !== undefined));
  await runCheck("school A", "school_can_manage_student=true", "true for same-school student", () => retryTransientJwt(schoolA, () => schoolA.db.rpc("school_can_manage_student", { p_student_id: studentMinor.user.id })), ({ data, error }) => !error && data === true);
  await runCheck("school A", "school_can_manage_student=false", "false for unknown student", () => retryTransientJwt(schoolA, () => schoolA.db.rpc("school_can_manage_student", { p_student_id: "00000000-0000-0000-0000-000000000000" })), ({ data, error }) => !error && data === false);
  await runCheck("school A", "get_school_dashboard", "one SchoolA aggregate", () => retryTransientJwt(schoolA, () => schoolA.db.rpc("get_school_dashboard")), ({ data, error }) => !error && data?.length === 1 && Number(data[0]?.student_count) >= 2);
  await runCheck("school B", "get_school_dashboard", "one SchoolB aggregate", () => retryTransientJwt(schoolB, () => schoolB.db.rpc("get_school_dashboard")), ({ data, error }) => !error && data?.length === 1 && Number(data[0]?.student_count) >= 1);
  await runCheck("school A", "school roster projection", "exact SchoolA roster, no sensitive metadata", () => retryTransientJwt(schoolA, () => schoolA.db.rpc("get_school_students")), ({ data, error }) => (
    !error && data?.length === 2 && new Set(data.map((row) => row.id)).size === 2
    && [studentMinor.user.id, studentAdult.user.id].every((id) => data.some((row) => row.id === id))
    && data.every((row) => !["email", "school_id", "student_stage", "validation_note"].some((key) => key in row))
  ));

  await runCheck("school B", "cross-tenant school_can_manage_student", "false for other school student", () => retryTransientJwt(schoolB, () => schoolB.db.rpc("school_can_manage_student", { p_student_id: studentMinor.user.id })), ({ data, error }) => !error && data === false);
  await runCheck("school B", "legacy owner without membership", "true for own SchoolB student", () => retryTransientJwt(schoolB, () => schoolB.db.rpc("school_can_manage_student", { p_student_id: studentSchoolB.user.id })), ({ data, error }) => !error && data === true);
  await runCheck("school B", "legacy owner roster projection", "exact SchoolB roster", () => retryTransientJwt(schoolB, () => schoolB.db.rpc("get_school_students")), ({ data, error }) => !error && data?.length === 1 && data[0]?.id === studentSchoolB.user.id);
  await runCheck("school A", "cross-tenant student direct profile", "denied sensitive read", () => retryTransientJwt(schoolA, () => rows(schoolA.db, "profiles", "email").eq("id", studentSchoolB.user.id)), ({ error }) => Boolean(error));

  // S1 base relations are never public. Skills/validations are consumed only
  // by private projection aggregates; evidence/events remain owner/reviewer
  // scoped. This matrix is read-only and deliberately does not probe UPDATE.
  for (const relation of ["user_skills", "skill_validations"]) {
    await runCheck("anon", `${relation} direct read`, "denied", () => retryTransientJwt(anonymous, () => rows(anonymous, relation, "*")), ({ error }) => Boolean(error));
    await runCheck("student minor", `${relation} direct read`, "denied; aggregate only", () => retryTransientJwt(studentMinor, () => rows(studentMinor.db, relation, "*")), ({ error }) => Boolean(error));
  }
  const evidenceSelect = "id,owner_id,status,reviewed_at";
  const evidenceScoped = (ownerIds) => ({ data, error }) =>
    !error && (data ?? []).every((row) => ownerIds.includes(row.owner_id));
  await runCheck("anon", "profile_evidence direct read", "denied", () => retryTransientJwt(anonymous, () => rows(anonymous, "profile_evidence", evidenceSelect)), ({ error }) => Boolean(error));
  const studentEvidence = await retryTransientJwt(studentMinor, () => rows(studentMinor.db, "profile_evidence", evidenceSelect));
  const schoolEvidence = await retryTransientJwt(schoolA, () => rows(schoolA.db, "profile_evidence", evidenceSelect));
  check("student minor", "profile_evidence direct read", "owner scoped", describe(studentEvidence), (studentEvidence.data ?? []).length > 0 && evidenceScoped([studentMinor.user.id])(studentEvidence));
  check("school A", "profile_evidence direct read", "same-school reviewer scoped", describe(schoolEvidence), (schoolEvidence.data ?? []).length > 0 && evidenceScoped([studentMinor.user.id, studentAdult.user.id])(schoolEvidence));
  const secondSchoolEvidence = await retryTransientJwt(schoolB, () => rows(schoolB.db, "profile_evidence", evidenceSelect));
  check("school B", "profile_evidence cross-school read", "denied/scoped; other owner absent", describe(secondSchoolEvidence), (secondSchoolEvidence.data ?? []).length > 0 && evidenceScoped([studentSchoolB.user.id])(secondSchoolEvidence));
  await runCheck("company A", "profile_evidence direct read", "denied or no rows", () => retryTransientJwt(companyA, () => rows(companyA.db, "profile_evidence", evidenceSelect)), ({ data, error }) => Boolean(error) || (Array.isArray(data) && data.length === 0));
  const eventsSelect = "id,evidence_id,actor_id,from_status,to_status,note";
  await runCheck("anon", "profile_evidence_events direct read", "denied", () => retryTransientJwt(anonymous, () => rows(anonymous, "profile_evidence_events", eventsSelect)), ({ error }) => Boolean(error));
  await runCheck("student minor", "profile_evidence_events direct read", "denied; audit relation is not an API", () => retryTransientJwt(studentMinor, () => rows(studentMinor.db, "profile_evidence_events", eventsSelect)), ({ error }) => Boolean(error));
  await runCheck("school A", "profile_evidence_events direct read", "denied; audit relation is not an API", () => retryTransientJwt(schoolA, () => rows(schoolA.db, "profile_evidence_events", eventsSelect)), ({ error }) => Boolean(error));
  await runCheck("school B", "profile_evidence_events cross-school read", "denied; audit relation is not an API", () => retryTransientJwt(schoolB, () => rows(schoolB.db, "profile_evidence_events", eventsSelect)), ({ error }) => Boolean(error));

  await runCheck("anon", "suspended public student exclusion", "suspended id absent", () => retryTransientJwt(anonymous, () => rows(anonymous, "public_student_profiles", "id").eq("id", suspended.user.id)), ({ data, error }) => !error && (data ?? []).length === 0);
  await runCheck("company A", "suspended authenticated directory exclusion", "suspended id absent", () => retryTransientJwt(companyA, () => rows(companyA.db, "authenticated_profile_directory", "id").eq("id", suspended.user.id)), ({ data, error }) => !error && (data ?? []).length === 0);

  const originalNameResponse = await retryTransientJwt(studentMinor, () => rows(studentMinor.db, "profiles", "id,name").eq("id", studentMinor.user.id).maybeSingle());
  const originalName = originalNameResponse.data?.name;
  await runCheck("student minor", "own safe UPDATE name", "allowed and rolled back", () => retryTransientJwt(studentMinor, () => studentMinor.db
    .from("profiles").update({ name: `${originalName} [runtime-check]` }).eq("id", studentMinor.user.id).select("id")), ({ error, data }) => !error && data?.length === 1);
  const restoreName = await retryTransientJwt(studentMinor, () => studentMinor.db.from("profiles").update({ name: originalName }).eq("id", studentMinor.user.id).select("id"));
  check("student minor", "own safe UPDATE name restoration", "one row restored", describe(restoreName), !restoreName.error && restoreName.data?.length === 1);

  const runtimeEvidenceTitle = `runtime-check-${Date.now()}-${randomUUID()}`;
  for (const [actor, table, column, value, id] of [
    [studentMinor, "profiles", "age", 99, studentMinor.user.id],
    [studentMinor, "profiles", "account_type", "company", studentMinor.user.id],
    [studentMinor, "student_profiles", "student_stage", "graduated", studentMinor.user.id],
  ]) {
    const response = await retryTransientJwt(actor, () => actor.db.from(table).update({ [column]: value }).eq(table === "profiles" ? "id" : "profile_id", id)
      .select(table === "profiles" ? "id" : "profile_id"));
    const blocked = Boolean(response.error) || (Array.isArray(response.data) && response.data.length === 0);
    check("student minor", `protected UPDATE ${table}.${column}`, "denied", describe(response), blocked);
    if (!blocked) {
      const restoreValue = column === "age" ? 16 : column === "account_type" ? "student" : "enrolled";
      await retryTransientJwt(actor, () => actor.db.from(table).update({ [column]: restoreValue }).eq(table === "profiles" ? "id" : "profile_id", id));
    }
  }

  let evidenceId;
  let evidenceInsertConfirmed = false;
  try {
    const insertedEvidence = await retryTransientJwt(studentAdult, () => studentAdult.db.from("profile_evidence").insert({
      evidence_type: "project", title: runtimeEvidenceTitle, description: "runtime verifier fixture",
    }).select("id,owner_id,status").single());
    evidenceId = insertedEvidence.data?.id;
    evidenceInsertConfirmed = !insertedEvidence.error
      && Boolean(evidenceId)
      && insertedEvidence.data?.owner_id === studentAdult.user.id
      && insertedEvidence.data?.status === "pending";
    check("evidence owner", "evidence INSERT", "one pending row returned", describe(insertedEvidence), evidenceInsertConfirmed);

    if (!evidenceInsertConfirmed) {
      const blocked = "BLOCKED: evidence INSERT did not confirm id, StudentAdultA owner_id, and pending status";
      check("school A", "evidence review pending -> rejected", "FAIL/BLOCKED: INSERT confirmation required", blocked, false);
      check("evidence owner", "evidence rejected -> pending resubmit", "FAIL/BLOCKED: INSERT confirmation required", blocked, false);
      check("evidence owner", "evidence event audit", "FAIL/BLOCKED: INSERT confirmation required", blocked, false);
    } else {
      const reviewed = await retryTransientJwt(schoolA, () => schoolA.db.from("profile_evidence").update({ status: "rejected", validation_note: "runtime-check" }).eq("id", evidenceId));
      check("school A", "evidence review pending -> rejected", "UPDATE allowed without RETURNING", describe(reviewed), !reviewed.error);

      const resubmitted = await retryTransientJwt(studentAdult, () => studentAdult.db.from("profile_evidence").update({ status: "pending", validation_note: "", reviewed_by: null, reviewed_at: null }).eq("id", evidenceId).eq("owner_id", studentAdult.user.id));
      check("evidence owner", "evidence rejected -> pending resubmit", "UPDATE allowed without RETURNING", describe(resubmitted), !resubmitted.error);

      const events = await retryTransientJwt(studentAdult, () => studentAdult.db.rpc("get_profile_evidence_events", { p_evidence_id: evidenceId }));
      const transitions = (events.data ?? [])
        .toSorted((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
        .map((event) => [event.from_status, event.to_status]);
      const expectedTransitions = [[null, "pending"], ["pending", "rejected"], ["rejected", "pending"]];
      check("evidence owner", "evidence event audit", "exact null -> pending -> rejected -> pending sequence", describe(events), !events.error && JSON.stringify(transitions) === JSON.stringify(expectedTransitions));
    }
  } finally {
    if (evidenceId) {
      try {
        const cleanupEvidence = await retryTransientJwt(studentAdult, () => studentAdult.db.from("profile_evidence").delete().eq("id", evidenceId).select("id"));
        check("evidence owner", "evidence fixture cleanup", "one row deleted", describe(cleanupEvidence), !cleanupEvidence.error && cleanupEvidence.data?.length === 1);
      } catch (error) {
        check("evidence owner", "evidence fixture cleanup", "one row deleted", `ERROR: ${error instanceof Error ? error.message : String(error)}`, false);
      }
    }
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
