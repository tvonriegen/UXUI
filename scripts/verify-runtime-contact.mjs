import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { createClient } = require(resolve(resolve(fileURLToPath(import.meta.url), "..", ".."), "apps/web/node_modules/@supabase/supabase-js"));
const required = (name) => {
  if (!process.env[name]) throw new Error(`Missing runtime contact fixture variable: ${name}`);
  return process.env[name];
};
const optional = (name) => process.env[name] || null;
const assert = (value, message) => { if (!value) throw new Error(message); };
const url = required("RUNTIME_SUPABASE_URL");
const key = required("RUNTIME_SUPABASE_ANON_KEY");
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(suffix) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({
    email: required(`RUNTIME_CONTACT_${suffix}_EMAIL`),
    password: required(`RUNTIME_CONTACT_${suffix}_PASSWORD`),
  });
  if (error || !data.user) throw new Error(`Could not authenticate contact fixture ${suffix}: ${error?.message || "no user"}`);
  return { client: c, id: data.user.id };
}

async function decision(actor, student, expected, label) {
  const { data, error } = await actor.client.rpc("can_request_student_contact", {
    p_student_id: required(student), p_message: `runtime contact gate: ${label}`,
  });
  assert(!error && data?.[0], `${label}: authorization RPC failed: ${error?.message || "empty result"}`);
  assert(data[0].decision === expected, `${label}: expected ${expected}, received ${data[0].decision}`);
  if (expected === "DENY") {
    assert(!data[0].contact_request_id && !data[0].conversation_id, `${label}: DENY returned side effects`);
  }
  if (expected === "MEDIATED") assert(data[0].contact_request_id, `${label}: MEDIATED did not return a request id`);
  return data[0];
}

async function updateStatus(actor, idName, status, expectedRows, label) {
  const { data, error } = await actor.client.from("contact_requests").update({ status })
    .eq("id", required(idName)).select("id");
  assert(!error, `${label}: update failed: ${error?.message}`);
  assert((data?.length ?? 0) === expectedRows, `${label}: expected ${expectedRows} affected rows, received ${data?.length ?? 0}`);
}

async function updateStatusById(actor, id, status, expectedRows, label) {
  const { data, error } = await actor.client.from("contact_requests").update({ status }).eq("id", id).select("id");
  assert(!error, `${label}: update failed: ${error?.message}`);
  assert((data?.length ?? 0) === expectedRows, `${label}: expected ${expectedRows} affected rows, received ${data?.length ?? 0}`);
}

async function assertPending(actor, idName, label) {
  const { data, error } = await actor.client.from("contact_requests").select("status").eq("id", required(idName)).single();
  assert(!error && data?.status === "pending", `${label}: failed attempt did not preserve pending state`);
}

async function run() {
  const company = await signIn("COMPANY");
  await decision(company, "RUNTIME_CONTACT_ADULT_ID", "ALLOW", "company own opportunity + adult");
  await decision(company, "RUNTIME_CONTACT_FOREIGN_STUDENT_ID", "DENY", "company foreign student");
  await decision(company, "RUNTIME_CONTACT_MINOR_ID", "MEDIATED", "company + minor");
  await decision(company, "RUNTIME_CONTACT_MISSING_RELATION_ID", "DENY", "missing opportunity relation");
  await decision(company, "RUNTIME_CONTACT_MISSING_ENROLLMENT_ID", "DENY", "missing enrollment");

  // A company is deliberately not a school reviewer, even when the request is
  // its own pending mediated request. This catches permissive-policy OR.
  const companyPending = optional("RUNTIME_CONTACT_COMPANY_MEDIATED_PENDING_ID");
  if (companyPending) {
    await updateStatus(company, "RUNTIME_CONTACT_COMPANY_MEDIATED_PENDING_ID", "approved", 0, "company self-approve mediated request");
    await assertPending(company, "RUNTIME_CONTACT_COMPANY_MEDIATED_PENDING_ID", "company self-approve mediated request");
  }

  const school = await signIn("SCHOOL");
  await decision(school, "RUNTIME_CONTACT_MINOR_ID", "DENY", "school actor cannot use company RPC");
  const schoolPending = optional("RUNTIME_CONTACT_SCHOOL_PENDING_ID");
  if (schoolPending) await updateStatus(school, "RUNTIME_CONTACT_SCHOOL_PENDING_ID", "approved", 1, "authorized school approval");
  const companyB = await signIn("COMPANY_B");
  const crossSchool = await decision(companyB, "RUNTIME_CONTACT_FOREIGN_STUDENT_ID", "MEDIATED", "company B real mediated insert for school B");
  assert(crossSchool.school_id === required("RUNTIME_CONTACT_SCHOOL_B_ID"), "real mediated insert did not map schools.profile_id for school B");
  await updateStatusById(school, crossSchool.contact_request_id, "approved", 0, "wrong school approval");

  const suspended = await signIn("SUSPENDED");
  await decision(suspended, "RUNTIME_CONTACT_ADULT_ID", "DENY", "suspended requester");

  const external = await signIn("EXTERNAL");
  assert(external.id === required("RUNTIME_CONTACT_EXTERNAL_ID"), "external fixture authenticated as an unexpected user");
  const opportunityId = required("RUNTIME_CONTACT_EXTERNAL_OPPORTUNITY_ID");
  const authorizedStudentId = required("RUNTIME_CONTACT_EXTERNAL_STUDENT_ID");
  const { data: opportunity, error: opportunityError } = await external.client.from("opportunities")
    .select("id,publisher_id,publisher_type,opportunity_type").eq("id", opportunityId).single();
  assert(!opportunityError && opportunity?.publisher_id === external.id && opportunity.publisher_type === "external" && opportunity.opportunity_type === "freelance", "external opportunity fixture is not owned/canonical freelance");
  const { data: proposal, error: proposalError } = await external.client.from("opportunity_proposals")
    .select("id").eq("opportunity_id", opportunityId).eq("applicant_id", authorizedStudentId).eq("status", "accepted").maybeSingle();
  assert(!proposalError && proposal?.id, "external authorized fixture must have an accepted proposal");
  await decision(external, "RUNTIME_CONTACT_EXTERNAL_STUDENT_ID", "ALLOW", "external accepted freelance proposal");
  await decision(external, "RUNTIME_CONTACT_EXTERNAL_UNRELATED_STUDENT_ID", "DENY", "unrelated external requester");
  if (optional("RUNTIME_CONTACT_EXTERNAL_PENDING_ID")) await updateStatus(external, "RUNTIME_CONTACT_EXTERNAL_PENDING_ID", "approved", 0, "external self-approve contact request");

  console.log("verify:runtime-contact passed all configured non-provisioning contact cases.");
}
run().catch((error) => { console.error(`verify:runtime-contact failed: ${error.message}`); process.exit(1); });
