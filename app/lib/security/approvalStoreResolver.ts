/**
 * ApprovalStore Resolver
 *
 * Resolves the ApprovalStore based on environment configuration.
 * Centralizes the decision so route/backend code doesn't embed env checks.
 *
 * MODES:
 *   default_deny — always returns defaultDenyApprovalStore (safe default)
 *   in_memory   — dev/test only; requires ALLOW_IN_MEMORY_APPROVAL_STORE=true
 *   d1           — future D1-backed store (not yet implemented)
 *
 * PRODUCTION: in_memory is NEVER allowed. Falls back to default_deny.
 * DEVELOPMENT: in_memory only when explicitly opted in.
 */

import { defaultDenyApprovalStore, type ApprovalStore } from "./approvalStore.ts"
import { createInMemoryApprovalRecordRepository } from "../persistence/inMemoryRepositories.ts"
import { createRepositoryBackedApprovalStore } from "../persistence/approvalStoreAdapter.ts"
import type { ApprovalRecordRepository } from "../persistence/repositories.ts"
import type { TenantDbContext } from "../persistence/types.ts"
import type { TenantId } from "../tenant/types.ts"

// ─── Mode ────────────────────────────────────────────────────────

export type ApprovalStoreMode = "default_deny" | "in_memory" | "d1"

export type ApprovalStoreConfig = {
  mode: ApprovalStoreMode
  isProduction: boolean
}

/**
 * Resolve the ApprovalStore configuration from environment.
 */
export function resolveApprovalStoreConfig(
  env: {
    NODE_ENV?: string
    ALLOW_IN_MEMORY_APPROVAL_STORE?: string
  } = process.env as Record<string, string | undefined>,
): ApprovalStoreConfig {
  const isProduction = env.NODE_ENV === "production"
  const allowInMemory = env.ALLOW_IN_MEMORY_APPROVAL_STORE === "true"

  // Production: in-memory NEVER allowed
  if (isProduction) {
    return {
      mode: "default_deny",  // TODO: "d1" when D1 is implemented
      isProduction: true,
    }
  }

  // Development: in-memory only when explicitly enabled
  if (allowInMemory) {
    return { mode: "in_memory", isProduction: false }
  }

  return { mode: "default_deny", isProduction: false }
}

/**
 * Resolve an ApprovalStore instance.
 *
 * @param tenantId — tenant context for repository-backed stores
 * @param env — environment overrides (defaults to process.env)
 */
export function resolveApprovalStore(
  tenantId: TenantId,
  env?: Parameters<typeof resolveApprovalStoreConfig>[0],
): ApprovalStore {
  const config = resolveApprovalStoreConfig(env)

  switch (config.mode) {
    case "in_memory":
      return createInMemoryApprovalStore(tenantId)
    case "d1":
      // TODO: D1-backed store not yet implemented
      return defaultDenyApprovalStore
    case "default_deny":
    default:
      return defaultDenyApprovalStore
  }
}

// ─── Dev In-Memory Store ────────────────────────────────────────

let devInMemoryRepo: ReturnType<typeof createInMemoryApprovalRecordRepository> | null = null

function getDevInMemoryRepo(): ReturnType<typeof createInMemoryApprovalRecordRepository> {
  if (!devInMemoryRepo) {
    devInMemoryRepo = createInMemoryApprovalRecordRepository()
  }
  return devInMemoryRepo
}

function createInMemoryApprovalStore(tenantId: TenantId): ApprovalStore {
  const repo = getDevInMemoryRepo()
  const ctx: TenantDbContext = { tenantId, db: null }
  return createRepositoryBackedApprovalStore(repo, ctx)
}

// ─── Test Helpers ────────────────────────────────────────────────

/**
 * Get the shared dev in-memory repository for direct test access.
 * Returns null if not initialized or if in-memory is not the active mode.
 */
export function getDevInMemoryApprovalRepository(): ApprovalRecordRepository | null {
  return devInMemoryRepo
}

/**
 * Reset the shared dev in-memory repository.
 * Used between tests to clear state.
 */
export function resetDevInMemoryApprovalRepositoryForTests(): void {
  devInMemoryRepo = null
}
