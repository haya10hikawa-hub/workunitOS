import type { SessionContext } from "../../domain/auth/types.ts"
import type { TenantId, UserId } from "../../tenant/types.ts"
import { normalizeRoleInput, RoleNormalizationError, type WorkUnitRole, type WorkUnitRoleInput } from "../../security/policy.ts"
import { resolveControlRepositories, type ControlRepositoryBundle } from "../../infrastructure/persistence/control/controlRepositoryResolver.ts"
import type { AppEnv } from "../../../types/cloudflare-env.ts"
import type { D1DatabaseLike } from "../../persistence/d1/types.ts"
import type { VerifiedAuthIdentity, AuthAdapter } from "./authAdapter.ts"
import { resolveAuthAdapter } from "./resolveAuthAdapter.ts"

export type SessionResolutionFailureReason = "unauthorized" | "forbidden" | "expired" | "invalid_tenant" | "invalid_role" | "internal_error"

export type SessionResolutionResult =
  | { ok: true; session: SessionContext }
  | { ok: false; reason: SessionResolutionFailureReason }

export async function resolveSession(
  request: Request,
  options: { adapter?: AuthAdapter; runtimeEnv?: AppEnv; controlDbBinding?: D1DatabaseLike } = {},
): Promise<SessionResolutionResult> {
  try {
    const auth = await (options.adapter ?? resolveAuthAdapter()).verify(request)
    if (!auth.ok) return { ok: false, reason: "unauthorized" }

    // ─── Control-less dev session ───────────────────────────
    // In dev sandbox with no D1/Control DB, return a session
    // directly without requiring DB repositories.
    if (shouldUseControlLessDevSession(auth.identity)) {
      return {
        ok: true,
        session: createControlLessDevSession(auth.identity),
      }
    }

    const repos = resolveControlRepositories({ runtimeEnv: options.runtimeEnv, d1Binding: options.controlDbBinding })
    if (!repos.ok) return { ok: false, reason: "unauthorized" }
    if (shouldBootstrapDevWorkspace(auth.identity)) await bootstrapDevWorkspace(repos.bundle, auth.identity)

    const identityRow = await repos.bundle.authIdentities.findByProviderSubject(
      repos.bundle.ctx,
      auth.identity.provider,
      auth.identity.providerSubject,
    )
    if (!identityRow) return { ok: false, reason: "unauthorized" }

    const user = await repos.bundle.users.findById(repos.bundle.ctx, identityRow.userId)
    if (!user) return { ok: false, reason: "unauthorized" }

    const membership = (await repos.bundle.memberships.listByUser(repos.bundle.ctx, user.id))
      .find((row) => row.status === "active")
    if (!membership) return { ok: false, reason: "forbidden" }

    const tenant = await repos.bundle.tenants.findById(repos.bundle.ctx, membership.tenantId)
    if (!tenant) return { ok: false, reason: "invalid_tenant" }
    if (tenant.status !== "active") return { ok: false, reason: "forbidden" }

    return {
      ok: true,
      session: {
        userId: user.id,
        tenantId: membership.tenantId,
        role: normalizeRoleInput(membership.role),
        email: auth.identity.email || user.email,
        isDevSession: auth.identity.provider === "dev",
        sessionId: `${auth.identity.provider}:${auth.identity.providerSubject}:${Date.now()}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    }
  } catch (err) {
    if (err instanceof RoleNormalizationError) return { ok: false, reason: "invalid_role" as SessionResolutionFailureReason }
    return { ok: false, reason: "internal_error" }
  }
}

// Dev-only default role.
//
// When DEV_SESSION_ROLE is unset, dev sessions resolve to an explicit "owner"
// role. This is a dev-only convenience gated behind NODE_ENV !== "production",
// ALLOW_DEV_SESSION === "true", and a "dev" auth provider (see the helpers
// below). It does NOT relax normalizeRoleInput, which remains fail-closed:
// production membership rows with a missing/invalid role still throw
// RoleNormalizationError and surface as invalid_role / 403.
const DEV_DEFAULT_ROLE: WorkUnitRoleInput = "owner"

function resolveDevSessionRole(): WorkUnitRole {
  const explicit = process.env.DEV_SESSION_ROLE as WorkUnitRoleInput | undefined
  return normalizeRoleInput(explicit ?? DEV_DEFAULT_ROLE)
}

function shouldBootstrapDevWorkspace(identity: VerifiedAuthIdentity): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.ALLOW_DEV_SESSION === "true"
    && process.env.ALLOW_DEV_WORKSPACE_BOOTSTRAP === "true"
    && identity.provider === "dev"
}

async function bootstrapDevWorkspace(repos: ControlRepositoryBundle, identity: VerifiedAuthIdentity): Promise<void> {
  const now = new Date().toISOString()
  const userId = identity.providerSubject as UserId
  const tenantId = "dev-tenant" as TenantId

  const user = await repos.users.findById(repos.ctx, userId)
  if (!user) {
    await repos.users.create(repos.ctx, {
      id: userId,
      email: identity.email,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
      createdAt: now,
      updatedAt: now,
    })
  }

  const tenant = await repos.tenants.findById(repos.ctx, tenantId)
  if (!tenant) {
    await repos.tenants.create(repos.ctx, {
      id: tenantId,
      name: "Development Tenant",
      slug: "dev-tenant",
      createdAt: now,
      updatedAt: now,
    })
  }

  const membership = await repos.memberships.findByUserAndTenant(repos.ctx, userId, tenantId)
  if (!membership) {
    await repos.memberships.create(repos.ctx, {
      id: "membership:dev-user:dev-tenant",
      tenantId,
      userId,
      role: resolveDevSessionRole(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
  }

  const existingIdentity = await repos.authIdentities.findByProviderSubject(repos.ctx, identity.provider, identity.providerSubject)
  if (!existingIdentity) {
    await repos.authIdentities.create(repos.ctx, {
      id: `identity:${identity.provider}:${identity.providerSubject}`,
      userId,
      provider: identity.provider,
      providerSubject: identity.providerSubject,
      email: identity.email,
      createdAt: now,
      updatedAt: now,
    })
  }
}

// ─── Control-less dev session helpers ───────────────────────

/**
 * Returns true ONLY when all of these hold:
 * - non-production environment
 * - dev auth identity
 * - ALLOW_DEV_SESSION explicitly enabled
 * - ALLOW_DEV_CONTROLLESS_SESSION explicitly enabled
 */
function shouldUseControlLessDevSession(identity: VerifiedAuthIdentity): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.ALLOW_DEV_SESSION === "true"
    && process.env.ALLOW_DEV_CONTROLLESS_SESSION === "true"
    && identity.provider === "dev"
}

/**
 * Builds a SessionContext directly — no Control DB lookup.
 * Only safe because the caller already verified the dev auth identity
 * and all four env guards in shouldUseControlLessDevSession.
 */
function createControlLessDevSession(identity: VerifiedAuthIdentity): SessionContext {
  const now = new Date()
  return {
    userId: "dev-user" as UserId,
    tenantId: "dev-tenant" as TenantId,
    role: resolveDevSessionRole(),
    email: identity.email,
    isDevSession: true,
    sessionId: `dev:${identity.providerSubject}:${Date.now()}`,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}
