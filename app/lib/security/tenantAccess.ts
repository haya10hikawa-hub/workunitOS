import type { SessionContext, TenantRole } from "../domain/auth/types.ts"
import type { TenantId } from "../tenant/types.ts"
import { hasPermission, hasRole } from "./rbac.ts"

export type TenantAccessResult =
  | { ok: true }
  | { ok: false; reason: "tenant_mismatch" }

export function assertTenantAccess(session: SessionContext, tenantId: TenantId): TenantAccessResult {
  if (session.tenantId !== tenantId) return { ok: false, reason: "tenant_mismatch" }
  return { ok: true }
}

export function canViewInbox(session: SessionContext): boolean {
  return hasPermission(session, "workunit.read")
}

export function canCreateFeedback(session: SessionContext): boolean {
  return hasPermission(session, "workunit.edit")
}

export function canCreatePreview(session: SessionContext): boolean {
  return hasPermission(session, "workunit.create_action_preview")
}

export function canApprovePreview(session: SessionContext): boolean {
  return hasPermission(session, "workunit.approve_external_action")
}

export function canViewIntegrationStatus(session: SessionContext): boolean {
  return hasPermission(session, "integration.read")
}

export function canViewAudit(session: SessionContext): boolean {
  return hasPermission(session, "audit.read") || hasRole(session, ["owner", "manager"] satisfies TenantRole[])
}

export function canManageIntegrations(session: SessionContext): boolean {
  return hasPermission(session, "integration.manage")
}
