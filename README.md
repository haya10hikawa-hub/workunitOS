# WorkUnit OS

WorkUnit OS is an MVP for turning monitored work signals into reviewable WorkUnits before any external action is approved.

## Current MVP Status

This repository currently focuses on the local WorkUnit review flow, normalized source foundations, and approval-safety primitives. It is not production-ready and does not execute real external actions by default.

## Implemented Areas

- WorkUnit Inbox and normalized source-to-WorkUnit transform pipeline
- Fake source foundations for GitHub, Slack, and Calendar
- GitHub real client skeleton for local/dev experiments
- Adopted desktop UI path: `WorkUnitOSDashboard`
- Action Field drawer with local draft editing plus Preview / Approval API calls
- Action Preview / Approval API safety foundation with server-generated hashes
- Cloudflare / D1 preparation for action previews and approval records
- Safe error code catalog and Action Field error-state mapping

## Current Limitations

- No OAuth flow
- No production token vault or real token storage
- Slack and Calendar real clients are not connected
- External execution is disabled unless explicitly enabled, and the current MVP path does not dispatch real external actions
- The adopted dashboard drawer can create previews and approve/reject them, but it does not execute external actions
- D1 approval schema exists, but approval API persistence and execution-time approval-store resolution are not fully unified

## Local Commands

```bash
npm run lint
npm run build
npm test
npm run cf:build
```

## Environment Notes

Safe defaults are expected for local work:

```bash
EXTERNAL_ACTIONS_ENABLED=false
GITHUB_SOURCE_MODE=fake
GITHUB_ACCESS_TOKEN=
```

Use `GITHUB_ACCESS_TOKEN` only for local/dev real-mode experiments. Do not add OAuth, token storage, or real external execution in MVP stabilization work.
