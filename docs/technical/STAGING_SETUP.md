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

## Required Fixtures

Create email-confirmed, active staging accounts for:

- `student`: minor student linked to the staging school.
- `company`: company account.
- `school`: school owner or administrator.
- `external`: external account with one open freelance opportunity.
- Optional second school and student for cross-school isolation.

Create one pending contact request linked to the company, school and minor student. Select one disposable feed post for `RUNTIME_FEED_POST_ID`.

## GitHub Environment

Store these values in the GitHub `staging` environment only:

- `RUNTIME_APP_URL`.
- `RUNTIME_SUPABASE_URL`.
- `RUNTIME_SUPABASE_ANON_KEY`.
- `RUNTIME_PENDING_CONTACT_REQUEST_ID`.
- `RUNTIME_FEED_POST_ID`.
- `RUNTIME_STUDENT_EMAIL` and `RUNTIME_STUDENT_PASSWORD`.
- `RUNTIME_COMPANY_EMAIL` and `RUNTIME_COMPANY_PASSWORD`.
- `RUNTIME_SCHOOL_EMAIL` and `RUNTIME_SCHOOL_PASSWORD`.
- `RUNTIME_EXTERNAL_EMAIL` and `RUNTIME_EXTERNAL_PASSWORD`.
- Optional second-school and second-student credentials.

Never store production passwords or the Supabase service role key in these runtime smoke secrets.

## Local Execution

Run only against the staging project:

```bash
npm run verify:runtime-supabase
npm run verify:runtime-security
npm run verify:runtime-feed-rpcs
```

The feed RPC smoke test performs a temporary like and comment mutation, restores the like state and deletes the comment. It is prohibited against production.

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
