# QA Checklist

## Repository

- [ ] `git status --short` is clean before handoff.
- [ ] No secrets or generated outputs are staged.
- [ ] Documentation is updated for structural or behavior changes.

## Web App

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Desktop smoke test for main role dashboards.
- [ ] Mobile smoke test for navigation and main flows.

## Product Flows

- [ ] Student profile loads.
- [ ] Talent search loads.
- [ ] Jobs page loads.
- [ ] Application or contact restrictions match role expectations.
- [ ] Health endpoint returns expected response.
