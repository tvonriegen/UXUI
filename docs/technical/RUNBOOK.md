# TalentHub Operations Runbook

## Confirmed Release Configuration (2026-08-18)

Entornos confirmados para el release de estabilización:

| Entorno | Proveedor | Referencia |
| --- | --- | --- |
| Staging | Supabase | Proyecto `TalentHub Staging`, ref `uwkigsomnkhwjcfrgdts` |
| Producción | Supabase | Proyecto ref `eghskwwupruomiactvji` |
| Preview | Vercel | `https://uxui-jad2.vercel.app/` |
| Producción | Vercel | Dominio de producción por confirmar con el owner del proyecto Vercel |

Decisiones de release confirmadas (owner de validación: **Product Owner**; ventana objetivo del
release: **2 horas**; alcance de email verification revisado 2026-08-18):

- **Email verification FUERA del release.** No configurar ni exigir Email confirmations/SMTP en
  Supabase Auth para este release (ni en staging `uwkigsomnkhwjcfrgdts`, ni en producción
  `eghskwwupruomiactvji`, ni en la Preview `https://uxui-jad2.vercel.app/`). La revisión previa
  de este documento exigía "email verification obligatoria (config manual en Supabase Dashboard
  → Authentication → Providers → Email)"; esa decisión queda **superada** y se conserva como
  trazabilidad histórica.
  > **Contrato de registro (working tree, alineado con este alcance, sin código pendiente):**
  > `apps/web/src/app/actions/auth.ts` usa `admin.auth.admin.createUser` con `email_confirm: true`
  > (login inmediato), crea perfiles y devuelve `{ success: true }`; `/register` inicia sesión
  > automáticamente y redirige al dashboard. No hay `signUp` de anon ni guard fail-closed que
  > reconciliar.
- **AI Chat fuera del release.** La UI y el endpoint están hard-disabled (componente con
  `aiEnabled = false`; `/api/chat` responde 503); no se realizan llamadas
  a Anthropic ni se requieren credenciales para este release.
- **`/api/seed` fuera del release.** La implementación del release **elimina la ruta
  `/api/seed`** de la aplicación (working tree 2026-08-18, sin commitear; `SEED_SECRET` deja de
  ser necesario). Las cuentas demo deben provisionarse mediante un proceso local o de staging
  explícitamente controlado, nunca desde una ruta pública productiva.
- **Pasos manuales no validables localmente:** variables de entorno de Vercel (Preview y
  producción, owner del proyecto Vercel), y la verificación de runtime en staging (requiere
  fixtures y secretos `RUNTIME_*` en el entorno GitHub `staging`). El registro público ya
  implementa el alcance de email verification fuera del release; no requiere cambios de código.

## Rollback a Bad Deploy (Vercel)

1. Go to Vercel Dashboard → TalentHub project → Deployments
2. Find the last known-good deployment (green checkmark)
3. Click the three-dot menu → **Promote to Production**
4. Verify the site is responding at `/api/health`
5. Alert the team in the project Slack/chat channel

## First Vercel Deploy

1. Import the repository with the project root as the Vercel Root Directory, or keep the repository root and use the committed `vercel.json`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Production environment. **No configurar `SEED_SECRET`**: `/api/seed` se elimina en el release (working tree 2026-08-18, sin commitear); las cuentas demo se provisionan por un proceso local/staging controlado. La Preview confirmada es `https://uxui-jad2.vercel.app/` y debe apuntar al proyecto Supabase de staging (`uwkigsomnkhwjcfrgdts`) con su anon key. **No configurar flags AI (`ENABLE_AI_CHAT` / `NEXT_PUBLIC_ENABLE_AI_CHAT`) ni `ANTHROPIC_API_KEY`**: fueron retirados de `.env.example` en este release y ya no tienen consumidor en la aplicación (AI Chat fuera del release). Keep `SUPABASE_SERVICE_ROLE_KEY` and `SENTRY_AUTH_TOKEN` server-only; never prefix them with `NEXT_PUBLIC_`.
3. **No configurar Email confirmations/SMTP**: la verificación de email está **fuera de este release** (alcance revisado 2026-08-18); los gates no requieren habilitar confirmaciones en Supabase Auth (staging `uwkigsomnkhwjcfrgdts` ni producción `eghskwwupruomiactvji`).
4. Deploy a preview, check `/api/health`, then promote only after the staging runtime matrix passes.

## Rollback a Supabase Migration

1. Open Supabase Dashboard → SQL Editor
2. Run the rollback script: `scripts/maintenance/rollback-migration.sql`
3. Verify the schema is as expected using Supabase Table Editor
4. If full schema reset is needed, review and re-apply `supabase/schema.sql`

**CAUTION:** `scripts/maintenance/rollback-migration.sql` revierte únicamente la migración
`20260331000001_indexes_and_rls.sql` y debe revisarse antes de cada uso; no es un rollback
genérico de cualquier migración. Rolling back RLS policies exposes data. Only do this in a
maintenance window.

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
3. URL: `<dominio-de-produccion>.vercel.app/api/health` (el dominio de producción Vercel está por confirmar; la Preview confirmada es `https://uxui-jad2.vercel.app/` y no debe usarse como target de monitorización de producción)
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
- Supabase project: `https://eghskwwupruomiactvji.supabase.co` (producción) / `https://uwkigsomnkhwjcfrgdts.supabase.co` (staging)
- Vercel project: [Add your Vercel project URL here] (Preview confirmada: `https://uxui-jad2.vercel.app/`)
