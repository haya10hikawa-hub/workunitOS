/**
 * Compatibility layer.
 * Canonical tenant identity types now live in app/lib/domain/tenant/types.ts
 */

export type { Tenant, TenantId, UserId, WorkUnitId } from "../domain/tenant/types.ts"
import type { TenantId, UserId } from "../domain/tenant/types.ts"
import type { TenantRole } from "../domain/auth/types.ts"

/**
 * Context carrying the authenticated tenant and actor identity.
 * All server-side operations must receive a TenantContext — never
 * trust client-provided tenant identifiers.
 */
export type Actor = {
  userId: UserId
  tenantId: TenantId
  role: TenantRole | string
}

export type TenantContext = {
  tenantId: TenantId
  actor: Actor
}

// --- Assertions ---

export type TenantBoundaryResult =
  | { ok: true }
  | { ok: false; reason: "tenant_mismatch" | "missing_context" }

/**
 * Assert that a resource belongs to the given tenant.
 * Returns ok if the tenant matches, or a typed error.
 */
export function assertTenantBoundary(
  context: TenantContext,
  resourceTenantId: TenantId,
): TenantBoundaryResult {
  if (context.tenantId !== resourceTenantId) {
    return { ok: false, reason: "tenant_mismatch" }
  }
  return { ok: true }
}

/**
 * Assert that a tenant context is present.
 * In development, returns an anonymous context. In production, this must
 * come from the authenticated session.
 */
export function requireTenantContext(context: TenantContext | undefined | null): TenantContext | null {
  if (!context || !context.tenantId || !context.actor) {
    return null
  }
  return context
}

/**
 * Create a development-only tenant context.
 * CLEARLY MARKED as unsafe for production — must not be used in deployed environments.
 */
export function createAnonymousDevelopmentTenantContext(): TenantContext {
  return {
    tenantId: "dev-tenant" as TenantId,
    actor: {
      userId: "dev-user" as UserId,
      tenantId: "dev-tenant" as TenantId,
      role: "viewer",
    },
  }
}
