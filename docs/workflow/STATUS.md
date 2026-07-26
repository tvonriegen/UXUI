# TalentHub Workflow Status

## Current Branch

- `main`
- HEAD: `8674fe8347cdf6f28b5808a36df3c629e96b956f`
- Worktree was clean at Phase 0 start.

## Current Phase

- Phase 0 audit and product contracts.
- Verdict: **APROBAR CON OBSERVACIONES**.
- Phase 1 has not started and must wait for explicit approval.

## Phase 0 delivered

- Four-persona product definition and journeys.
- Canonical role model: student, company, school, external; graduate as student stage.
- Current and target route maps.
- Authorization and public privacy matrices.
- ADRs for graduate state, external account and common opportunities.
- Incremental migration plan, persona test matrix and RLS test matrix.
- Live Supabase inventory and documented security observations.

## Existing baseline retained

- Explainable matching, readiness, evidence audit, contact mediation, interview transitions and application timeline.
- Local verification scripts, lint, typecheck and build CI baseline.

## Validation

- All nine repository verification scripts passed locally during Phase 0.
- `git diff --check` passed before documentation changes.
- Live Supabase queries confirmed 36 public tables, current policies, functions and triggers.
- Runtime persona/RLS suite is not yet implemented.

## Open observations

- `profiles.role` still contains `Egresado` and is used as authorization data.
- `Externo`, institution memberships, safe public projection and common opportunities are absent.
- Broad public profile reads and public-role policies require hardening.
- Supabase advisors report callable `SECURITY DEFINER` helpers and leaked-password protection disabled.
- Branch policy requested for the restructuring conflicts with the current direct-`main` workflow.

## Next Action

Obtain explicit approval of the Phase 0 contract and choose the sequential branch policy. Then begin Phase 1 with identity/membership schema design and negative RLS tests only.
