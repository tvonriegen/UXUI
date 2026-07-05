# Value Added

The approved value added is the transformation from a labor social network into a smarter and more verifiable application experience.

## Pillar 1: Explainable Compatibility

Compatibility must show the factors behind a score: specialty match, skill overlap, availability, evidence and gaps. The current `computeMatchScore` implementation in `apps/web/src/lib/utils/matching.ts` is the first baseline and should evolve into an explainable model.

## Pillar 2: Verified Student Profile

Profiles should include evidence, competencies, badges, academic context and validations issued by the school. Validation must be explicit and auditable.

## Pillar 3: Assisted Application

Before applying, a student should see readiness checks, missing profile fields, suggested evidence, skill gaps and risk warnings.

## Product Guardrail

Do not add generic social features unless they directly strengthen compatibility, validation or assisted application decisions.
