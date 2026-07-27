const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const studentEmail = process.env.RUNTIME_STUDENT_EMAIL;
const studentPassword = process.env.RUNTIME_STUDENT_PASSWORD;
const externalEmail = process.env.RUNTIME_EXTERNAL_EMAIL;
const externalPassword = process.env.RUNTIME_EXTERNAL_PASSWORD;
const companyEmail = process.env.RUNTIME_COMPANY_EMAIL;
const companyPassword = process.env.RUNTIME_COMPANY_PASSWORD;

const required = { SUPABASE_URL: base, SUPABASE_PUBLISHABLE_KEY: key, RUNTIME_STUDENT_EMAIL: studentEmail, RUNTIME_STUDENT_PASSWORD: studentPassword, RUNTIME_EXTERNAL_EMAIL: externalEmail, RUNTIME_EXTERNAL_PASSWORD: externalPassword, RUNTIME_COMPANY_EMAIL: companyEmail, RUNTIME_COMPANY_PASSWORD: companyPassword };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error(`verify:runtime-opportunities skipped: missing ${missing.join(", ")}`);
  process.exit(2);
}

async function signIn(email, password) {
  const response = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`sign-in failed for ${email}: ${body.msg ?? body.error_description ?? response.status}`);
  return body;
}

async function request(path, token, init = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

try {
  const [student, external, company] = await Promise.all([
    signIn(studentEmail, studentPassword),
    signIn(externalEmail, externalPassword),
    signIn(companyEmail, companyPassword),
  ]);
  const publicRows = await request("opportunities?select=id&status=eq.open", null);
  if (!publicRows.response.ok || !Array.isArray(publicRows.body) || publicRows.body.length === 0) {
    throw new Error("anonymous public opportunity listing is unavailable");
  }

  const ownExternal = await request(`opportunities?select=id,publisher_type,opportunity_type&publisher_id=eq.${external.user.id}`, external.access_token);
  if (!ownExternal.response.ok || !ownExternal.body.some((row) => row.publisher_type === "external" && row.opportunity_type === "freelance")) {
    throw new Error("external fixture does not own a freelance opportunity");
  }

  const companyBoundary = await request("opportunities", company.access_token, {
    method: "POST",
    headers: { "content-type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ publisher_id: company.user.id, publisher_type: "external", opportunity_type: "freelance", title: "invalid boundary", description: "This must be rejected by RLS.", status: "open" }),
  });
  if (companyBoundary.response.ok) throw new Error("company was allowed to publish an external freelance opportunity");

  const studentRows = await request("opportunities?select=id&status=eq.open", student.access_token);
  if (!studentRows.response.ok) throw new Error("student cannot read public opportunities");
  console.log("verify:runtime-opportunities passed: public listing, external ownership and company boundary verified.");
} catch (error) {
  console.error(`verify:runtime-opportunities failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
