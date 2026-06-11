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
  roleAtLeast,
  canReadWorkUnit,
  canCreateWorkUnit,
  canApproveExternalAction,
  canExecuteExternalAction,
  canManageIntegration,
  canReadAuditLog,
} from "../app/lib/security/rbac.ts"
import type { Session } from "../app/lib/security/session.ts"
import type { TenantId, UserId } from "../app/lib/tenant/types.ts"

function session(role: WorkUnitRole): Session {
  return {
    userId: "test-user" as UserId,
    tenantId: "test-tenant" as TenantId,
    role,
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
  assert.ok(ROLE_HIERARCHY.owner > ROLE_HIERARCHY.admin)
  assert.ok(ROLE_HIERARCHY.admin > ROLE_HIERARCHY.pm)
  assert.ok(ROLE_HIERARCHY.pm > ROLE_HIERARCHY.member)
  assert.ok(ROLE_HIERARCHY.member > ROLE_HIERARCHY.viewer)
})

test("every role has a non-empty permission set", () => {
  const roles: WorkUnitRole[] = ["owner", "admin", "pm", "member", "viewer"]
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

test("pm can approve external actions but not execute them", () => {
  const s = session("pm")
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
  const err = assertPermission(session("pm"), "workunit.approve_external_action")
  assert.equal(err, undefined)
})

test("roleAtLeast checks hierarchical role ordering", () => {
  assert.equal(roleAtLeast("admin", "pm"), true)
  assert.equal(roleAtLeast("pm", "admin"), false)
  assert.equal(roleAtLeast("owner", "owner"), true)
  assert.equal(roleAtLeast("viewer", "pm"), false)
})

test("policy functions return correct access decisions", () => {
  const pm = session("pm")
  const viewer = session("viewer")

  assert.equal(canReadWorkUnit(viewer), true)
  assert.equal(canCreateWorkUnit(viewer), false)
  assert.equal(canApproveExternalAction(pm), true)
  assert.equal(canExecuteExternalAction(pm), false)
  assert.equal(canManageIntegration(pm), false)
  assert.equal(canReadAuditLog(pm), false)
})
