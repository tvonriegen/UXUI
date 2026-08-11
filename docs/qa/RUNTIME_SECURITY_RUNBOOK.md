# S1 Runtime Profile-Boundary Runbook

## Purpose

Run only the S1 canonical identity, public privacy, profile-update and school-scope checks against disposable Supabase staging fixtures. This runbook makes no claim about full runtime security and must never target production users.

## Required S1 Fixtures

Create isolated, email-confirmed accounts in the separate free staging project described in `docs/technical/STAGING_SETUP.md`:

- `StudentMinorA`: minor student linked to `SchoolA` (`age < 18`).
- `StudentAdultA`: adult student linked to `SchoolA` (`age >= 18`).
- `StudentSchoolB`: student linked to `SchoolB`.
- `SchoolA`: active school owner account.
- `SchoolB`: active second-school owner account.
- `CompanyA`: active company account.
- `CompanyB`: second active company account.
- `ExternalA`: active external account.
- `Suspended`: suspended account used to verify exclusion.

The second school/student and suspended fixtures are mandatory for S1, not
optional. There is no generic `RUNTIME_STUDENT` alias: age and status are
validated from each fixture's own profile.

The operator-only fixture utility is `scripts/provision-runtime-profile-fixtures.mjs`. It requires the staging URL, service-role key and an explicit local staging confirmation. It is never run by GitHub Actions and its service-role key is never a smoke-test secret.

## Environment Variables

- `RUNTIME_SUPABASE_URL`
- `RUNTIME_SUPABASE_ANON_KEY`
- `RUNTIME_SUPABASE_SERVICE_ROLE_KEY` (local operator only; never GitHub smoke secrets)
- `RUNTIME_SUPABASE_STAGING_CONFIRMATION=staging-only` (local operator confirmation)
- `RUNTIME_STUDENT_MINOR_A_EMAIL` / `RUNTIME_STUDENT_MINOR_A_PASSWORD` (required; `age < 18`)
- `RUNTIME_STUDENT_ADULT_A_EMAIL` / `RUNTIME_STUDENT_ADULT_A_PASSWORD` (required; `age >= 18`)
- `RUNTIME_STUDENT_SCHOOL_B_EMAIL` / `RUNTIME_STUDENT_SCHOOL_B_PASSWORD` (required; StudentSchoolB)
- `RUNTIME_SCHOOL_A_EMAIL` / `RUNTIME_SCHOOL_A_PASSWORD` (required; SchoolA)
- `RUNTIME_SCHOOL_B_EMAIL` / `RUNTIME_SCHOOL_B_PASSWORD` (required; SchoolB)
- `RUNTIME_COMPANY_A_EMAIL` / `RUNTIME_COMPANY_A_PASSWORD` (required; CompanyA)
- `RUNTIME_COMPANY_B_EMAIL` / `RUNTIME_COMPANY_B_PASSWORD` (required; CompanyB)
- `RUNTIME_EXTERNAL_A_EMAIL` / `RUNTIME_EXTERNAL_A_PASSWORD` (required; ExternalA)
- `RUNTIME_SUSPENDED_EMAIL` (required; Suspended)
- `RUNTIME_SUSPENDED_PASSWORD` (required; Suspended)

## Local Execution

```bash
npm run verify:authenticated-profile-boundary
npm run verify:profile-evidence
npm run verify:runtime-profile-boundary
```

The provisioning utility is intentionally not executed by this repository change. When an operator provisions the disposable staging project, capture its JSON output locally and map the fixture credentials to the `RUNTIME_*` variables above without committing them. The S1 verifier performs reversible mutations and restores the original values.

## GitHub Execution

Use the manually triggered `Runtime Security Smoke Tests` workflow. Store only the anon-key and fixture credentials as GitHub Actions secrets. The workflow runs the S1 structural checks and `verify:runtime-profile-boundary`; it does not run S2 opportunity, proposal or feed verifiers.

## Coverage

- Canonical `account_type`, `age` and protected student stage cannot be changed by clients.
- Owners can update and roll back an allowlisted profile name.
- Active school reviewers can reject pending evidence and owners can resubmit it with review metadata cleared.
- Anonymous clients cannot select private profile email fields.
- Public student projection excludes sensitive profile fields.
- Required second-school fixtures test school membership isolation.

## S2 explicitly excluded

Opportunity, application, proposal, contact-request, conversation, messaging and
feed runtime checks remain S2 and blocked. They are not prerequisites or claims of
this S1 workflow.
