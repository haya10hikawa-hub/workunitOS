# Phase 5A: SaaS P0 Route/Auth Hardening

**Status:** Alpha Hardening Only
**Commercial SaaS Production:** No-Go
**External Execution:** No-Go
**Live Provider Integration:** No-Go

## Summary

Phase 5A hardens `/api/workunit/tools` before any real external execution.

Changes:
- `normalizeRoleInput` now fails closed (throws on undefined/null/empty/unknown)
- CSRF Origin protection for state-changing POST requests
- In-memory rate limit gate with tenant+user+IP key
- `invalid_role` added to session failure reasons with 403 response

## What This PR Does Not Add

- OAuth/token vault
- Billing
- Real Slack/Gmail/GitHub/Calendar writes
- External execution
- Approval markUsed atomic CAS
- approvalId + actionPreviewId execution binding
- HMAC hash migration
- ActionPreview D1 mapRow fix
- OIDC/cookie session migration
- D1 schema migration
- Production durable rate limiter

## Future Phases

| Item | Phase |
|------|-------|
| approval markUsed atomic CAS | 5B |
| approvalId + actionPreviewId explicit binding | 5C |
| ActionPreview D1 mapRow fix | 5D |
| HMAC hash migration | 5E |

## Safety

- Client-provided tenantId/userId/role is not trusted
- Missing/undefined role does not become owner
- Role normalization fails closed
- CSRF/origin protection is required for state-changing requests
- Rate limit is required before expensive tool/LLM work
- Safe errors do not leak tokens/secrets/stacks
- External execution remains OFF
- Live provider integration remains No-Go
