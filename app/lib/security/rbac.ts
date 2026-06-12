/**
 * RBAC enforcement layer.
 *
 * Takes a session (which carries a role) and checks whether the session
 * holds a required permission. Permissions are resolved from the role's
 * permission set defined in `policy.ts`.
 *
 * This is the single place where permission checks happen. No ad-hoc
 * role or permission checks should exist elsewhere in the codebase.
 */

import type { SessionContext, TenantRole } from "../domain/auth/types.ts"
import type { Session } from "./session.ts"
import type { WorkUnitPermission, WorkUnitRole } from "./policy.ts"
import { DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY } from "./policy.ts"
import type { TenantId } from "../tenant/types.ts"

/**
 * Error returned when an RBAC check fails.
 * Carries enough context for audit logging.
 */
export type RbacDeniedError = {
  kind: "rbac_denied"
  reason: "missing_permission" | "insufficient_role" | "tenant_mismatch"
  requiredPermission?: WorkUnitPermission
  allowedRoles?: TenantRole[]
  actorRole: WorkUnitRole
  tenantId: TenantId
}

/**
 * Check whether the session's role grants the required permission.
 */
export function hasPermission(session: Session, permission: WorkUnitPermission): boolean {
  const permissions = DEFAULT_ROLE_PERMISSIONS[session.role]
  return permissions.has(permission)
}

/**
 * Assert that the session holds the required permission.
 * Returns undefined on success, or a typed error on failure.
 *
 * Usage:
 *   const error = assertPermission(session, "workunit.approve_external_action")
 *   if (error) return NextResponse.json({ error: "forbidden" }, { status: 403 })
 */
export function assertPermission(
  session: Session,
  permission: WorkUnitPermission,
): RbacDeniedError | undefined {
  if (hasPermission(session, permission)) return undefined
  return {
    kind: "rbac_denied",
    reason: "missing_permission",
    requiredPermission: permission,
    actorRole: session.role,
    tenantId: session.tenantId,
  }
}

export function hasRole(session: SessionContext, allowedRoles: TenantRole[]): boolean {
  return allowedRoles.includes(session.role)
}

export function requireRole(
  session: SessionContext,
  allowedRoles: TenantRole[],
): RbacDeniedError | undefined {
  if (hasRole(session, allowedRoles)) return undefined
  return {
    kind: "rbac_denied",
    reason: "insufficient_role",
    allowedRoles,
    actorRole: session.role,
    tenantId: session.tenantId,
  }
}

/**
 * Check that an actor's role is at least at the given minimum level.
 */
export function roleAtLeast(role: WorkUnitRole, minimum: WorkUnitRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum]
}

// --- Policy functions: central point for permission decisions ---

export function canReadWorkUnit(session: Session): boolean {
  return hasPermission(session, "workunit.read")
}

export function canCreateWorkUnit(session: Session): boolean {
  return hasPermission(session, "workunit.create")
}

export function canApproveExternalAction(session: Session): boolean {
  return hasPermission(session, "workunit.approve_external_action")
}

export function canExecuteExternalAction(session: Session): boolean {
  return hasPermission(session, "workunit.execute_external_action")
}

export function canManageIntegration(session: Session): boolean {
  return hasPermission(session, "integration.manage")
}

export function canReadAuditLog(session: Session): boolean {
  return hasPermission(session, "audit.read")
}
