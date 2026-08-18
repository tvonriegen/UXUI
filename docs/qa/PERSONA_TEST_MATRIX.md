# Persona Test Matrix

| Persona | Scenario | Expected result | Level | Status in Phase 0 |
|---|---|---|---|---|
| Visitor | Open public landing and exploration | Loads without session and shows only public data | E2E | implemented structurally; runtime fixture pending |
| Visitor | Publish a freelance request | Redirects/registers; no anonymous write | E2E/RLS | planned |
| Student | Login with email/password | Server redirects to `/student/dashboard` | Integration/E2E | server guard implemented; runtime pending |
| Student | Access company or school route | Denied by server guard | Integration/E2E | server guard implemented; runtime pending |
| Student | Create evidence | Own pending evidence is accepted | Domain/RLS | partial baseline |
| Student | Review own evidence | Cannot change review metadata/status to verified | RLS | partial baseline |
| Student | Apply twice | Database rejects duplicate application | RLS/constraint | baseline constraint, runtime pending |
| Student minor | Contacted by company | School approval is required before messaging | Integration/RLS/E2E | structural baseline |
| Student graduate | Login after graduation | Uses student space with `student_stage = graduated` | Integration/E2E | implemented structurally; runtime pending |
| Company A | Edit Company B opportunity | Denied by ownership policy | RLS/E2E | policy implemented; runtime pending |
| Company | Publish corporate opportunity | Allowed only for company account | Integration/RLS | implemented for canonical opportunities |
| Company | Contact minor directly | Denied until school approval | RLS/E2E | structural baseline |
| School A | Read School B student | Denied by membership scope | RLS/E2E | policy implemented; runtime pending |
| School | Validate linked evidence | Allowed with reviewer permission and audit event | Integration/RLS | partial baseline |
| School | Import students | Accounts link only to calling school | Integration/RLS | baseline action, runtime pending |
| External | Publish freelance | Allowed only as freelance (email verification queda fuera del release 2026-08-18) | Integration/RLS/E2E | implemented; fixture pending |
| External | Publish corporate job | Denied by account type and opportunity type | RLS/E2E | policy implemented; runtime pending |
| All | View sensitive profile fields publicly | Fields are absent from projection and API response | Privacy/E2E | public projection implemented; full runtime pending |

> **Email verification (alcance release 2026-08-18):** la fila "External / Publish freelance" no
> exige verificación de email en este release — no se configura ni se exige Email
> confirmations/SMTP en los gates de staging, producción o Preview. La decisión previa de
> "email verification obligatoria (config manual en Supabase Auth)" queda superada y se
> conserva como trazabilidad histórica (ver `docs/technical/STABILIZATION_RELEASE.md`,
> `docs/technical/RUNBOOK.md` y `docs/technical/STAGING_SETUP.md`).
