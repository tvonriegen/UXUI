# TalentHub Next Actions

## Immediate

- Keep development work on `main` until a new branching policy is explicitly chosen.
- Push `main` directly to `origin`; no pull request is part of this integration.
- Confirm the new `.github/workflows/ci.yml` passes on GitHub after push.
- Grant the GitHub OAuth token the `workflow` scope before pushing commits that add or update workflows.
- Apply `supabase/migrations/20260726000002_application_readiness_timeline.sql` after the privacy/interview migrations.
- Apply `supabase/migrations/20260726000001_interviews_status_transitions.sql` to Supabase staging.
- Exercise company and student interview transitions with real authenticated roles.
- Set `SEED_SECRET` in Vercel and other deployed environments.

## Validation Matrix

- `npm run verify:is-minor`
- `npm run verify:contact-policy`
- `npm run verify:interviews-privacy-rls`
- `npm run verify:explainable-match`
- `npm run verify:application-readiness`
- `npm run verify:readiness-timeline`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Desktop and mobile smoke checks for dashboards, jobs, matching, applications, messages and health.

## Phase 1 UX Smoke Checks

- Student global search opens `/empleos?q=...` and filters by opportunity text.
- Company and school global search opens `/talent?q=...` and filters by name, specialty or title.
- Student navigation labels `/talent` as `Actividades`.
- Readiness recommendations open the relevant profile section.
- Profile inline edits persist after reload for biography, location, technical skills and soft skills.
- A new application records `Perfil revisado` before `Postulado` in its timeline.

## Deferred Maintenance

- Triage the 21 dependency vulnerabilities without unplanned major upgrades.
- Regenerate the broader `supabase/schema.sql` snapshot where historical drift remains.
- Add automated runtime authorization tests against a disposable Supabase instance.
- Split `apps/web/src/app/profile/page.tsx` in a dedicated maintenance change.
- Run moderated desktop and mobile UX checks with the four target personas.
