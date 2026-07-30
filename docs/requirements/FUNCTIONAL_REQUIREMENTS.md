# Functional Requirements

## Identity and access

- FR-001: The system supports exactly four account types: student, company, school and external.
- FR-002: `graduated` is a student stage, not an account type.
- FR-003: A single email/password login resolves account type on the server and redirects to the correct persona space.
- FR-004: Students are created or invited by a school and must change a temporary password on first access.
- FR-005: Students and companies may self-register temporarily; school access requires controlled invitation or approval, while external client signup remains paused.
- FR-006: Anonymous visitors are read-only.

## Profiles and evidence

- FR-010: Students can maintain specialty, skills, soft skills, availability, biography, projects, portfolio and evidence.
- FR-011: Schools can validate evidence and skills only for linked students and authorized membership scopes.
- FR-012: Graduated students retain profile, evidence, applications, contacts, validations, curriculum and portfolio.
- FR-013: Companies and externals see only the public projection allowed by privacy policy.
- FR-014: Public student data excludes RUT, personal contact details, exact age and private institutional reports.

## Institutions

- FR-020: A school can have owner, admin, teacher and reviewer members.
- FR-021: Schools can create and import students, change academic stage and review linked workflows.
- FR-022: School access is isolated between institutions.

## Opportunities and applications

- FR-030: Companies can publish internships, jobs and company projects.
- FR-031: Externals can publish freelance opportunities only.
- FR-032: Only the publisher can edit or close an opportunity.
- FR-033: Students can review and apply to eligible open opportunities, including freelance requests.
- FR-034: A unique database constraint prevents duplicate applications.
- FR-035: Matching and readiness explain fit and recommendations but never reject an application automatically.
- FR-036: Every application status change creates an auditable timeline event.

## Communication and privacy

- FR-040: Messaging is available only to permitted participants.
- FR-041: Company-to-minor contact requires approval by the student's school.
- FR-042: Externals cannot bypass minor mediation or access corporate ATS workflows.
- FR-043: Interviews and contact requests preserve actor, ownership and institution boundaries.
