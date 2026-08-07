# Authorization Matrix

- **Verdict:** AUTHORIZATION **APPROVED**.
- **Status boundary:** entries describe the conceptual target unless marked `current`; current gaps remain migration work.
- **B1:** documentary design **READY / APPROVED**. No executable policy is introduced here.

## Sources of Authority

Authorization reads only trusted, domain-relevant sources: `auth.uid()`; `profiles.account_status`; active organization memberships; the resource's ownership column; the current primary active `student_enrollments` row for student context; resource status and type; explicit contact authorization; and domain relationships. `account_type` routes and onboards only. Client role selectors, editable metadata and `created_by_profile_id` do not authorize.

`created_by_profile_id` is a disjoint audit source. It records the historical actor, is set by the server for new writes, is not an ownership column, and does not grant edit, delete, access or transfer rights. If a Company A admin becomes disabled, the opportunity remains owned by Company A; another active Company A member may administer it, while the former actor cannot.

## Legend

`own` = the person owns the personal resource; `member` = active membership in the owning organization and role scope; `enroll` = current primary active enrollment; `context` = school mediation or validation context, not ownership; `public` = only an allowlisted projection; `deny` = no direct client operation. Company and school columns mean an active membership in that organization, not merely an account type.

| Resource | Student | Company member | School owner/admin | School teacher/reviewer | External | Public |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles` | own safe fields | own safe fields | linked safe fields only | assigned linked fields | own safe fields | public projection |
| `student_profiles` | own read/write | public projection | linked student scope with `member` + `enroll` | assigned linked scope with `member` + `enroll` | public projection | public projection |
| `organizations` | public/linked read | manage own org with `member` | manage own school with `member` | read own school with `member` | public read | public fields |
| `organization_memberships` | deny | company role scope | manage school membership within owner/admin scope | read own assigned membership | deny | deny |
| `student_enrollments` | read own; request permitted changes | no direct access unless domain relationship | manage linked academic context with `member` | assigned review scope | deny | deny |
| `external_profiles` | public when allowed | public when allowed | deny unless relationship | deny | own read/write | public projection |
| `profile_evidence` | own create/update/read | verified public only | review/validate linked evidence with `member` + `enroll` | assigned review/validate scope | verified public only | verified projection |
| `profile_evidence_events` | own history | deny/private | linked institutional history | assigned history | deny | deny |
| `opportunities` | read open; submit eligible surface | publish/read/update/close company-owned types with `member` | read approved; never publish | read permitted; never publish | publish/read/update/close own `freelance_request` | open public projection |
| `posts` | personal actor writes | personal or organization writes with `member` | school organization writes with `member` | scoped school writes | personal writes | public editorial projection |
| `applications` / proposals | own submission once per opportunity | manage applications on owned company opportunity | linked institutional status only | assigned status only | proposals are not corporate ATS | deny |
| `application_events` | own events | events for owned opportunities | linked institutional events | assigned events | own opportunity events | deny |
| `contact_requests` | own non-pending view as allowed | requester organization owns; school may mediate | approve/reject linked minor requests as `context` | approve/reject if delegated | requester profile owns; no minor bypass | deny |
| `student_contact_authorizations` | participant visibility | owning organization may grant/revoke | school mediation context | assigned context | owning personal profile scope | deny |
| `conversations/messages` | participant only; minor mediation | participant only after explicit authorization | linked students and approved contacts | assigned students | permitted participant only | deny |
| `interviews` | own participation | manage own-company application interviews | mediated status only | assigned status | no corporate ATS interviews | deny |
| `notifications` | own only | own only | own only | own only | own only | deny |

## Ownership Rules

- Resources with personal and organizational ownership use exactly one side of `*_organization_id XOR *_profile_id`; neither both-null nor both-set is valid.
- `posts.author_profile_id` is always the actor and is not part of ownership XOR. `posts.organization_id` distinguishes personal from organizational ownership.
- `opportunities.publisher_organization_id` is allowed only for `kind = company`; `publisher_profile_id` is for External personal publication. Schools never publish opportunities.
- `contact_requests.requester_organization_id XOR requester_profile_id` identifies the requester owner. `school_id` is mediator context, never an implicit owner.
- Membership loss does not delete organizational resources. It removes the former member's capability; another active member may continue administration.

## Enforcement Layers

Server route guards and server actions resolve the authenticated person, membership, enrollment, ownership and state. Database RLS must repeat those checks. Constraints, transition controls and audit history protect invariants. Client navigation is presentation only. Public access uses only the projections defined in `SECURITY_MODEL.md`.

## Gate Posture

B2 is **BLOCKED**. C is **BLOCKED exclusively by D-OD-1**; D is **BLOCKED**. Supabase is unchanged.
