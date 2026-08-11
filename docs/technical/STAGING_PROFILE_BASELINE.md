# Staging Profile Boundary Baseline

**S1 estado:** `READY FOR REVIEW`
**S2 estado:** `BLOCKED`
**Aplicación/validación:** pendientes; este manifiesto no declara ningún runtime aplicado ni validado.
**Conteo local:** 1 baseline S1, 1 hotfix de perfil y 1 follow-up de grants; 0 ejecuciones remotas declaradas.

## Propósito y destino

S1 es un artefacto local, staging-only y reproducible para validar únicamente el
límite de perfiles en un staging vacío confirmado. El destino indicado es
`uwkigsomnkhwjcfrgdts`; producción (`eghskwwupruomiactvji`) queda totalmente
fuera de alcance. La confirmación del destino no autoriza SQL remoto, uso de
credenciales, fixtures ni carga de datos.

El artefacto es `supabase/staging/profile-runtime-baseline.sql`. No está bajo
`supabase/migrations` para evitar un `db push` accidental y debe fallar si
detecta objetos baseline-owned en `public` o `private`.

## Alcance S1

Incluye solamente las dependencias del límite de perfil:

- `profiles`, con identidad Auth, columnas usadas por `get_own_profile`, el
  hotfix y los campos de identidad/estado;
- `schools`, `school_members`, `student_profiles`, `company_profiles` y
  `external_profiles`;
- `skills`, `user_skills`, `skill_validations`, `profile_evidence` y
  `profile_evidence_events` mínimos para
  `public_student_profiles`;
- `auth.uid()` en guards/predicados mínimos, RLS, grants de mínimo privilegio,
  `public_student_profiles` y sus dependencias. Las vistas públicas usan
  `security_invoker` y `security_barrier`; los helpers de proyección quedan en
  `private` y no tienen ejecución para roles API.

S1 no crea organizaciones, memberships target, enrollments, backfills, Auth
users, fixtures ni datos de producción. No abre `SELECT` sensible ni `INSERT`
de `profiles`. La proyección pública es una allowlist y no contiene email, rut,
age, cellphone, gender ni `school_id`. La evidencia pública S1 es únicamente el
agregado booleano `has_verified_evidence`; no publica filas, URLs ni notas. El
directorio autenticado y el RPC de owner son creados/endurecidos por el hotfix
secuencial. `profile_evidence.validation_note` y los eventos de auditoría no
tienen lectura para `authenticated`.

Las policies públicas son deliberadamente no circulares: `student_profiles`
solo evalúa `public_visibility`; únicamente la policy pública de `profiles`
consulta esa relación para comprobar visibilidad. `student_profiles.school_id`
no se concede a `authenticated`, aunque se conserva como adapter interno para
los paths escolares del hotfix.

## Orden obligatorio

Aplicar en un staging vacío, después de revisión explícita:

1. `supabase/staging/profile-runtime-baseline.sql` (S1).
2. `supabase/migrations/20260810000001_harden_authenticated_profiles.sql` (hotfix;
   reemplaza las policies de evidence y recrea el guard de actualización).
3. `supabase/staging/profile-boundary-grants-followup.sql` (follow-up forward-only;
   corrige grants observados, reafirma policies/grants scoped de evidence y añade
   únicamente índices FK mínimos).
4. Crear usuarios Auth y cargar fixtures sintéticos **fuera de estos SQL**, solo
   para la verificación autorizada.
5. Ejecutar `npm run verify:runtime-profile-boundary` con las variables de
   fixtures sintéticos.

El paso 2 depende de que S1 ya exista: conserva las policies de actualización,
reemplaza `school_can_manage_student`, crea `get_own_profile`, aplica grants
allowlist y crea `authenticated_profile_directory` y
`company_profile_directory` sin exponer campos sensibles.

El paso 3 es obligatorio después de observar grants residuales en el staging
aplicado. Es staging-only y no debe copiarse a `supabase/migrations`, producción,
S2 ni fixtures; este repositorio no lo aplica remotamente desde el agente.

## S2 bloqueado

S2 no forma parte de este artefacto y permanece **`BLOCKED`**. Incluye el
runtime de `job_postings`, `opportunities`, `applications`, `proposals`,
`contact_requests`, `conversations`, `messages` y feed. Se bloquea hasta resolver
los conflictos de alias y ownership (`job_postings`/`opportunities`,
`student_id`/`applicant_id`, `job_id`/`opportunity_id`) y revisar sus adapters.
No se debe provisionar S2 como dependencia indirecta de S1.

El baseline histórico B0–B6 fue **descartado/no aplicable**: intentaba
provisionar runtime incompatible de aplicaciones, conversaciones, evidence y
adapters, además de oportunidades/contact/feed. No se debe replayar ni reparar
ese baseline.

## Guard, rollback y aceptación

El guard S1 es exhaustivo para el espacio que administra: requiere `public` y
`private` sin tablas, vistas, secuencias, rutinas, tipos ni objetos equivalentes.
No inspecciona `auth` ni crea usuarios. Si hay drift, se detiene antes de crear
objetos.

El rollback operativo es destruir y reprovisionar el staging descartable desde
el artefacto aprobado. No hay `DROP`/repair sobre producción ni rollback lógico
prometido para un entorno con datos.

`READY FOR REVIEW` significa que el diseño y el SQL están listos para revisión;
no significa aplicado, smoke-tested ni runtime validado. La promoción requiere
revisión del orden, aplicación controlada en el staging vacío y evidencia del
verificador, sin mezclar S2.
