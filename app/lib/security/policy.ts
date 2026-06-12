/**
 * RBAC role and permission definitions for WorkUnit OS.
 *
 * Roles represent a user's organizational position within a tenant.
 * Permissions represent discrete actions that can be checked via policy functions.
 *
 * This module defines the *vocabulary* of roles and permissions.
 * Enforcement lives in `rbac.ts` and `policy.ts`.
 */

import type { LegacyTenantRole, TenantRole } from "../domain/auth/types.ts"

export type WorkUnitRole = TenantRole
export type WorkUnitRoleInput = TenantRole | LegacyTenantRole

export type WorkUnitPermission =
  | "workunit.read"
  | "workunit.create"
  | "workunit.edit"
  | "workunit.review"
  | "workunit.approve_external_action"
  | "workunit.execute_external_action"
  | "workunit.create_action_preview"
  | "integration.read"
  | "integration.manage"
  | "audit.read"
  | "tenant.manage"

export const ROLE_HIERARCHY: Record<WorkUnitRole, number> = {
  owner: 3,
  manager: 2,
  editor: 1,
  viewer: 0,
}

export const DEFAULT_ROLE_PERMISSIONS: Record<WorkUnitRole, ReadonlySet<WorkUnitPermission>> = {
  owner: new Set([
    "workunit.read",
    "workunit.create",
    "workunit.edit",
    "workunit.review",
    "workunit.approve_external_action",
    "workunit.execute_external_action",
    "workunit.create_action_preview",
    "integration.read",
    "integration.manage",
    "audit.read",
    "tenant.manage",
  ]),
  manager: new Set([
    "workunit.read",
    "workunit.create",
    "workunit.edit",
    "workunit.review",
    "workunit.approve_external_action",
    "workunit.create_action_preview",
    "integration.read",
    "integration.manage",
    "audit.read",
  ]),
  editor: new Set([
    "workunit.read",
    "workunit.create",
    "workunit.edit",
    "workunit.review",
    "workunit.create_action_preview",
    "workunit.approve_external_action",
    "integration.read",
  ]),
  viewer: new Set(["workunit.read", "integration.read"]),
}

export function normalizeRoleInput(role: WorkUnitRoleInput | undefined): WorkUnitRole {
  if (role === "admin") return "manager"
  if (role === "pm" || role === "member") return "editor"
  return role ?? "owner"
}
