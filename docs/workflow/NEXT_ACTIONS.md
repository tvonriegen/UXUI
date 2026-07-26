# TalentHub Next Actions

## Immediate

- Keep development work on `main` until a new branching policy is explicitly chosen.
- Push `main` directly to `origin`; no pull request is part of this integration.
- Apply `supabase/migrations/20260726000001_interviews_status_transitions.sql` to Supabase staging.
- Exercise company and student interview transitions with real authenticated roles.
- Set `SEED_SECRET` in Vercel and other deployed environments.

## Validation Matrix

- `npm run verify:is-minor`
- `npm run verify:contact-policy`
- `npm run verify:interviews-privacy-rls`
- `npm run verify:explainable-match`
- `npm run verify:application-readiness`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Desktop and mobile smoke checks for dashboards, jobs, matching, applications, messages and health.

## Deferred Maintenance

- Triage the 21 dependency vulnerabilities without unplanned major upgrades.
- Regenerate the broader `supabase/schema.sql` snapshot where historical drift remains.
- Add automated runtime authorization tests against a disposable Supabase instance.
- Split `apps/web/src/app/profile/page.tsx` in a dedicated maintenance change.
