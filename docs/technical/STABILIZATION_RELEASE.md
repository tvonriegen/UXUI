# Release de estabilización

> **Alcance revisado (2026-08-18, segunda pasada).** La verificación de email queda **FUERA de
> este release**: no se configura ni se exige Email confirmations/SMTP en los gates de staging,
> producción o Preview. La revisión previa de este documento (2026-08-18, primera pasada)
> declaró "email verification obligatoria (config manual en Supabase Auth)"; esa decisión queda
> **superada** por este alcance y se conserva como trazabilidad histórica (ver también
> `docs/technical/KNOWN_ISSUES.md`, `docs/technical/RUNBOOK.md` y
> `docs/technical/STAGING_SETUP.md`).
>
> **Decisiones adicionales confirmadas por el Product Owner (2026-08-18):** las vulnerabilidades
> altas de `npm` se **aceptan temporalmente** para este release (decisión documentada en
> `docs/technical/DEPENDENCY_AUDIT_RELEASE.md`); el **rate limiting distribuido** queda
> **postergado** (se mantiene el rate limiter en memoria actual, sin limiter compartido); las
> **RPC ausentes de producción** (`public.get_own_profile()`, `public.get_school_dashboard()`)
> quedan **excluidas formalmente del alcance actual** (se conserva el fallback de compatibilidad
> ya presente en la aplicación; la reparación permanente queda pendiente por el plan de
> baseline). Este documento **no declara el release listo para producción**: la validación
> runtime en staging con fixtures y los authenticated smoke tests siguen siendo precondición.

- **Email verification FUERA del release.** No configurar ni exigir Email confirmations/SMTP
  para este release (ni en staging `uwkigsomnkhwjcfrgdts`, ni en producción
  `eghskwwupruomiactvji`, ni en la Preview Vercel `https://uxui-jad2.vercel.app/`). El registro
  público y el login no dependen de verificación por correo en este release.
  > **Contrato de registro en el working tree (ya alineado con este alcance, sin código
  > pendiente):** `apps/web/src/app/actions/auth.ts` usa `admin.auth.admin.createUser` con
  > `email_confirm: true` (login inmediato, sin esperar confirmación por correo), crea la fila
  > en `profiles` y el detalle en `company_profiles`/`student_profiles`, y devuelve
  > `{ success: true }`. La página `/register` inicia sesión automáticamente (`login`) y
  > redirige al dashboard correspondiente (`/student/dashboard` o `/company/dashboard`). No hay
  > `signUp` de anon ni guard fail-closed que reconciliar con este alcance.
- Se eliminó `/api/seed` de la aplicación. Las cuentas demo deben provisionarse mediante un
  proceso local o de staging explícitamente controlado, nunca desde una ruta pública productiva.
- AI Chat está **fuera del release**: el componente se conserva montado con `aiEnabled = false`
  hard-codeado (`apps/web/src/components/chat/ChatWidget.tsx`) y el endpoint `/api/chat`
  responde `503` ("El asistente IA no está disponible en este release"); no se realizan llamadas
  a Anthropic. Los flags   `ENABLE_AI_CHAT` / `NEXT_PUBLIC_ENABLE_AI_CHAT` y `ANTHROPIC_API_KEY` se
  retiraron de `.env.example` y ya no tienen consumidor en la aplicación (no se leen en
  `apps/web/src`; el `env` de `apps/web/next.config.js` sólo expone variables `NEXT_PUBLIC_*` y
  nunca los definió); **no configurarlos** en los entornos Vercel. El SDK `@anthropic-ai/sdk` permanece en `package.json` sin uso, como
  dependencia reversible para reactivación posterior.
- **Vulnerabilidades altas de npm aceptadas temporalmente** para este release por decisión del
  Product Owner; detalle y tabla de decisión en `docs/technical/DEPENDENCY_AUDIT_RELEASE.md`
  (`next@14.2.35`, `eslint-config-next`/`glob`, PostCSS anidado y `xlsx@0.18.5`). La aceptación
  es **temporal**: no bloquea este release pero deja **riesgo residual** y follow-ups
  obligatorios (upgrade mayor de Next/ESLint con pruebas de compatibilidad y revisión de
  contratos; reemplazo de `xlsx` por una librería mantenida o aislamiento/validación estricta
  del importador). No se ejecutó `npm audit fix --force`.
