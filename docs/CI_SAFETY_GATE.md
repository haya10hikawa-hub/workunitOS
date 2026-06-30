# CI Safety Gate

GitHub Actions workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (`CI Safety Gate`).

## When it runs

- On every **pull request targeting `main`**.
- On every **push to `main`**.

## What it runs

It mirrors the manual validation sequence used for the recent security PRs (P1/P2):

```
npm ci
npm test
npm run alpha:safety-gate
npm run lint
npm run build
npm run cf:build
npm run electron:build:check
git diff --check
```

## Guarantees

- CI **does not deploy** (`cf:build` only builds; `cf:deploy` / `wrangler deploy` are never invoked).
- CI **uses no secrets** — no provider tokens, DB credentials, or environment secrets are required (tests use FakeD1 / in-memory repositories; the gates are offline).
- CI **does not enable external execution** — the alpha safety gate keeps external execution, Electron, and commercial SaaS production at No-Go.
- CI **does not enable real LLM calls**.
- Repository permissions are least-privilege: `contents: read`.

## Why

Until this workflow existed, CI checks were not registered and PRs relied on
local validation + SubAgent audits as a substitute. This gate makes GitHub
merge-readiness meaningful: a PR to `main` must pass the same checks before it
can be relied upon for merge.
