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
- Git workflow: `docs/git/`
- QA: `docs/qa/`

## Current Status

MVP in active restructuring. Some legacy ClassLink naming can remain in historical migrations until it is safe to remove without losing traceability.
