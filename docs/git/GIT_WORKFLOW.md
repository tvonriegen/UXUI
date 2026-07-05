# Git Workflow

## Branches

- Do not work directly on `main`.
- Current working branch for this cleanup is `caro-maturana`.
- Feature branches should branch from the current integration branch unless the team decides otherwise.

## Before Changing Code

- Run `git status --short --branch`.
- Do not overwrite uncommitted work from another contributor.
- Use `git mv` for structural moves.

## Commit Rules

- Keep commits atomic and traceable.
- Each commit should have one purpose.
- Do not commit secrets, `.env.local`, private dumps or generated outputs.

## Pull Requests

- Use the repository PR template.
- Include validation results or explain why validation could not run.
- Document unresolved breakage in `docs/technical/KNOWN_ISSUES.md`.
