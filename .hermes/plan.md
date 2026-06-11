# SaaS Architecture Plan

## Analysis Summary
- 32 source files under app/lib, 19 UI components, 10 test files
- Security baseline exists (validation, kill switch, double guard)
- Domain: WorkUnit OS pipeline (Source → Hopper → WorkUnit → Execution)
- No auth, tenant, RBAC, audit, or database infrastructure yet

## Implementation Order

### Batch 1: Security Foundation Modules
1. `app/lib/security/policy.ts` — RBAC roles, permissions, policy functions
2. `app/lib/security/auditLog.ts` — Audit event types + no-op logger
3. `app/lib/security/actionApproval.ts` — Server-side approval model
4. `app/lib/security/session.ts` — Session boundary + auth hooks
5. `app/lib/security/rbac.ts` — Role/permission enforcement
6. `app/lib/security/safeErrors.ts` — Safe error response helpers

### Batch 2: Domain Boundaries
7. `app/lib/tenant/types.ts` — TenantId, UserId, Actor, TenantContext
8. `app/lib/integrations/types.ts` — Integration provider boundaries

### Batch 3: Domain Cleanup + Tests
9. WorkUnit domain improvements (type boundaries, lifecycle)
10. Tests for security + domain logic
11. SaaS docs (SECURITY_MODEL.md, SAAS_ARCHITECTURE.md, TRUST_BOUNDARIES.md)
