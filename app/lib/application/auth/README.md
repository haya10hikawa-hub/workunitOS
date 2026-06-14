# Application Auth

## Ownership
- Provider-agnostic auth adapter boundary.
- Resolves verified identity into user, tenant, active membership, and SessionContext.

## Allowed imports
- Domain auth and tenant types.
- Control DB repository interfaces/helpers needed by session resolution.
- Safe environment/config reads.

## Forbidden imports
- React components.
- API route handlers.
- UI code.
- Tenant D1 repositories.
- Provider token storage.

## Canonical files
- `authAdapter.ts`
- `devAuthAdapter.ts`
- `jwtAuthAdapter.ts`
- `noopProductionAuthAdapter.ts`
- `resolveAuthAdapter.ts`
- `sessionResolver.ts`

## Legacy warnings
- Dev auth is explicit only.
- Production must never default to dev.

## Common mistakes
- Trusting JWT `tenantId` or `role` claims.
- Auto-creating production users, tenants, or memberships without an explicit design.
