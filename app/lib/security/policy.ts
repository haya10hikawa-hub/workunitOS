/**
 * RBAC role and permission definitions for WorkUnit OS.
 *
 * Roles represent a user's organizational position within a tenant.
 * Permissions represent discrete actions that can be checked via policy functions.
 *
 * This module defines the *vocabulary* of roles and permissions.
 * Enforcement lives in `rbac.ts` and `policy.ts`.
 */

export type WorkUnitRole = "owner" | "admin" | "pm" | "member" | "viewer"

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
  owner: 4,
  admin: 3,
  pm: 2,
  member: 1,
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
  admin: new Set([
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
  ]),
  pm: new Set([
    "workunit.read",
    "workunit.create",
    "workunit.edit",
    "workunit.review",
    "workunit.create_action_preview",
    "workunit.approve_external_action",
    "integration.read",
  ]),
  member: new Set(["workunit.read", "workunit.create", "workunit.edit"]),
  viewer: new Set(["workunit.read"]),
}
