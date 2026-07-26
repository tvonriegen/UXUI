# Product Definition

## Product

TalentHub is a professional and social platform for technical-professional students. It connects students, companies, schools and external clients while preserving institutional trust, explainable matching and privacy by design.

## Four experiences

- **Estudiante:** builds a verified profile, explores opportunities, applies and communicates under age-aware rules.
- **Empresa:** publishes corporate opportunities, searches authorized talent and manages its applicant pipeline.
- **Colegio:** manages its institution, students, evidence validation and sensitive contact mediation.
- **Externo:** publishes simple freelance requests and reviews proposals without accessing corporate recruiting features.

## Core product loop

1. A student builds a profile with skills, projects and evidence.
2. The school validates selected evidence and provides institutional backing.
3. Companies and external clients publish opportunities within their allowed scope.
4. Students receive explainable compatibility and readiness guidance before applying.
5. Applications, interviews, contacts and status changes remain auditable.

## Product boundaries

Included: profiles, evidence, portfolios, validation, social feed, corporate opportunities, freelance requests, applications, matching, readiness, ATS, interviews, messaging, notifications, bulk school management and minor protection.

Excluded for this restructuring: native mobile apps, payments, invoicing, digital signatures, direct transfers, digital contracts, automatic AI rejection and a full stack rewrite.

## Current audit status

The repository contains a working TalentHub baseline with matching, readiness, evidence, contact mediation, interviews and timeline support. The four-persona model is not yet implemented: `Egresado` remains an access role, `Externo` is absent, and the current UI is a shared role-aware shell rather than four route spaces.
