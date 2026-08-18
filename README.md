# TalentHub

TalentHub is a web platform for connecting technical-professional students, graduates, schools and companies through smarter, verifiable applications.

## Product Direction

The project is moving from a labor-oriented social network into an assisted application platform with three approved pillars:

- Explainable compatibility between students and opportunities.
- Stronger student profiles with evidence, competencies and institutional validation.
- Assisted applications that guide students before they apply.

## Repository Structure

```txt
apps/web      Next.js web application
supabase      Schema, migrations and seed data
docs          Product, architecture, requirements, QA and Git documentation
scripts       Repository maintenance scripts
```

## Quick Start

Requires Node.js 22+ and npm 10+.

```bash
npm run install:web
cp .env.example apps/web/.env.local
npm run dev
```

The web app runs at `http://localhost:3000` by default.

## Main Commands

- `npm run dev`: start the Next.js app.
- `npm run lint`: run Next lint checks.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: build the web app.

## Documentation

- Product: `docs/product/`
- Requirements: `docs/requirements/`
- Architecture: `docs/architecture/`
- Technical debt and known issues: `docs/technical/`
- Free Supabase staging setup: `docs/technical/STAGING_SETUP.md`
- Git workflow: `docs/git/`
- QA: `docs/qa/`

## Current Status

`main` contains the normalized TalentHub workspace, standardized product surfaces, explainable matching, assisted application readiness and privacy hardening. Historical migrations remain traceable while the active product consistently uses TalentHub naming.

Release de estabilización confirmado: staging Supabase `uwkigsomnkhwjcfrgdts`, producción Supabase `eghskwwupruomiactvji` y Preview Vercel `https://uxui-jad2.vercel.app/`. Decisiones de release: email verification **fuera de este release** (no se configura ni se exige Email confirmations/SMTP en los gates), AI Chat fuera del release, `/api/seed` fuera del release (ruta eliminada en la implementación), **vulnerabilidades altas de npm aceptadas temporalmente** (ver `docs/technical/DEPENDENCY_AUDIT_RELEASE.md`), **rate limiting distribuido postergado** (se mantiene el rate limiter en memoria actual), **RPC ausentes de producción excluidas formalmente del alcance actual** (`public.get_own_profile()` y `public.get_school_dashboard()`, con fallback de compatibilidad ya presente); owner de validación: Product Owner; ventana objetivo: 2 horas. Detalle operativo en `docs/technical/RUNBOOK.md`, `docs/technical/STAGING_SETUP.md` y `docs/technical/STABILIZATION_RELEASE.md`. **El release no está declarado listo para producción**: la validación runtime en staging con fixtures y los authenticated smoke tests siguen siendo precondición antes del despliegue a producción. Una revisión previa de este release exigía email verification obligatoria (config manual en Supabase Auth); esa decisión quedó superada por el alcance actual y se conserva como trazabilidad histórica.
