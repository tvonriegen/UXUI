# TalentHub Operations Runbook

## Rollback a Bad Deploy (Vercel)

1. Go to Vercel Dashboard → TalentHub project → Deployments
2. Find the last known-good deployment (green checkmark)
3. Click the three-dot menu → **Promote to Production**
4. Verify the site is responding at `/api/health`
5. Alert the team in the project Slack/chat channel

## First Vercel Deploy

1. Import the repository with the project root as the Vercel Root Directory, or keep the repository root and use the committed `vercel.json`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SEED_SECRET` in the Production environment. Keep `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` and `SENTRY_AUTH_TOKEN` server-only; never prefix them with `NEXT_PUBLIC_`.
3. Leave `ENABLE_AI_CHAT` and `NEXT_PUBLIC_ENABLE_AI_CHAT` set to `false` until Anthropic credentials and the feature are intentionally enabled.
4. Deploy a preview, check `/api/health`, then promote only after the staging runtime matrix passes.

## Rollback a Supabase Migration

1. Open Supabase Dashboard → SQL Editor
2. Run the rollback script: `scripts/rollback-migration.sql`
3. Verify the schema is as expected using Supabase Table Editor
4. If full schema reset is needed, review and re-apply `supabase/schema.sql`

**CAUTION:** Rolling back RLS policies exposes data. Only do this in a maintenance window.

## Supabase Migration Workflow

All schema changes must go through migration files in `supabase/migrations/`. Never edit the schema directly in the Supabase dashboard for production changes.

```bash
# Apply a reviewed forward migration in the target environment (never replay
# the historical directory against production):
supabase db push

# Create a new migration file:
# Name format: YYYYMMDDHHMMSS_description.sql
```

## Free Staging Project

The connected Supabase project is production. Create a second free project for staging instead of using a production branch or production fixtures. Follow `docs/technical/STAGING_SETUP.md` for the project, baseline, fixture and GitHub environment sequence.

Supabase Branching requires Pro and is not the free staging path. The Free plan provides up to two active projects per organization, subject to its usage limits and inactivity pause.

## Authenticated Staging Smoke Test

1. Apply the reviewed schema baseline to Supabase staging, then apply only forward migrations not already represented by that baseline.
2. Create or select dedicated staging fixtures for Company, School, a minor Student and External.
3. Create one pending `contact_requests` row and record its UUID as `RUNTIME_PENDING_CONTACT_REQUEST_ID`.
4. Select one disposable feed post and record its UUID as `RUNTIME_FEED_POST_ID`.
5. Add the documented `RUNTIME_*` values as GitHub Actions secrets in the `staging` environment.
6. Run the manual GitHub Actions workflow `Runtime Supabase Smoke`.
7. Confirm the company and school can read the request while the minor student cannot see the pending row, and confirm the feed RPC smoke test cleans up its temporary comment and restores the like state.

The security smoke test uses rejected writes and reads. The feed RPC smoke test performs temporary writes and cleanup. Do not point either workflow at production accounts or production data.

## Uptime Monitoring (UptimeRobot)

**Setup steps:**
1. Create a free account at https://uptimerobot.com
2. Add New Monitor → HTTP(s)
3. URL: `https://your-talenthub-domain.vercel.app/api/health`
4. Monitoring interval: 5 minutes
5. Alert contacts: Add your email
6. Expected keyword: `ok` (in the response body)

**Alert recipients:** [Add your email here]

**Escalation:** If the site is down > 10 minutes, check:
1. Vercel deployment status
2. Supabase project status at https://status.supabase.com
3. Recent code deployments on the active release branch

## Contact

- On-call: [Add team contact here]
- Supabase project: [Add your Supabase project URL here]
- Vercel project: [Add your Vercel project URL here]
