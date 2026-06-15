# Development Security Checklist

Run through this checklist before every PR that touches the API, backend, or security layer.

## Pre-Commit

- [ ] No hardcoded secrets, API keys, or tokens in source code
- [ ] `approvedByPm` is not trusted for authorization
- [ ] `externalConfig` is not trusted from client
- [ ] `EXTERNAL_ACTIONS_ENABLED` is not set to `"true"` in committed config
- [ ] All `ALLOW_*` flags must be `false` in production code paths
- [ ] `ALLOW_MOCK_LLM` must be `false` in production
- [ ] `ALLOW_IN_MEMORY_PERSISTENCE` must be `false` in production
- [ ] `ALLOW_IN_MEMORY_APPROVAL_STORE` must be `false` in production
- [ ] No `console.log` of sensitive data (tokens, secrets, raw source content)
- [ ] Import paths use `app/lib/security/*` for policy/RBAC decisions
- [ ] Error responses use `safeError()` or return generic messages only

## Before Merge

- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build` passes (TypeScript + Next.js)
- [ ] `npm test` passes all tests
- [ ] New security modules have corresponding tests
- [ ] External action kill switch is NOT bypassed in any new code path
- [ ] Validation module handles all new request shapes
- [ ] No raw source content reaches Core without sanitization

## Before Production SaaS

- [ ] Authentication implemented (not dev placeholder)
- [ ] Tenant isolation enforced at runtime (not just branded types)
- [ ] RBAC wired to every API endpoint
- [ ] Server-side approval store exists (database)
31|- [ ] Environment flags documented in ENVIRONMENT_CONFIG.md
32|- [ ] Production: ALLOW_DEV_SESSION=false, ALLOW_MOCK_LLM=false, ALLOW_IN_MEMORY_PERSISTENCE=false, ALLOW_IN_MEMORY_APPROVAL_STORE=false
33|- [ ] External actions enabled only after D1 + auth + RBAC
- [ ] Rate limiting on all API endpoints
- [ ] CSRF protection on mutating endpoints
- [ ] Audit logs persisted to database or SIEM
- [ ] External action review UI
- [ ] Prompt injection red-team tested
- [ ] Dependency audit (`npm audit`)
- [ ] Secrets removed from environment and committed files

## Security Regression Tests

These tests must always pass:

- `npm test -- --test-name-pattern="external"`  — all external action tests
- `npm test -- --test-name-pattern="approval"`   — all approval tests
- `npm test -- --test-name-pattern="rbac"`        — all RBAC tests
- `npm test -- --test-name-pattern="validation"`  — all validation tests
- `npm test -- --test-name-pattern="Phase 6"`     — Phase 6 safety tests
