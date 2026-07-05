# Target Architecture

## Goals

- Keep one web app in `apps/web` until another app is justified.
- Keep Supabase assets at repository root for clear database ownership.
- Separate product docs, requirements, architecture and QA from implementation code.
- Build TalentHub features around compatibility, validation and assisted application flows.

## Suggested App Boundaries

- `src/app`: route entry points and route-specific server actions.
- `src/components`: reusable UI and domain components.
- `src/lib`: clients, shared types, validation, matching and pure utilities.
- Future `src/features`: candidate location for larger domain modules when refactoring large pages.

## Target Domain Modules

- Matching: scoring, explanation factors and gap analysis.
- Evidence: portfolio, badges, documents and validation state.
- Applications: readiness checklist, submission and timeline.
- Institutions: school validation and mediation workflows.

## Deployment

The app is expected to deploy on Vercel with Supabase as backend. Production env variables must be configured outside Git.
