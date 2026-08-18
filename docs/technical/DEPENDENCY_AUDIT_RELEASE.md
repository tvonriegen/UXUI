# Release dependency audit

Fecha: 2026-08-18  
Alcance: `apps/web`, sin cambios remotos.

## Resultado

Se ejecutó `npm audit` antes y después de aplicar actualizaciones compatibles con
los rangos existentes. El reporte pasó de 21 vulnerabilidades (11 high, 9
moderate, 1 low) a 6 high, sin vulnerabilidades critical.

Actualizaciones aplicadas:

- `@sentry/nextjs` `^10.47.0` → `^10.70.0`, junto con sus dependencias
  transitivas corregibles.
- `isomorphic-dompurify` `^3.8.0` → `^3.22.0` (incluye `dompurify` corregido).
- `postcss` directo `^8.4.38` → `^8.5.26`.
- Regeneración del lockfile mediante `npm audit fix --package-lock-only` y
  `npm ci --ignore-scripts`.

No se utilizó `--force`.

## Vulnerabilidades pendientes — aceptadas temporalmente (decisión Product Owner 2026-08-18)

| Paquete | Severidad | Motivo | Decisión |
| --- | --- | --- | --- |
| `next@14.2.35` | High | El rango auditado requiere una versión corregida posterior a la línea 15.5; npm solo ofrece `next@16.3.1` como fix automático. | Mantener Next 14 en este release para no introducir un upgrade mayor. Planificar upgrade mayor con pruebas de compatibilidad y revisión de contratos. |
| `eslint-config-next@14.2.35` / `@next/eslint-plugin-next` / `glob` | High | El fix automático requiere `eslint-config-next@16.3.1`, fuera de la línea compatible actual. | Mantener hasta decidir la migración de Next/ESLint; no ejecutar `npm audit fix --force`. |
| `next` → `postcss` anidado | High | La copia anidada de PostCSS la fija Next 14; actualizar el PostCSS directo no cambia esa dependencia. | Resolver como parte del upgrade de Next, no aplicar override no verificado. |
| `xlsx@0.18.5` | High | Prototype Pollution y ReDoS; npm reporta “No fix available” para este paquete. | Decidir reemplazo por una librería mantenida o aislamiento/validación estricta del importador antes de cerrar el riesgo. |

Estas vulnerabilidades bloquean una afirmación de auditoría limpia para el
release.

**Decisión del Product Owner (2026-08-18):** se **aceptan temporalmente** para el
release de estabilización (ver `docs/technical/STABILIZATION_RELEASE.md`). La
aceptación es una decisión de alcance, **no** una auditoría limpia: deja
**riesgo residual** (hallazgos high en `next`, `eslint-config-next`/`glob`,
PostCSS anidado y `xlsx`) con los siguientes follow-ups de remediación:

- Upgrade mayor de Next/ESLint (`next@16.3.1`) con pruebas de compatibilidad y
  revisión de contratos, en un cambio de mantenimiento controlado.
- Reemplazo de `xlsx` por una librería mantenida, o aislamiento/validación
  estricta del importador.
- No ejecutar `npm audit fix --force` sin plan.

La aceptación **no declara el release listo para producción**: la validación
runtime en staging y los authenticated smoke tests siguen siendo precondición
antes del despliegue.
