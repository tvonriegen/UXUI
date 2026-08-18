# Staging Setup

## Confirmed Environments (2026-08-18)

- **Staging (Supabase):** proyecto `TalentHub Staging`, ref **`uwkigsomnkhwjcfrgdts`**.
- **Producción (Supabase):** ref **`eghskwwupruomiactvji`**.
- **Preview (Vercel):** **`https://uxui-jad2.vercel.app/`**.

Decisiones de release confirmadas (owner de validación: **Product Owner**; ventana objetivo:
**2 horas**; alcance de email verification revisado 2026-08-18):

- **Email verification FUERA del release.** No configurar ni exigir Email confirmations/SMTP en
  los gates (staging `uwkigsomnkhwjcfrgdts`, producción `eghskwwupruomiactvji`, Preview
  `https://uxui-jad2.vercel.app/`). La decisión previa de "email verification obligatoria
  (config manual en Supabase Dashboard → Authentication → Providers → Email)" queda **superada**
  y se conserva como trazabilidad histórica.
  > **Contrato de registro (working tree, alineado con este alcance, sin código pendiente):**
  > `apps/web/src/app/actions/auth.ts` usa `admin.auth.admin.createUser` con `email_confirm: true`
  > (login inmediato), crea perfiles y devuelve `{ success: true }`; `/register` inicia sesión
  > automáticamente y redirige al dashboard. No hay `signUp` de anon ni guard fail-closed que
  > reconciliar.
- **AI Chat fuera del release.** La UI y el endpoint están hard-disabled; no se requieren flags ni
  credenciales Anthropic para este release.
- **`/api/seed` fuera del release.** La implementación del release **elimina la ruta
  `/api/seed`** de la aplicación (working tree 2026-08-18, sin commitear; `SEED_SECRET` deja de
  ser necesario). Las cuentas demo se provisionan por un proceso local/staging explícitamente
  controlado, nunca desde una ruta pública productiva.

## Recommended Environment

The second Supabase project named `TalentHub Staging` is **confirmed** at ref
`uwkigsomnkhwjcfrgdts`. The current connected project is production (`eghskwwupruomiactvji`)
and must never receive runtime fixtures.

The Supabase Free plan provides two active projects per organization. A second free project is sufficient for the current smoke suite, with these operational limits:

- 500 MB database size per project.
- 50,000 monthly active users.
- 5 GB egress.
- Projects pause after one week of inactivity.
- No production data is copied automatically.

Supabase Branching is not the free alternative: preview branches require Pro and are billed by usage.

## Provisioning Order

1. Create `TalentHub Staging` in the same organization, provided the organization has an available free-project slot. **DONE:** el proyecto está confirmado en `uwkigsomnkhwjcfrgdts` (los pasos siguientes se refieren a esa instancia).
2. Keep the production project URL and keys out of staging configuration.
3. Generate a schema baseline from the current production database without copying application data.
4. Review the baseline against `supabase/migrations/` before applying it to staging.
5. Apply only the forward migrations that are not represented by the baseline.
6. Seed disposable accounts and records for the runtime matrix.
7. Record the staging URL, anon key, fixture IDs and fixture credentials outside the repository.

The local migration directory is not a replayable copy of production history. Do not run all historical migrations against a new project without first reviewing a schema baseline.

## Required S1 Fixtures

S1 requires active staging accounts for this fixed catalogue (confirmadas por el provisionador
vía API admin con `email_confirm: true` — confirmación operator-side, independiente de la
configuración SMTP / Email confirmations del proyecto):

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
RUNTIME_SUPABASE_URL="https://uwkigsomnkhwjcfrgdts.supabase.co" \
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

The approved full-runtime local bootstrap is a cold two-run gate. Each run
uses an isolated disposable workspace and removes it in cleanup; it is not run
as part of the normal lint/typecheck gate because it requires Docker.

```bash
npm run bootstrap:runtime-full-local
```

El bootstrap local reserva cooperativamente un bloque alternativo de puertos en
`127.0.0.1` mediante un lock atómico temporal. Cada ejecución genera su propio
`config.toml` desechable, reporta únicamente el bloque/puertos asignados y
libera la reserva al finalizar o recibir una señal. Así puede coexistir con
otras instalaciones locales de Supabase; no detiene contenedores ajenos ni usa
operaciones globales de Docker Compose. Si no puede reservar un bloque libre,
falla de forma cerrada antes de iniciar el workdir.

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

The Vercel project owner must configure the Preview environment to use the staging Supabase URL (`https://uwkigsomnkhwjcfrgdts.supabase.co`) and its anon key. The confirmed Preview URL is `https://uxui-jad2.vercel.app/`; `RUNTIME_APP_URL` must point to it when running the authenticated health check.

Production Vercel variables must continue to point to the production Supabase project (`eghskwwupruomiactvji`) and must not reuse staging credentials. **No configurar `SEED_SECRET`**: `/api/seed` se elimina en el release (working tree 2026-08-18, sin commitear); las cuentas demo se provisionan por proceso local/staging controlado.

## Promotion Gate

Promote to production only after:

- Static repository verification passes.
- Lint, typecheck and production build pass.
- All staging runtime workflows pass.
- Vercel Preview login and `/api/health` checks pass (Preview `https://uxui-jad2.vercel.app/`).
- Production migration SQL has been reviewed separately.
- Email verification está **fuera de este release** (alcance revisado 2026-08-18): no se
  configura ni se exige Email confirmations/SMTP en los gates; la decisión previa de habilitar
  confirmaciones manualmente en Supabase Auth quedó superada.
- La validación final la realiza el **Product Owner** dentro de la **ventana objetivo de 2 horas**.

References:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/deployment/branching