- **Rate limiting distribuido postergado.** Se mantiene el rate limiter en memoria actual
  (`rateLimit` en `xp`, `quests`, `streak`); el limiter compartido para el resto de la API queda
  **fuera del alcance de este release** y se registra como follow-up.
- **RPC ausentes de producción excluidas formalmente del alcance actual.**
  `public.get_own_profile()` y `public.get_school_dashboard()` no están disponibles en
  producción (PGRST202); la aplicación conserva el fallback de compatibilidad acotado
  (proyección allowlisted por `auth.uid()`, que no se activa ante errores de permisos o
  infraestructura). La **restauración permanente de las RPC queda fuera de este release** y se
  hará mediante el plan de baseline con migración forward revisada en staging (follow-up; ver
  `docs/technical/KNOWN_ISSUES.md`).
- La política compartida exige 12 caracteres, mayúscula, minúscula, número y carácter especial
  para registro y estudiantes creados por colegios.

Owner de validación: **Product Owner**; ventana objetivo del release: **2 horas**.

No se modificó producción ni se añadieron migraciones.

## Auditoría de dependencias

`npm audit --prefix apps/web` (sin `--omit=optional`; incluye dependencias opcionales) reportó 21 vulnerabilidades (0 críticas, 11 altas, 9 moderadas y 1 baja). La cifra canónica de esta sesión es **20 vulnerabilidades** (1 baja, 9 moderadas, 10 altas, 0 críticas), medida con `npm audit --omit=optional` dentro de `apps/web` (ver `docs/technical/KNOWN_ISSUES.md` §G y `docs/workflow/STATUS.md`); la diferencia de un hallazgo high corresponde a dependencias opcionales excluidas por `--omit=optional`. No se aplicaron actualizaciones automáticas: la corrección de Next.js requiere la versión 16.3.1 (migración mayor fuera de este release) y `xlsx` no tiene corrección disponible. Los paquetes afectados son `next`, `eslint-config-next`, `glob`, `brace-expansion`, `xlsx`, `@sentry/nextjs`/`@sentry/node`, `@opentelemetry/core`, `@opentelemetry/instrumentation-http`, `@opentelemetry/resources`, `@opentelemetry/sdk-trace-base`, `@sentry/webpack-plugin`, `dompurify`, `fast-uri`, `js-yaml`, `nanoid`, `postcss`, `uuid` y `ws`. El Product Owner **aceptó temporalmente** las vulnerabilidades altas remanentes para este release (decisión formal y tabla de decisión en `docs/technical/DEPENDENCY_AUDIT_RELEASE.md`); la aceptación deja **riesgo residual** y follow-ups de remediación abiertos.

## Riesgos y follow-ups

- **El release no está declarado listo para producción.** La validación runtime en staging
  (`uwkigsomnkhwjcfrgdts`) con fixtures y los authenticated smoke tests siguen siendo
  **precondición** antes del despliegue a producción (ver `RUNBOOK.md` y `STAGING_SETUP.md`).
- **Riesgo residual por vulnerabilidades aceptadas temporalmente:** `next@14.2.35`,
  `eslint-config-next`, PostCSS anidado y `xlsx@0.18.5` mantienen hallazgos high sin corrección
  en este release. Follow-ups: upgrade mayor de Next/ESLint (16.3.1) con pruebas de compatibilidad
  y revisión de contratos; reemplazo de `xlsx` o aislamiento/validación estricta del importador.
  **No ejecutar `npm audit fix --force`.**
- **Follow-up rate limiting:** decidir entre un limiter compartido para el resto de la API o
  retirar el rate limiter en memoria; el limiter en memoria actual protege sólo `xp`, `quests` y
  `streak`.
- **Follow-up RPC:** restaurar `public.get_own_profile()` y `public.get_school_dashboard()` en
  producción mediante el plan de baseline y una migración forward revisada en staging; no usar
  `supabase db push` ni `migration repair` contra producción.
- **Follow-up email verification:** permanece fuera del release; si se exige en el futuro,
  configurar Email confirmations/SMTP en Supabase Auth (cambio manual, fuera de los gates
  actuales).
