# WorkUnit OS

AI work orchestration OS for converting scattered work signals into previewed, approved, and safely verified WorkUnits.

## Overview

WorkUnit OS ingests work signals from multiple sources (Slack, GitHub, Calendar), normalizes them into WorkUnits, and provides a safe preparation loop: preview → approve → dry-run verify. Real external execution is intentionally disabled in the current release.

## Current Internal Alpha Capabilities

- **WorkUnit Inbox** — multi-source signal ingestion (mock GitHub, Slack, Calendar)
- **Action Preview** — server-generated preview with SHA-256 hashes (hashes never returned to browser)
- **Approve / Reject** — server-side approval records with tenant isolation
- **Approval Status** — `GET /api/workunit/:id/approval/status` returns safe summary (none/pending/approved/rejected/expired/used)
- **Decision Trace** — API-backed dashboard trace using `approvalDecisionTraceModel.ts`
- **Execution Readiness** — pure model gating on server-derived approval status + `externalExecutionEnabled` flag
- **Execution Command Envelope** — safe blocked-envelope display (mode, reason, previewRefCount, requestedActionType)
- **Execution Dry-run Route** — `POST /api/workunit/:id/execution/dry-run` verifies persisted approval, hashes, tenant, and kill switch without side effects
- **Dashboard Verify Execution** — calls dry-run only, never real execution
- **Dry-run Result Viewer** — `executionResultViewerModel.ts` displays verified/blocked/not_ready/failed
- **Clear / Re-run Controls** — local-only state management, no API calls for Clear
- **Internal Alpha Flow Regression** — 34 regression tests locking the complete alpha loop

## Execution Safety Boundary

- Real external execution is **intentionally disabled**.
- The system supports preview, approval, readiness, command envelope display, and dry-run verification only.
- Dry-run **does not call external providers** (no Slack, Gmail, GitHub, Calendar).
- Dry-run **does not mark approvals as used**.
- Execute CTA **remains disabled** in the dashboard.
- Dashboard **must not call** `/api/workunit/tools`.
- Approval hashes (`targetHash`, `payloadHash`) are **never returned to the browser**.
- `tenantId`, `actorUserId`, `role` are **server-derived** — never trusted from client.

## What Is Not Implemented Yet

- OAuth integration
- Token storage / vault
- Real Slack posting
- Real Gmail sending
- Real GitHub issue creation
- Real Calendar event creation
- Billing
- Production tenant administration UI
- Real external execution
- Mock/internal execution route

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Lint
npm run lint

# Type-check and build
npm run build

# Run tests (Node.js built-in test runner)
npm test

# Cloudflare Workers build
npm run cf:build

# Cloudflare Workers dev
npm run cf:dev
```

Environment variables:

```bash
# Required for dev sessions
ALLOW_DEV_SESSION=true
ALLOW_DEV_WORKSPACE_BOOTSTRAP=true

# External execution (keep disabled)
EXTERNAL_ACTIONS_ENABLED=false

# Source providers (use fake for local dev)
GITHUB_SOURCE_MODE=fake
```

## Testing

Tests use Node.js built-in test runner with `--experimental-strip-types` for TypeScript directly.

```bash
# Run all tests
npm test

# Run a specific test file
node --test --experimental-strip-types tests/executionDryRunRoute.test.mts
```

Tests include: pure model tests, route behavior tests, source-scan regression tests, and internal alpha flow coverage.

## Cloudflare Build

```bash
npm run cf:build
```

After `cf:build`, clean generated artifacts before committing:

```bash
git restore .open-next
git clean -fd .open-next
```

`.open-next/` and `.npm-cache/` are in `.gitignore` and must never be committed.

## Repository Hygiene

- `.open-next/**` and `.npm-cache/**` are gitignored
- `*.swp` and `*.swo` editor temp files are gitignored
- Generated build artifacts must be restored/cleaned before each commit
- All imports use `.ts` extensions (required by `--experimental-strip-types`)

## Roadmap

- Mock/internal execution model foundation (non-external)
- Docs tree reorganization
- Production auth hardening
- Limited, approved, auditable external execution design
