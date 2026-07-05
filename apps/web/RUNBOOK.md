# ClassLink – Operations Runbook

## Rollback a Bad Deploy (Vercel)

1. Go to Vercel Dashboard → ClassLink project → Deployments
2. Find the last known-good deployment (green checkmark)
3. Click the three-dot menu → **Promote to Production**
4. Verify the site is responding at `/api/health`
5. Alert the team in the project Slack/chat channel

## Rollback a Supabase Migration

1. Open Supabase Dashboard → SQL Editor
2. Run the rollback script: `scripts/rollback-migration.sql`
3. Verify the schema is as expected using Supabase Table Editor
4. If full schema reset needed, re-apply `supabase_schema.sql`

**CAUTION:** Rolling back RLS policies exposes data. Only do this in a maintenance window.

## Supabase Migration Workflow

All schema changes must go through migration files in `supabase/migrations/`. Never edit the schema directly in the Supabase dashboard for production changes.

```bash
# Apply a migration (run in Supabase SQL Editor, or via CLI):
supabase db push

# Create a new migration file:
# Name format: YYYYMMDDHHMMSS_description.sql
```

## Uptime Monitoring (UptimeRobot)

**Setup steps:**
1. Create a free account at https://uptimerobot.com
2. Add New Monitor → HTTP(s)
3. URL: `https://your-classlink-domain.vercel.app/api/health`
4. Monitoring interval: 5 minutes
5. Alert contacts: Add your email
6. Expected keyword: `ok` (in the response body)

**Alert recipients:** [Add your email here]

**Escalation:** If the site is down > 10 minutes, check:
1. Vercel deployment status
2. Supabase project status at https://status.supabase.com
3. Recent code deployments on the `test` branch

## Contact

- On-call: [Add team contact here]
- Supabase project: [Add your Supabase project URL here]
- Vercel project: [Add your Vercel project URL here]
