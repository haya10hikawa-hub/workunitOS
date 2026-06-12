import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  type WorkUnitPermission,
  type WorkUnitRole,
} from "../app/lib/security/policy.ts"
import {
  hasPermission,
  assertPermission,
  hasRole,
  requireRole,
  roleAtLeast,
  canReadWorkUnit,
  canCreateWorkUnit,
  canApproveExternalAction,
  canExecuteExternalAction,
  canManageIntegration,
  canReadAuditLog,
} from "../app/lib/security/rbac.ts"
import {
  canApprovePreview,
  canCreateFeedback,
  canCreatePreview,
  canManageIntegrations,
  canViewAudit,
  canViewIntegrationStatus,
} from "../app/lib/security/tenantAccess.ts"
import type { Session } from "../app/lib/security/session.ts"
import type { TenantId, UserId } from "../app/lib/tenant/types.ts"

function session(role: WorkUnitRole): Session {
  return {
    userId: "test-user" as UserId,
    tenantId: "test-tenant" as TenantId,
    role,
    email: "test@example.local",
    isDevSession: false,
    sessionId: "test-session",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  }
}

const allPermissions: WorkUnitPermission[] = [
  "workunit.read", "workunit.create", "workunit.edit",
  "workunit.approve_external_action", "workunit.execute_external_action",
  "integration.read", "integration.manage",
  "audit.read", "tenant.manage",
]

test("role hierarchy is ordered correctly", () => {
  assert.ok(ROLE_HIERARCHY.owner > ROLE_HIERARCHY.manager)
  assert.ok(ROLE_HIERARCHY.manager > ROLE_HIERARCHY.editor)
  assert.ok(ROLE_HIERARCHY.editor > ROLE_HIERARCHY.viewer)
})

test("every role has a non-empty permission set", () => {
  const roles: WorkUnitRole[] = ["owner", "manager", "editor", "viewer"]
  for (const role of roles) {
    assert.ok(DEFAULT_ROLE_PERMISSIONS[role].size > 0, `${role} has no permissions`)
  }
})

test("viewer can only read", () => {
  const s = session("viewer")
  assert.equal(hasPermission(s, "workunit.read"), true)
  assert.equal(hasPermission(s, "workunit.create"), false)
  assert.equal(hasPermission(s, "workunit.approve_external_action"), false)
  assert.equal(hasPermission(s, "workunit.execute_external_action"), false)
  assert.equal(hasPermission(s, "integration.manage"), false)
  assert.equal(hasPermission(s, "audit.read"), false)
})

test("editor can approve external actions but not execute them", () => {
  const s = session("editor")
  assert.equal(hasPermission(s, "workunit.approve_external_action"), true)
  assert.equal(hasPermission(s, "workunit.execute_external_action"), false)
})

test("owner has all permissions", () => {
  const s = session("owner")
  for (const perm of allPermissions) {
    assert.equal(hasPermission(s, perm), true, `owner missing ${perm}`)
  }
})

test("assertPermission returns error when permission missing", () => {
  const err = assertPermission(session("viewer"), "workunit.approve_external_action")
  assert.ok(err)
  assert.equal(err.kind, "rbac_denied")
  assert.equal(err.reason, "missing_permission")
})

test("assertPermission returns undefined when permission held", () => {
  const err = assertPermission(session("editor"), "workunit.approve_external_action")
  assert.equal(err, undefined)
})

test("roleAtLeast checks hierarchical role ordering", () => {
  assert.equal(roleAtLeast("manager", "editor"), true)
  assert.equal(roleAtLeast("editor", "manager"), false)
  assert.equal(roleAtLeast("owner", "owner"), true)
  assert.equal(roleAtLeast("viewer", "editor"), false)
})

test("policy functions return correct access decisions", () => {
  const editor = session("editor")
  const viewer = session("viewer")

  assert.equal(canReadWorkUnit(viewer), true)
  assert.equal(canCreateWorkUnit(viewer), false)
  assert.equal(canApproveExternalAction(editor), true)
  assert.equal(canExecuteExternalAction(editor), false)
  assert.equal(canManageIntegration(editor), false)
  assert.equal(canReadAuditLog(editor), false)
})

test("role helpers enforce allowed role sets", () => {
  const manager = session("manager")
  assert.equal(hasRole(manager, ["owner", "manager"]), true)
  const denied = requireRole(session("viewer"), ["owner", "manager"])
  assert.equal(denied?.kind, "rbac_denied")
  assert.equal(denied?.reason, "insufficient_role")
})

test("tenant access helpers match the production role model", () => {
  const owner = session("owner")
  const manager = session("manager")
  const editor = session("editor")
  const viewer = session("viewer")

  assert.equal(canCreateFeedback(owner), true)
  assert.equal(canCreateFeedback(manager), true)
  assert.equal(canCreateFeedback(editor), true)
  assert.equal(canCreateFeedback(viewer), false)

  assert.equal(canCreatePreview(manager), true)
  assert.equal(canApprovePreview(editor), true)
  assert.equal(canManageIntegrations(manager), true)
  assert.equal(canManageIntegrations(editor), false)
  assert.equal(canViewIntegrationStatus(viewer), true)
  assert.equal(canViewAudit(manager), true)
  assert.equal(canViewAudit(viewer), false)
})
