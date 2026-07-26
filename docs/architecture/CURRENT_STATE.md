# Current State

## Repository

- `apps/web`: Next.js 14 App Router app.
- `supabase`: schema, migrations, reset script and seed data.
- `docs`: project documentation baseline.
- `scripts/maintenance`: manual maintenance SQL helpers.

## Application

The app uses TypeScript, React, Tailwind CSS, Supabase SSR/browser clients and optional Anthropic integration behind feature flags.

## Data

Supabase stores profiles, jobs, applications, messaging, gamification, interviews, reputation and radar data. Historical migrations preserve prior naming for traceability.

## Known Structural Risks

- Several route files are too large for long-term maintainability.
- Compatibility scoring exists but is not yet fully explainable in UX.
- AI chat is optional but must remain disabled unless env flags and keys are intentionally configured.
