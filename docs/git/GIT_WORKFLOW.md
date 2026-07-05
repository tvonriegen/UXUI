# Git Workflow

## Branches

- Do not work directly on `main`.
- The current integration branch for this cleanup is `caro-maturana`. Open PRs against the integration branch unless the team decides otherwise. Confirm the current integration branch in `docs/workflow/STATUS.md` and `docs/workflow/OPEN_QUESTIONS.md` before opening a PR.
- Use one branch per PR, branched from the current integration branch (for example `chore/workflow-state`, `fix/privacy-contact-routing`). Do not mix unrelated changes in the same branch.
- Each PR is tracked in `docs/workflow/PR_TRACKER.md`.

## Session Start

- Read `docs/workflow/STATUS.md`, `docs/workflow/NEXT_ACTIONS.md`, and `docs/workflow/PR_TRACKER.md` before making any change.
- Confirm the current branch with `git status --short --branch` and `git branch --show-current`.
- Confirm the planned task matches the active PR in `docs/workflow/PR_TRACKER.md`. If it does not, update the tracker or pick a new task.

## Before Changing Code

- Run `git status --short --branch`.
- Do not overwrite uncommitted work from another contributor.
- Use `git mv` for structural moves.

## Commit Rules

- Keep commits atomic and traceable.
- Each commit should have one purpose.
- Do not commit secrets, `.env.local`, private dumps or generated outputs.
- Follow `docs/git/COMMIT_CONVENTION.md`.

## Pull Requests

- Use the repository PR template.
- Include validation results or explain why validation could not run.
- Document unresolved breakage in `docs/technical/KNOWN_ISSUES.md`.
- Move the PR row in `docs/workflow/PR_TRACKER.md` from "Planned" to "In progress" when the branch is created, and update its validation status when QA runs lint / typecheck / build.

## Session Close

Before ending any session, update the workflow state so the next contributor has fresh context:

- `docs/workflow/STATUS.md` — refresh current branch, phase, PR / task, working state, known breakages, and next recommended action.
- `docs/workflow/NEXT_ACTIONS.md` — record any newly discovered immediate actions, defer work for the next PR, and note any newly blocked items.
- `docs/workflow/SESSION_LOG.md` — add an entry for the session with goal, commands inspected, validation result, commits, risks, and next session.
- `docs/workflow/PR_TRACKER.md` — update the status and validation columns of the active PR.
- `docs/technical/KNOWN_ISSUES.md` — record any new unresolved breakage observed during the session.
