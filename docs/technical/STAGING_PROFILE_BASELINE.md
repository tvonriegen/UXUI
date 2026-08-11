# Staging Profile Baseline

**Estado:** manifiesto operativo `current-runtime` para un staging vacío. No se ha aplicado ni validado en ningún runtime.

## Alcance y referencias

- Este perfil describe únicamente la provisión de staging sin organizaciones objetivo (`target organizations: none`).
- **Referencia del runtime actual (MCP):** `uwkigsomnkhwjcfrgdts` — evidencia actual disponible; el rol y la equivalencia operativa no están confirmados.
- **Referencia histórica de producción / GitHub Supabase Preview:** `eghskwwupruomiactvji` — evidencia histórica; el rol, la procedencia y la equivalencia con staging no están confirmados.
- Ambas referencias están marcadas **UNCONFIRMED**. No deben interpretarse como credenciales, destinos de despliegue ni autorización para operar sobre esos proyectos.

## Baseline de objetos

Los objetos se agrupan en bloques independientes para hacer explícitas las dependencias. El orden de aplicación es obligatorio:

| Bloque | Objetos incluidos | Dependencia operativa |
| --- | --- | --- |
| **B0 — Control** | Perfil, inventario de migraciones, convenciones de nombres, extensiones requeridas y registro de versión | Ninguna |
| **B1 — Identidad y adapters** | Identidad actual como adapters existentes: `profiles`, `account_type/status`, `schools`, `school_members`, `student_profiles`, `company_profiles`, `external_profiles` | B0 |
| **B2 — Catálogos** | Instituciones, ubicaciones, competencias, tipos de contrato y demás catálogos referenciados | B0, B1 |
| **B3 — Oportunidades** | La entidad canónica de oportunidad/oferta, estado, metadatos y relaciones de catálogo | B1, B2 |
| **B4 — Evidencia y postulantes** | Perfiles estudiantiles, evidencias, competencias, validaciones y datos de applicant | B1, B2 |
| **B5 — Aplicaciones** | Aplicaciones, estados, compatibilidad explicable, preparación y auditoría de cambios | B3, B4 |
| **B6 — Operación** | Índices, políticas/RLS, triggers, funciones, jobs, vistas y smoke checks de runtime | B0–B5 |

Aplicar siempre `B0 → B1 → B2 → B3 → B4 → B5 → B6`. No ejecutar bloques posteriores si el bloque previo no tiene evidencia de aceptación.

`organizations`, `organization_memberships` y `student_enrollments` son entidades objetivo del ADR-004 y quedan fuera de este baseline `current-runtime`; no forman parte de la implementación de B1.

## Conflictos de nomenclatura y mapeo

Antes de aplicar cualquier migración debe existir un mapeo aprobado y versionado para estos conflictos:

1. **`job_postings` vs `opportunities`:** seleccionar una única entidad canónica de staging y documentar cualquier alias, vista de compatibilidad o transformación. No duplicar ambas tablas por inferencia.
2. **`student_id` vs `applicant_id`:** definir si `applicant_id` referencia al perfil de usuario, al perfil estudiantil o a una entidad de postulante independiente; declarar las cardinalidades y las restricciones resultantes.
3. **`job_id` vs `opportunity_id`:** establecer la columna canónica y una política explícita de compatibilidad para datos, APIs, índices, FKs y nombres de eventos.

Mientras esos tres puntos no estén resueltos, **B3–B5 quedan bloqueados**.

## Migraciones y estrategia de provisión

- Las migraciones legacy se consideran **no replayables** hasta demostrar lo contrario. No se deben reproducir automáticamente sobre el staging vacío.
- La línea base debe construirse con una secuencia nueva, forward-only, idempotente donde sea posible y con referencias explícitas a la versión de origen.
- No se asume que el historial de producción ni el Preview histórico sea aplicable al runtime actual. La evidencia debe separarse entre estructura observada, intención histórica y comportamiento validado.
- Las semillas de organizaciones, vacantes, usuarios o aplicaciones están fuera de alcance: staging comienza vacío respecto de organizaciones objetivo.

## Rollback y reprovisionamiento

- La estrategia normal es **forward-only**: corregir mediante una migración posterior, sin editar ni reordenar migraciones ya registradas.
- No se promete rollback lógico de cambios de esquema salvo que una migración lo defina y pruebe expresamente.
- Para un staging vacío, el rollback operativo preferido es destruir y reprovisionar el entorno desde la línea base aprobada, preservando únicamente artefactos de diagnóstico autorizados.
- No aplicar esta estrategia a producción ni a un entorno con datos no reproducibles sin un plan independiente de respaldo y restauración.

## Criterios de aceptación

El perfil solo puede pasar a `READY` cuando exista evidencia verificable de que:

- el destino de staging está identificado y su rol confirmado;
- ambas referencias (`uwkigsomnkhwjcfrgdts` y `eghskwwupruomiactvji`) fueron contrastadas sin asumir equivalencia;
- el mapeo de los tres conflictos de nombres fue aprobado;
- el inventario B0–B6 y el orden de dependencias están versionados;
- las migraciones seleccionadas son replayables o fueron reemplazadas por una secuencia forward-only;
- RLS, FKs, índices, triggers, funciones y jobs de B6 tienen checks definidos;
- se ejecutaron smoke checks autenticados sobre el runtime de staging y se registraron resultados;
- se confirmó que no se cargaron organizaciones objetivo ni datos de producción.

## Bloqueo previo a la aplicación

**Bloqueado (`NOT READY`).** No aplicar migraciones, semillas ni jobs hasta resolver los criterios anteriores y obtener una revisión explícita del perfil. En particular, este documento no autoriza SQL remoto, operaciones sobre producción, uso de credenciales ni promoción de artefactos.

**Última declaración:** este manifiesto no constituye evidencia de aplicación ni de validación de runtime; ambas permanecen pendientes.
