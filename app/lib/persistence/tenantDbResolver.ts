/**
 * Tenant DB Resolver
 *
 * Implements TenantDbResolver using a D1 control database.
 * Also provides a fake resolver for testing without real Cloudflare D1.
 */

import type { TenantId } from "../tenant/types.ts"
import type { TenantDbContext } from "./types.ts"
import type { TenantDbResolver } from "./repositories.ts"
import type { D1DatabaseLike } from "./d1/types.ts"

// ─── SQL ────────────────────────────────────────────────────────

const FIND_TENANT_SQL = `SELECT * FROM tenants WHERE id = ? AND status = 'active'`
const FIND_TENANT_DB_SQL = `SELECT * FROM tenant_databases WHERE tenant_id = ? AND status = 'active'`

// ─── D1 Implementation ──────────────────────────────────────────

export class D1TenantDbResolver implements TenantDbResolver {
  private controlDb: D1DatabaseLike
  constructor(controlDb: D1DatabaseLike) {
    this.controlDb = controlDb
  }

  async resolveTenantDb(tenantId: TenantId): Promise<TenantDbContext> {
    const tenant = await this.controlDb
      .prepare(FIND_TENANT_SQL)
      .bind(tenantId)
      .first<Record<string, unknown>>()

    if (!tenant) {
      throw Object.assign(
        new Error("tenant_not_found"),
        { kind: "tenant_not_found", tenantId, message: `Tenant ${tenantId} not found or inactive` },
      )
    }

    const dbRef = await this.controlDb
      .prepare(FIND_TENANT_DB_SQL)
      .bind(tenantId)
      .first<Record<string, unknown>>()

    if (!dbRef) {
      throw Object.assign(
        new Error("database_not_found"),
        { kind: "database_not_found", tenantId, message: `No active database found for tenant ${tenantId}` },
      )
    }

    return {
      tenantId,
      db: this.controlDb, // In real D1, this would be the tenant-specific D1Database
    }
  }
}

// ─── Fake Implementation for Tests ──────────────────────────────

/**
 * Creates a fake TenantDbResolver for testing.
 * Accepts a map of tenantId → TenantDatabaseRef for predetermined responses.
 */
export function createFakeTenantDbResolver(
  tenants: Map<string, { tenant: Record<string, unknown>; dbRef: Record<string, unknown> }>,
): TenantDbResolver {
  return {
    async resolveTenantDb(tenantId: TenantId): Promise<TenantDbContext> {
      const entry = tenants.get(tenantId)
      if (!entry) {
        throw Object.assign(
          new Error("tenant_not_found"),
          { kind: "tenant_not_found", tenantId, message: `Tenant ${tenantId} not found` },
        )
      }
      const dbRef = entry.dbRef
      if (!dbRef || dbRef.status !== "active") {
        throw Object.assign(
          new Error("database_not_found"),
          { kind: "database_not_found", tenantId, message: `No active database for tenant ${tenantId}` },
        )
      }
      return { tenantId, db: null }
    },
  }
}
