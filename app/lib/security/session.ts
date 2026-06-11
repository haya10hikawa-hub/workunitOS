/**
 * Session boundary and authentication hook points.
 *
 * This module defines the shape of a session and provides placeholder
 * functions for session resolution and enforcement.
 *
 * When auth is added, this module is the single integration point:
 *   - requireSession → validates the auth token / cookie
 *   - The returned Session object carries identity + tenant context
 *
 * PRODUCTION BEHAVIOR:
 *   In production (NODE_ENV === "production"), requireSession() returns
 *   `unauthorized` unless real authentication infrastructure exists.
 *   This prevents silent anonymous access in deployed environments.
 *
 * DEVELOPMENT BEHAVIOR:
 *   In development, requireSession() returns a dev session ONLY when
 *   ALLOW_DEV_SESSION=true is set. This explicit opt-in prevents
 *   accidental anonymous access in non-local environments.
 */

import type { TenantId, UserId } from "../tenant/types.ts"
import type { WorkUnitRole } from "./policy.ts"

export type Session = {
  userId: UserId
  tenantId: TenantId
  role: WorkUnitRole
  sessionId: string
  createdAt: string
  expiresAt: string
}

export type SessionVerificationResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "unauthorized" | "expired" | "invalid_tenant" }

/**
 * Resolve and validate the current session.
 *
 * Production: returns unauthorized (no real auth infrastructure yet).
 * Development: returns a dev session only when ALLOW_DEV_SESSION=true.
 * Without the flag, returns unauthorized even in development.
 *
 * When real auth is added:
 *   1. Extract the session token from the request (cookie / Authorization header)
 *   2. Validate the token (JWT, opaque token lookup, etc.)
 *   3. Resolve the user's tenant and role
 *   4. Return a typed Session or an error
 *
 * TODO: CSRF / session hardening — validate origin, referrer, CSRF token for mutating requests
 */
export function requireSession(_request?: Request): SessionVerificationResult {
  void _request

  // Production: no anonymous access. Real auth must be implemented.
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "unauthorized" }
  }

  // Development: explicit opt-in required
  if (process.env.ALLOW_DEV_SESSION !== "true") {
    return { ok: false, reason: "unauthorized" }
  }

  // Dev session: explicitly marked as unsafe for production
  // Role is "owner" in dev to allow full feature testing.
  // Change to a lower role to test RBAC enforcement locally.
  return {
    ok: true,
    session: createDevSession(process.env.DEV_SESSION_ROLE as WorkUnitRole | undefined),
  }
}

/**
 * Create a development session.
 * The role can be overridden via DEV_SESSION_ROLE env var for RBAC testing.
 */
function createDevSession(role?: WorkUnitRole): Session {
  return {
    userId: "dev-user" as UserId,
    tenantId: "dev-tenant" as TenantId,
    role: role ?? "owner",
    sessionId: `dev-session:${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Create a development-only session with a specific role.
 * Used in tests to verify RBAC enforcement.
 */
export function createDevSessionWithRole(role: WorkUnitRole): Session {
  return createDevSession(role)
}

/**
 * Create a development-only session. Marked explicitly as unsafe for production.
 * Deprecated: use requireSession() instead which enforces the env flag.
 */
export function createAnonymousDevelopmentTenantContext(): Session {
  return createDevSession("viewer")
}
