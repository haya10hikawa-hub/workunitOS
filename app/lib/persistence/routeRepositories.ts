/**
 * Route Repository Helper
 *
 * Centralizes repository resolution for API route handlers.
 * All lifecycle routes should use this instead of calling
 * resolveRepositories() directly.
 *
 * This helper:
 *   - Extracts runtime env from the request context
 *   - Calls resolveRepositories() with the correct config
 *   - Maps persistence failures to safe API-level errors
 */

import type { TenantId } from "../tenant/types.ts"
import { resolveRepositories } from "./repositoryResolver.ts"
import { getRequestRuntimeEnv } from "../runtime/cloudflareRuntimeEnv.ts"
import type { TenantRepositoryBundle } from "./repositoryResolver.ts"
import type { SafeErrorCode } from "../security/safeErrors.ts"

// ─── Types ──────────────────────────────────────────────────────

export type RouteRepositoryResult =
  | { ok: true; bundle: TenantRepositoryBundle }
  | { ok: false; error: SafeErrorCode; status: number }

// ─── Resolution ─────────────────────────────────────────────────

/**
 * Resolve repositories for the current route context.
 *
 * Call from within a route handler after session resolution.
 * Returns either a repository bundle or a safe API error.
 */
export async function resolveRouteRepositories(
  tenantId: TenantId,
): Promise<RouteRepositoryResult> {
  const runtimeEnv = getRequestRuntimeEnv()

  const result = await resolveRepositories(tenantId, { runtimeEnv: runtimeEnv ?? undefined })

  if (!result.ok) {
    return {
      ok: false,
      error: "integration_missing",
      status: 503,
    }
  }

  return { ok: true, bundle: result.bundle }
}
