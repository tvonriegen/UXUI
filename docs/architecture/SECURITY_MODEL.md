# Security Model

## Principles

- Browser code can only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed with `NEXT_PUBLIC_`.
- Authorization must be enforced server-side for API routes, server actions and Supabase policies.

## Current Controls

- Supabase SSR/browser clients are separated in `src/lib/supabase.ts` and `src/lib/supabase-server.ts`.
- Security headers are configured in `apps/web/next.config.js`.
- AI chat is disabled unless both public and server feature flags are enabled.

## Required Reviews

- Review all RLS policies before production use.
- Verify that school/company scoping is enforced server-side, not only in UI.
- Review `/api/seed` exposure before deploying any non-local environment.
