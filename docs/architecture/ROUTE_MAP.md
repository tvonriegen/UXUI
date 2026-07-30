# Route Map

## Current route inventory (audited 2026-07-26)

The app now exposes public routes, protected persona dashboards and compatibility catch-all routes for Student, Company, School and External. The original `/profile`, `/muro`, `/talent`, `/empleos`, `/messages`, `/notifications`, `/settings` and `/administracion` surfaces remain active during migration.

Protected dashboard and compatibility routes validate account type server-side. Legacy feature routes remain progressively migrated; their data authorization still comes from existing RLS and server actions.

## Target public routes

| Route | Access | State |
|---|---|---|
| `/` | anonymous | target public landing |
| `/explore` | anonymous | implemented |
| `/explore/students` | anonymous | implemented with public projection |
| `/explore/students/[id]` | anonymous | implemented safe profile |
| `/freelance` | anonymous | implemented with public opportunities |
| `/freelance/[id]` | anonymous | implemented with student proposal form |
| `/how-it-works` | anonymous | target |
| `/login` | anonymous | existing |
| `/register` | anonymous | implemented for Student and Company; external client signup paused |
| `/privacy` | anonymous | target |
| `/terms` | anonymous | target |

## Target authenticated spaces

| Space | Routes | Server guard |
|---|---|---|
| Student | `/student/dashboard`, `/student/profile`, `/student/feed`, `/student/opportunities`, `/student/applications`, `/student/activities`, `/student/messages`, `/student/notifications`, `/student/settings` | `account_type = student`, active account, stage-aware policy |
| Company | `/company/dashboard`, `/company/profile`, `/company/talent`, `/company/jobs`, `/company/jobs/[id]`, `/company/applicants`, `/company/interviews`, `/company/messages`, `/company/notifications`, `/company/settings` | `account_type = company`, owner/member scope |
| School | `/school/dashboard`, `/school/students`, `/school/students/[id]`, `/school/import`, `/school/validations`, `/school/contact-requests`, `/school/internships`, `/school/companies`, `/school/metrics`, `/school/feed`, `/school/settings` | active `school_members` membership and member permission |
| External | `/external/dashboard`, `/external/profile`, `/external/jobs`, `/external/jobs/new`, `/external/jobs/[id]`, `/external/proposals`, `/external/messages`, `/external/settings` | `account_type = external`, verified email for publishing; implemented routes use shared shell |

## Route guard contract

Every protected route must validate session, account type, account status, ownership or membership, target resource status and age/privacy conditions where applicable. Hiding a navigation link is not authorization.

## Redirect contract

After one login, the server resolves the account type and redirects to `/student/dashboard`, `/company/dashboard`, `/school/dashboard` or `/external/dashboard`. Invalid or incomplete accounts go to a controlled recovery/error route, not to a role chosen by the client.
