# Runtime Security Runbook

## Purpose

Run the canonical identity, public privacy, opportunity, proposal and school-scope checks against disposable Supabase staging fixtures. This suite must never target production users.

## Fixtures

Create isolated, email-confirmed accounts in the separate free staging project described in `docs/technical/STAGING_SETUP.md`:

- `student`: active minor student account linked to the staging school.
- `company`: active company account.
- `school`: active school owner account.
- `external`: active, email-confirmed external account with one open freelance opportunity.
- Optional second school and second student for cross-school isolation.
- Optional pending contact request linked to the first company, school and student.

The repository seed creates the demo fixture set when invoked through the staging deployment `/api/seed` endpoint with `SEED_SECRET`. Do not reuse these credentials in production.

## Environment Variables

- `RUNTIME_SUPABASE_URL`
- `RUNTIME_SUPABASE_ANON_KEY`
- `RUNTIME_STUDENT_EMAIL`
- `RUNTIME_STUDENT_PASSWORD`
- `RUNTIME_COMPANY_EMAIL`
- `RUNTIME_COMPANY_PASSWORD`
- `RUNTIME_SCHOOL_EMAIL`
- `RUNTIME_SCHOOL_PASSWORD`
- `RUNTIME_EXTERNAL_EMAIL`
- `RUNTIME_EXTERNAL_PASSWORD`
- `RUNTIME_SECOND_SCHOOL_EMAIL` (optional)
- `RUNTIME_SECOND_SCHOOL_PASSWORD` (optional)
- `RUNTIME_SECOND_STUDENT_EMAIL` (optional)
- `RUNTIME_SECOND_STUDENT_PASSWORD` (optional)
- `RUNTIME_PENDING_CONTACT_REQUEST_ID` (required by `verify:runtime-supabase`, optional in the security matrix)
- `RUNTIME_FEED_POST_ID` (required by the feed RPC smoke test)

## Local Execution

```bash
npm run verify:runtime-security
npm run verify:runtime-feed-rpcs
```

The command must be run with the variables above in the shell environment. The security matrix performs rejected writes and read checks. The feed RPC smoke test performs temporary writes and cleanup. Neither test may target production.

## GitHub Execution

Use the manually triggered `Runtime Security Smoke Tests` workflow. Store the variables as GitHub Actions secrets with the same names. The workflow is intentionally not part of push CI because it requires authenticated staging fixtures.

## Coverage

- Canonical `account_type` and protected student stage cannot be changed by clients.
- Anonymous clients cannot select private profile email fields.
- Public student projection excludes sensitive profile fields.
- Companies cannot publish external freelance opportunities.
- External accounts cannot publish corporate opportunities.
- External publishers can read their own opportunities.
- Anonymous clients cannot read proposal records.
- Students and external publishers can read proposal scopes allowed by RLS.
- Optional second-school fixtures test school membership isolation.
- Optional pending contact request fixture tests minor pending visibility.
- Feed RPC smoke test verifies trending tags, a reversible like toggle, comment insertion and cleanup.
