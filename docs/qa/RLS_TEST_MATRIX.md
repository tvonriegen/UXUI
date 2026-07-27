# RLS Test Matrix

## Required fixtures

Use separate authenticated fixtures for Company A, Company B, School A, School B, minor Student A, adult Student B, graduated Student C and verified External A. Never use production users.

## Required assertions

| Area | Assertion |
|---|---|
| Identity | Client cannot change account type, student stage, school link or membership role. |
| Profiles | A user can update only editable fields of their own profile; public reads return only allowlisted fields. |
| Institutions | School A cannot read or mutate School B students, evidence or requests. |
| Opportunities | Company ownership is enforced; external accounts can create only freelance opportunities. |
| Applications | One application per applicant/opportunity; closed opportunities reject inserts; matching/readiness never reject by themselves. |
| Evidence | Student cannot verify own evidence; only linked school reviewers can review pending evidence. |
| Contact | Company-to-minor request requires linked school; pending request is not visible to the minor; delete is denied. |
| Messaging | Conversation creation and message insert use the same age-aware contact predicate. |
| Interviews | Insert references the caller's own opportunity and real applicant; status transitions are actor-scoped. |
| Timeline | Application creation and status changes generate immutable events. |
| Notifications | A user reads and updates only their own notifications. |
| Public privacy | RUT, email, phone, exact age and private reports are absent anonymously and from unauthorized authenticated reads. |

## Current remote baseline

The connected database has the canonical identity, opportunities, proposal and internship mapping migrations applied. Public profile reads use the allowlisted projection, while authenticated compatibility reads on `profiles` remain broad during legacy migration. The runtime matrix is implemented in `scripts/verify-runtime-security.mjs` and runs through the manual `Runtime Security Smoke Tests` workflow. It requires isolated staging fixtures and is not considered passing until that workflow completes successfully.

## Runtime command

Run locally only against disposable staging fixtures:

```bash
npm run verify:runtime-security
```

Required variables are documented in `docs/qa/RUNTIME_SECURITY_RUNBOOK.md`. Never point this suite at production users.
