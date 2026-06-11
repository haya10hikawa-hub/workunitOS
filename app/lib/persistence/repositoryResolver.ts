/**
 * Repository Bundle Resolver
 *
 * Given a tenant ID and environment config, returns a safe set of
 * repositories for the current persistence mode.
 *
 * SAFETY:
 *   - In-memory repositories are NEVER returned in production.
 *   - D1 repositories require valid Cloudflare bindings OR an
 *     explicit TenantDbResolver + D1DatabaseLike.
 *   - Disabled mode returns null (no persistence).
 *
 * PRODUCTION D1 PATH:
 *   1. wrangler.toml [[d1_databases]] bindings → env.CONTROL_DB, env.TENANT_DB_DEFAULT
 *   2. This function extracts them via getCloudflareD1Bindings()
 *   3. CONTROL_DB → D1TenantDbResolver, TENANT_DB_DEFAULT → tenant DB for repos
 *   4. Returns a bundle of D1ActionPreviewRepository + D1ApprovalRecordRepository
 */

import type { TenantId } from "../tenant/types.ts"
import type { TenantDbContext } from "./types.ts"
import type { ActionPreviewRepository, ApprovalRecordRepository, TenantDbResolver } from "./repositories.ts"
import type { D1DatabaseLike } from "./d1/types.ts"
import type { AppEnv } from "../../types/cloudflare-env.ts"
import { D1ActionPreviewRepository } from "./d1/actionPreviewRepository.ts"
import { D1ApprovalRecordRepository } from "./d1/approvalRecordRepository.ts"
import { createInMemoryApprovalRecordRepository } from "./inMemoryRepositories.ts"
import { getCloudflareD1Bindings } from "./cloudflareBindings.ts"
import { resolvePersistenceConfig } from "./persistenceConfig.ts"

// ─── Bundle ──────────────────────────────────────────────────────

export type TenantRepositoryBundle = {
  actionPreviews: ActionPreviewRepository
  approvalRecords: ApprovalRecordRepository
  ctx: TenantDbContext
}

export type RepositoryResolutionResult =
  | { ok: true; bundle: TenantRepositoryBundle }
  | { ok: false; error: "persistence_disabled" | "tenant_resolution_failed" | "d1_not_configured" }

// ─── Resolver ────────────────────────────────────────────────────

/**
 * Resolve repositories for a given tenant.
 *
 * @param tenantId — The tenant to resolve repositories for
 * @param options.resolver — Explicit D1-backed resolver (overrides runtime bindings)
 * @param options.d1Binding — Explicit D1 database (overrides runtime bindings)
 * @param options.env — Environment config overrides (NODE_ENV, PERSISTENCE_MODE, etc.)
 * @param options.runtimeEnv — Cloudflare runtime environment with D1 bindings
 */
export async function resolveRepositories(
  tenantId: TenantId,
  options: {
    resolver?: TenantDbResolver
    d1Binding?: D1DatabaseLike
    env?: Parameters<typeof resolvePersistenceConfig>[0]
    runtimeEnv?: AppEnv
  } = {},
): Promise<RepositoryResolutionResult> {
  const config = resolvePersistenceConfig(options.env)

  switch (config.mode) {
    case "in_memory": {
      if (config.isProduction) {
        return { ok: false, error: "persistence_disabled" }
      }
      return {
        ok: true,
        bundle: {
          actionPreviews: createInMemoryActionPreviewRepo(),
          approvalRecords: createInMemoryApprovalRecordRepository(),
          ctx: { tenantId, db: null },
        },
      }
    }

    case "d1": {
      // Try explicit resolver first (backward compat with tests)
      if (options.resolver) {
        try {
          const ctx = await options.resolver.resolveTenantDb(tenantId)
          const d1Store = (options.d1Binding ?? ctx.db) as D1DatabaseLike | null
          if (!d1Store) return { ok: false, error: "d1_not_configured" }
          return {
            ok: true,
            bundle: {
              actionPreviews: new D1ActionPreviewRepository(d1Store),
              approvalRecords: new D1ApprovalRecordRepository(d1Store),
              ctx,
            },
          }
        } catch {
          return { ok: false, error: "tenant_resolution_failed" }
        }
      }

      // No explicit resolver — try runtime env bindings
      const d1Store = options.d1Binding ?? resolveRuntimeBinding(options)
      if (!d1Store) return { ok: false, error: "d1_not_configured" }

      return {
        ok: true,
        bundle: {
          actionPreviews: new D1ActionPreviewRepository(d1Store),
          approvalRecords: new D1ApprovalRecordRepository(d1Store),
          ctx: { tenantId, db: null },
        },
      }
    }

    case "disabled":
    default:
      return { ok: false, error: "persistence_disabled" }
  }
}

// ─── D1 Runtime Binding Resolution ──────────────────────────────

function resolveRuntimeBinding(options: {
  runtimeEnv?: AppEnv
}): D1DatabaseLike | null {
  if (!options.runtimeEnv) return null
  const bindings = getCloudflareD1Bindings(options.runtimeEnv)
  // Use tenant default DB for tenant repos
  return bindings.tenantDefaultDb ?? null
}

// ─── In-Memory Helpers ──────────────────────────────────────────

let inMemoryActionPreviewRepo: ActionPreviewRepository | null = null

function createInMemoryActionPreviewRepo(): ActionPreviewRepository {
  if (!inMemoryActionPreviewRepo) {
    const store = new Map<string, Record<string, unknown>>()
    inMemoryActionPreviewRepo = {
      async create(_ctx, row) {
        store.set(row.id, { ...row, id: row.id, tenantId: row.tenantId ?? _ctx.tenantId })
        return row
      },
      async findById(_ctx, id) {
        const row = store.get(id)
        if (!row) return null
        return {
          id: row.id as string,
          tenantId: row.tenantId as string,
          workUnitId: row.workUnitId as string,
          actionType: row.actionType as string,
          targetPreview: (row.targetPreview ?? "{}") as string,
          payloadPreview: (row.payloadPreview ?? "{}") as string,
          requiresApproval: (row.requiresApproval ?? 1) as number,
          status: (row.status ?? "preview") as string,
          targetHash: (row.targetHash ?? "") as string,
          payloadHash: (row.payloadHash ?? "") as string,
          createdAt: (row.createdAt ?? "") as string,
          expiresAt: row.expiresAt as string | undefined,
        } as unknown as Awaited<ReturnType<ActionPreviewRepository["findById"]>>
      },
      async findByWorkUnitId(_ctx, workUnitId) {
        const results: unknown[] = []
        store.forEach((v) => {
          if ((v as Record<string, unknown>).workUnitId === workUnitId) {
            results.push(v)
          }
        })
        return results as unknown as Awaited<ReturnType<ActionPreviewRepository["findByWorkUnitId"]>>
      },
    }
  }
  return inMemoryActionPreviewRepo
}

/** Reset in-memory repos for test isolation. */
export function resetInMemoryReposForTests(): void {
  inMemoryActionPreviewRepo = null
}
