# Security

## Ownership
- Session gate, RBAC, tenant access, approval verification, safe errors, audit vocabulary, and external-action guardrails.

## Allowed imports
- Domain auth/tenant types.
- Persistence adapters only where a security store needs server-side persistence.

## Forbidden imports
- React components.
- Client dashboard helpers.
- Raw external provider clients.
- UI state models.

## Canonical files
- `session.ts`
- `rbac.ts`
- `tenantAccess.ts`
- `approvalStore.ts`
- `approvalStoreResolver.ts`
- `safeErrors.ts`
- `externalActions.ts`

## Legacy warnings
- Do not move trust decisions into UI or application client helpers.
- Production anonymous access remains deny-by-default.

## Common mistakes
- Trusting client `tenantId`, `actorUserId`, `role`, hashes, approval status, or `usedAt`.
- Treating AI output as authorization.
