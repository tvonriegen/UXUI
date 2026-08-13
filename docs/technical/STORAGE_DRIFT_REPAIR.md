# Storage drift repair

This is an independent Storage repair concern with its own staging gate. It does
not open or advance Gate D for Core migrations. Remote validation remains pending.

The TalentHub Staging project had Storage configuration drift: bucket metadata
and/or policies had been repaired manually without an equivalent forward
migration in this repository. The migration
`20260813000001_reconcile_storage_buckets.sql` versions that repair and makes
the Git contract repeatable.

It is forward-only and idempotent. It updates only bucket metadata and the
named `storage.objects` policies; it does not delete, move, or rewrite stored
objects. The buckets remain `public=true`, preserving public reads through their
known URL/CDN paths (a known URL can still be downloaded), but the migration removes public `SELECT` policies from
`storage.objects` so unauthenticated REST requests cannot enumerate objects.
INSERT/UPDATE/DELETE remain owner-scoped and require the first path segment to
equal `auth.uid()`; legacy banner policies are explicitly revoked.

Do not apply this migration to a remote project from this worktree as part of
local verification. Review the staging baseline and apply it through the
normal migration workflow when the staging operator is ready.
