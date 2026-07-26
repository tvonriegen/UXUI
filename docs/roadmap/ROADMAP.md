# Roadmap

## Phase 0: Repository Professionalization

- Complete workspace structure.
- Establish documentation, Git workflow and QA baseline.
- Rebrand active surfaces to TalentHub.

## Phase 1: Explainable Compatibility

- [x] Return score factors from matching logic.
- [x] Show compatibility explanation in opportunity pages.
- [x] Add guidance for missing skills and evidence.

## Phase 2: Verified Student Profile

- [x] Model evidence more explicitly.
- [x] Add validation states and audit trail.
- [x] Improve profile completeness guidance.

## Phase 3: Assisted Application

- [x] Add pre-application readiness checklist.
- [x] Suggest improvements before applying.
- [x] Persist readiness state and connect it with the application timeline.

The readiness schema, contact mediation, interview transitions and evidence model are now deployed to the connected Supabase environment through idempotent migrations. Authenticated runtime fixtures remain a separate verification step.

## Phase 4: Production Hardening

- [x] Add CI for the verification, lint, typecheck and build matrix.
- [ ] Add automated runtime tests for authorization-sensitive flows.
- [x] Review the current RLS and API authorization surfaces.
- [ ] Configure monitoring and deployment runbooks.

## Phase 5: UX Continuity

- [x] Align role navigation and global search with the student application journey.
- [x] Make profile readiness recommendations link to actionable profile sections.
- [ ] Validate the main journeys with desktop and mobile user testing.
