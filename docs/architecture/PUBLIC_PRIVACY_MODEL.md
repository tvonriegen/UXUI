# Public Privacy Model

## Public access

Anonymous visitors may see the landing page, public opportunity listings, public student profiles and explicitly public portfolio/evidence projections. Public reads must use `public_student_profiles` or an equivalent `security_invoker` view/RPC with an allowlisted column set.

## Allowed student projection

- Public identifier.
- Visible name and authorized avatar.
- Specialty, public biography and public availability.
- Validated skills.
- Verified public evidence and public portfolio items.
- School display name when the student and school allow it.
- Freelance availability and validation seal.

## Never public

RUT, personal email, phone, address, exact age, private observations, academic/behavior reports, psychological results, family data, internal identifiers, administrative metadata and credentials.

## Minor protection

- Unknown age for a student is treated as minor until verified by the trusted flow.
- A company cannot start direct contact with a minor.
- A contact request is scoped to the student's linked school and requires school approval.
- Existing history may remain visible to participants while new messages are blocked until approval.
- External accounts follow the same prohibition and cannot bypass company/school mediation.

## Current gap

The live database currently exposes a broad `profiles` SELECT policy to `public`, and the frontend selects complete profile rows in multiple routes. No safe public projection exists. This is a release-blocking security gap for the public exploration experience and must be resolved before exposing anonymous talent search.
