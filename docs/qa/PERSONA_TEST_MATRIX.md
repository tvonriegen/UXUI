# Persona Test Matrix

| Persona | Scenario | Expected result | Level | Status in Phase 0 |
|---|---|---|---|---|
| Visitor | Open public landing and exploration | Loads without session and shows only public data | E2E | planned |
| Visitor | Publish a freelance request | Redirects/registers; no anonymous write | E2E/RLS | planned |
| Student | Login with email/password | Server redirects to `/student/dashboard` | Integration/E2E | planned |
| Student | Access company or school route | Denied by server guard | Integration/E2E | planned |
| Student | Create evidence | Own pending evidence is accepted | Domain/RLS | partial baseline |
| Student | Review own evidence | Cannot change review metadata/status to verified | RLS | partial baseline |
| Student | Apply twice | Database rejects duplicate application | RLS/constraint | baseline constraint, runtime pending |
| Student minor | Contacted by company | School approval is required before messaging | Integration/RLS/E2E | structural baseline |
| Student graduate | Login after graduation | Uses student space with `student_stage = graduated` | Integration/E2E | not implemented |
| Company A | Edit Company B opportunity | Denied by ownership policy | RLS/E2E | planned |
| Company | Publish corporate opportunity | Allowed only for company account | Integration/RLS | baseline for jobs |
| Company | Contact minor directly | Denied until school approval | RLS/E2E | structural baseline |
| School A | Read School B student | Denied by membership scope | RLS/E2E | planned |
| School | Validate linked evidence | Allowed with reviewer permission and audit event | Integration/RLS | partial baseline |
| School | Import students | Accounts link only to calling school | Integration/RLS | baseline action, runtime pending |
| External | Publish freelance | Allowed after email verification and only as freelance | Integration/RLS/E2E | not implemented |
| External | Publish corporate job | Denied by account type and opportunity type | RLS/E2E | not implemented |
| All | View sensitive profile fields publicly | Fields are absent from projection and API response | Privacy/E2E | currently failing |
