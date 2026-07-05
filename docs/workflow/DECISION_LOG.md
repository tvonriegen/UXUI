# TalentHub Decision Log

## ADR-001 — Persistent workflow state tracked in versioned Markdown

- Status: Accepted
- Date: 2026-07-05
- Branch: `chore/workflow-state`
- PR: PR 0 — `chore: add persistent workflow state tracking`

### Context

The TalentHub repository lacks a durable, in-repo record of the current branch, active PR, validation status, and follow-up actions. This forces every contributor to reconstruct context from `git log`, `git status`, and chat history, and there is no single place to document known breakages or open questions between sessions.

### Decision

Track the persistent workflow state of the project in versioned Markdown files under `docs/workflow/`:

- `STATUS.md` — current branch, phase, PR/task, working state, known breakages, next action.
- `NEXT_ACTIONS.md` — immediate, after current PR, and blocked actions.
- `SESSION_LOG.md` — chronological log of sessions, commands inspected, validation results, commits, risks, and next session.
- `DECISION_LOG.md` — this file, recording architectural and process decisions.
- `OPEN_QUESTIONS.md` — unresolved questions and blockers.
- `PR_TRACKER.md` — ordered list of planned and in-progress PRs with validation status.

The discipline is enforced through `docs/git/GIT_WORKFLOW.md`, which requires every session to read `STATUS.md`, `NEXT_ACTIONS.md`, and `PR_TRACKER.md` at start, and to update `STATUS.md`, `NEXT_ACTIONS.md`, `SESSION_LOG.md`, `PR_TRACKER.md`, and `KNOWN_ISSUES.md` at close.

### Consequences

Positive:
- Context survives across sessions, restarts, and onboarding.
- A single diff in the PR shows what changed in the workflow state, not only in code.
- Compatible with the existing documentation conventions in `docs/` and with the AGENTS.md rule of small, reviewable changes.
- No new tooling, scripts, or runtime dependencies required.

Negative / Trade-offs:
- The files are only as accurate as the discipline applied; stale entries are a risk. Mitigated by mandating the read/update ritual in `GIT_WORKFLOW.md`.
- Some duplication with `docs/roadmap/ROADMAP.md` and `docs/technical/KNOWN_ISSUES.md`. Mitigated by pointing to those files from `STATUS.md` and `NEXT_ACTIONS.md` instead of copying their content.

### Alternatives Considered

- Issue tracker only (GitHub Issues / project board). Rejected: not durable inside the repo, requires network access, and is not part of the change set a PR reviews.
- A single `WORKFLOW.md` file. Rejected: mixes concerns (status, actions, log, decisions, questions) and becomes hard to scan and update.
- A generated report from a script. Rejected for PR 0 because it adds tooling overhead and a runtime dependency; can be revisited later if the manual discipline proves insufficient.
