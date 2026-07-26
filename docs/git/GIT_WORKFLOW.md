# Git Workflow

## Branches

- `main` is the only active branch after the 2026-07-26 normalization.
- Do not create feature branches unless the owner explicitly changes this policy.
- Integrate changes directly into `main` with merge commits; do not use pull requests for this workflow.
- Preserve historical commits and branch names in Git ancestry for traceability.

## Session Start

- Read `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md` and `docs/workflow/PR_TRACKER.md`.
- Confirm the branch and worktree with `git status --short --branch`.
- Check remote state before integrating with `git fetch origin --prune`.

## Before Changing Code

- Confirm the worktree is clean or understand every existing change.
- Do not overwrite uncommitted work from another contributor.
- Use `git mv` for structural moves.
- Never commit `.env.local`, service keys, private dumps or generated outputs.

## Commit Rules

- Keep commits atomic and traceable.
- Follow `docs/git/COMMIT_CONVENTION.md`.
- Run the relevant verification scripts, lint, typecheck and build before merging.

## Direct Integration

- Review `git diff main..source` and `git log main..source` before merging.
- Use `git merge --no-ff source -m "merge: ..."` to preserve the integration point.
- Validate the merge result on `main` before pushing.
- Never force-push or rewrite `main` history.

## Session Close

- Update `STATUS.md`, `NEXT_ACTIONS.md`, `PR_TRACKER.md`, `SESSION_LOG.md` and `KNOWN_ISSUES.md`.
- Confirm `git status --short` is clean.
- Record any external validation that could not run.
