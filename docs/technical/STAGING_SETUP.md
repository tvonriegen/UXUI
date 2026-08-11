# Staging Setup

## Recommended Environment

Create a second Supabase project named `TalentHub Staging`. The current connected project is production and must never receive runtime fixtures.

The Supabase Free plan provides two active projects per organization. A second free project is sufficient for the current smoke suite, with these operational limits:

- 500 MB database size per project.
- 50,000 monthly active users.
- 5 GB egress.
- Projects pause after one week of inactivity.
- No production data is copied automatically.

Supabase Branching is not the free alternative: preview branches require Pro and are billed by usage.

## Provisioning Order

1. Create `TalentHub Staging` in the same organization, provided the organization has an available free-project slot.
2. Keep the production project URL and keys out of staging configuration.
3. Generate a schema baseline from the current production database without copying application data.
4. Review the baseline against `supabase/migrations/` before applying it to staging.
5. Apply only the forward migrations that are not represented by the baseline.
6. Seed disposable accounts and records for the runtime matrix.
7. Record the staging URL, anon key, fixture IDs and fixture credentials outside the repository.

The local migration directory is not a replayable copy of production history. Do not run all historical migrations against a new project without first reviewing a schema baseline.

## Required S1 Fixtures

S1 requires email-confirmed, active staging accounts for this fixed catalogue:

- `StudentMinorA`: minor student linked to `SchoolA` (`age < 18`).
- `StudentAdultA`: adult student linked to `SchoolA` (`age >= 18`).
- `StudentSchoolB`: student linked to `SchoolB`.
- `SchoolA`: active school owner or administrator.
- `SchoolB`: active second-school owner or administrator.
- `CompanyA`: active company account.
- `CompanyB`: second active company account.
- `ExternalA`: active external account.
- `Suspended`: suspended account used to prove exclusion.

The second school/student pair and suspended account are mandatory for S1.

### Operator-only fixture provisioning

After the S1 baseline and profile hotfix are applied to the confirmed disposable
staging project, provision fixtures locally with:

```bash
RUNTIME_SUPABASE_URL="https://<confirmed-staging-project>.supabase.co" \
RUNTIME_SUPABASE_SERVICE_ROLE_KEY="<local-only-service-role-key>" \
RUNTIME_SUPABASE_STAGING_CONFIRMATION=staging-only \
node scripts/provision-runtime-profile-fixtures.mjs
```

The utility creates or refreshes synthetic Auth users identified by an email
marker, then upserts only S1 profiles, schools, memberships, skills and evidence.
Passwords are generated at runtime and credentials/IDs are printed only to local
stdout. Do not run it in GitHub Actions, against production, or with a committed
key. The service-role variable is intentionally absent from the GitHub environment.

## GitHub Environment

Store these values in the GitHub `staging` environment only:

- `RUNTIME_APP_URL`.
- `RUNTIME_SUPABASE_URL`.
- `RUNTIME_SUPABASE_ANON_KEY`.
- `RUNTIME_PENDING_CONTACT_REQUEST_ID`.
- `RUNTIME_FEED_POST_ID`.
- `RUNTIME_STUDENT_MINOR_A_EMAIL` and `RUNTIME_STUDENT_MINOR_A_PASSWORD` (required; active, `age < 18`).
- `RUNTIME_STUDENT_ADULT_A_EMAIL` and `RUNTIME_STUDENT_ADULT_A_PASSWORD` (required; active, `age >= 18`).
- `RUNTIME_STUDENT_SCHOOL_B_EMAIL` and `RUNTIME_STUDENT_SCHOOL_B_PASSWORD` (required; StudentSchoolB).
- `RUNTIME_SCHOOL_A_EMAIL` and `RUNTIME_SCHOOL_A_PASSWORD` (required; SchoolA).
- `RUNTIME_SCHOOL_B_EMAIL` and `RUNTIME_SCHOOL_B_PASSWORD` (required; SchoolB).
- `RUNTIME_COMPANY_A_EMAIL` and `RUNTIME_COMPANY_A_PASSWORD` (required; CompanyA).
- `RUNTIME_COMPANY_B_EMAIL` and `RUNTIME_COMPANY_B_PASSWORD` (required; CompanyB).
- `RUNTIME_EXTERNAL_A_EMAIL` and `RUNTIME_EXTERNAL_A_PASSWORD` (required; ExternalA).
- `RUNTIME_SUSPENDED_EMAIL` and `RUNTIME_SUSPENDED_PASSWORD` (required; Suspended, `account_status=suspended`).

Never store production passwords or the Supabase service role key in these runtime smoke secrets.

## Local Execution

Run only against the staging project. This is the S1 profile-boundary sequence:

```bash
npm run verify:authenticated-profile-boundary
npm run verify:profile-evidence
npm run verify:runtime-profile-boundary
```

The runtime profile verifier performs temporary allowlisted/protected profile
updates and evidence review/resubmission, restoring the fixture state before exit.
S2 runtime checks for opportunities, proposals, contact requests and feed are
deliberately not invoked here.

## Vercel Preview

The Vercel project owner must configure the Preview environment to use the staging Supabase URL and anon key. `RUNTIME_APP_URL` must point to the resulting Preview URL when running the authenticated health check.

Production Vercel variables must continue to point to the production Supabase project and must not reuse staging credentials.

## Promotion Gate

Promote to production only after:

- Static repository verification passes.
- Lint, typecheck and production build pass.
- All staging runtime workflows pass.
- Vercel Preview login and `/api/health` checks pass.
- Production migration SQL has been reviewed separately.

References:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/deployment/branching
