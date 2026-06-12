import type { LegacyTenantRole, SessionContext, TenantRole } from "../domain/auth/types.ts"
import type { TenantId, UserId } from "../tenant/types.ts"
import { normalizeRoleInput } from "./policy.ts"
import {
  resolveSession,
  type SessionResolutionFailureReason,
  type SessionResolutionResult,
} from "../application/auth/sessionResolver.ts"

export type Session = SessionContext

export type SessionVerificationResult = SessionResolutionResult

export async function requireSession(request: Request = new Request("http://localhost")): Promise<SessionVerificationResult> {
  return resolveSession(request)
}

export function getSessionErrorStatus(reason: SessionResolutionFailureReason): number {
  if (reason === "forbidden" || reason === "invalid_tenant") return 403
  if (reason === "internal_error") return 500
  return 401
}

function createDevSession(role?: TenantRole | LegacyTenantRole): Session {
  return {
    userId: "dev-user" as UserId,
    tenantId: "dev-tenant" as TenantId,
    role: normalizeRoleInput(role),
    email: "dev@example.local",
    isDevSession: true,
    sessionId: `dev-session:${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function createDevSessionWithRole(role: TenantRole | LegacyTenantRole): Session {
  return createDevSession(role)
}

export function createAnonymousDevelopmentTenantContext(): Session {
  return createDevSession("viewer")
}
