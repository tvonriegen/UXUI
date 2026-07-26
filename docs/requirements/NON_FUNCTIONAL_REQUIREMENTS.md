# Non-Functional Requirements

## Security

- NFR-001: Never expose Supabase service role keys to the browser.
- NFR-002: Use Row Level Security and server-side authorization for private data.
- NFR-003: Do not commit real secrets, private dumps or generated build outputs.
- NFR-004: Authorization data must come from trusted database/app metadata, never client role selectors or editable user metadata.
- NFR-005: Every protected route and server action must enforce session, account type, ownership or membership and resource state.
- NFR-006: Sensitive SQL functions must use least privilege, explicit search paths and reviewed grants.

## Privacy

- NFR-010: Student data must be scoped by role and school/company relationship.
- NFR-011: Minor student contact flows must preserve school mediation.
- NFR-012: Anonymous access must use an allowlisted public projection and never expose the complete profile table.
- NFR-013: Exact age, direct contact data and private academic/institutional data must remain non-public.

## Reliability

- NFR-020: The app should expose `/api/health` for uptime checks.
- NFR-021: Database changes must be expressed as migrations.
- NFR-022: Migrations must be idempotent, preserve legacy identifiers during transition and include rollback/verification notes.

## Maintainability

- NFR-030: Repository structure must keep apps, database assets, docs and scripts separated.
- NFR-031: Large page components should be refactored gradually into smaller route-level modules.
- NFR-032: Current behavior must be preserved through characterization tests before moving high-risk flows.

## Performance

- NFR-040: Public pages and dashboards should remain responsive on mobile.
- NFR-041: Heavy client operations should be avoided in initial render paths.
- NFR-042: Persona layouts must support keyboard navigation, mobile navigation and explicit loading, empty and error states.
