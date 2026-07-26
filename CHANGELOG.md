# Changelog

All notable repository-level changes are tracked here.

## 2026-07-05

- Reorganized the repository toward the TalentHub professional workspace structure.
- Moved the Next.js application to `apps/web`.
- Moved Supabase database assets to the repository root under `supabase`.
- Added root scripts, consolidated ignore rules and project governance files.

## 2026-07-26

- Integrated the TalentHub workspace, privacy routing and feature-boundary refactors into `main` with a direct merge.
- Added explainable compatibility factors and an assisted application readiness flow.
- Hardened interview status transitions and removed admin-client bypasses from interview responses and cancellations.
- Protected `/api/seed` outside local development when `SEED_SECRET` is not configured.
- Normalized workflow documentation so `main` is the only active branch.
