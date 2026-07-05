# Non-Functional Requirements

## Security

- NFR-001: Never expose Supabase service role keys to the browser.
- NFR-002: Use Row Level Security and server-side authorization for private data.
- NFR-003: Do not commit real secrets, private dumps or generated build outputs.

## Privacy

- NFR-010: Student data must be scoped by role and school/company relationship.
- NFR-011: Minor student contact flows must preserve school mediation.

## Reliability

- NFR-020: The app should expose `/api/health` for uptime checks.
- NFR-021: Database changes must be expressed as migrations.

## Maintainability

- NFR-030: Repository structure must keep apps, database assets, docs and scripts separated.
- NFR-031: Large page components should be refactored gradually into smaller route-level modules.

## Performance

- NFR-040: Public pages and dashboards should remain responsive on mobile.
- NFR-041: Heavy client operations should be avoided in initial render paths.
