# Authorization Matrix

Legend: `own` means the authenticated user owns the row; `school` means an active school membership scoped to the linked student; `public` means only the explicitly projected safe fields; `deny` means no direct client operation.

| Resource | Student | Company | School owner/admin | School teacher/reviewer | External | Public |
|---|---|---|---|---|---|---|
| `profiles` | read safe/public; update own editable fields | read safe/public; update own | read linked institution data; update allowed linked fields | read linked data; update only assigned scope | read safe/public; update own | safe projection only |
| `student_profiles` | read/update own editable fields | read authorized public projection | read/update linked institutional fields | read/review linked fields | read authorized public projection | public projection |
| `schools` | read linked/public | read approved/public | manage own school | read own school | read public | public fields |
| `school_members` | deny | deny | manage own membership | read own membership | deny | deny |
| `company_profiles` | read public | read/update own | read approved relationship | read approved relationship | read public | public fields |
| `external_profiles` | read public when allowed | read public when allowed | deny unless relationship requires | deny | read/update own | public fields |
| `opportunities` | read open; apply | create/read/update/close own corporate | read approved institutional opportunities | read permitted | create/read/update/close own freelance | read public open |
| `applications` | create once; read/update own allowed fields | read/update applications on own opportunities | read linked institutional status where authorized | read assigned status | create/read proposals only on own freelance opportunities | deny |
| `application_events` | read own | append through allowed transitions/read own opportunities | read linked institutional events | read assigned events | read own opportunity events | deny |
| `profile_evidence` | create/update own pending; resubmit; read own | read verified public only | review linked pending evidence | review assigned pending evidence | read verified public only | verified public projection |
| `profile_evidence_events` | read own | deny/private | read linked | read assigned | deny | deny |
| `posts/comments/reactions` | own writes; public reads | own writes; public reads | institution-scoped writes | institution-scoped writes | own writes; public reads | public reads only |
| `conversations/messages` | participant only, minor mediation | participant only, minor approval | linked students and approved contacts | assigned students only | permitted participant only | deny |
| `contact_requests` | no pending visibility | create/cancel own request | approve/reject linked requests | approve/reject if granted | no direct minor contact requests | deny |
| `interviews` | participate in own interviews | create/manage interviews on own applications | read mediated institutional status only | read assigned status | no corporate ATS interviews | deny |
| `notifications` | own only | own only | own only | own only | own only | deny |

## Enforcement layers

- Server route guards and server actions resolve identity and ownership from the session.
- RLS repeats ownership, membership, visibility and relationship checks.
- SQL constraints and triggers protect state transitions, uniqueness and audit history.
- Public pages use a safe view or RPC and never select the complete `profiles` row.
- Client-side navigation is presentation only.
