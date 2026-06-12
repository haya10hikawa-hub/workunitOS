/**
 * D1 Integration Connection Repository
 */

import type { TenantDbContext, IntegrationConnectionRow } from "../types.ts"
import type { IntegrationConnectionRepository } from "../repositories.ts"
import type { D1DatabaseLike } from "./types.ts"
import { nowISO } from "./rowHelpers.ts"

export class D1IntegrationConnectionRepository implements IntegrationConnectionRepository {
  private db: D1DatabaseLike
  constructor(db: D1DatabaseLike) { this.db = db }

  async upsert(_ctx: TenantDbContext, row: IntegrationConnectionRow): Promise<IntegrationConnectionRow> {
    void _ctx
    const now = nowISO()
    await this.db.prepare(
      `INSERT INTO integration_connections (id,tenant_id,provider,status,mode,display_name,external_account_id,scopes_json,metadata_json,connected_at,disconnected_at,last_sync_at,last_error_code,last_error_message,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,mode=excluded.mode,display_name=excluded.display_name,external_account_id=excluded.external_account_id,scopes_json=excluded.scopes_json,metadata_json=excluded.metadata_json,connected_at=excluded.connected_at,disconnected_at=excluded.disconnected_at,last_sync_at=excluded.last_sync_at,last_error_code=excluded.last_error_code,last_error_message=excluded.last_error_message,updated_at=excluded.updated_at`,
    ).bind(row.id, row.tenantId, row.provider, row.status, row.mode, row.displayName ?? null, row.externalAccountId ?? null, row.scopesJson ?? null, row.metadataJson ?? null, row.connectedAt ?? null, row.disconnectedAt ?? null, row.lastSyncAt ?? null, row.lastErrorCode ?? null, row.lastErrorMessage ?? null, row.createdAt, now).run()
    return { ...row, updatedAt: now }
  }

  async findByProvider(_ctx: TenantDbContext, provider: string): Promise<IntegrationConnectionRow | null> {
    const rows = await this.db.prepare(
      "SELECT * FROM integration_connections WHERE tenant_id = ?",
    ).bind(_ctx.tenantId).all<Record<string, unknown>>()
    const row = (rows.results ?? []).find((entry) => String(entry.provider) === provider)
    return row ? mapConnection(row) : null
  }

  async listByTenant(_ctx: TenantDbContext): Promise<IntegrationConnectionRow[]> {
    const rows = await this.db.prepare(
      "SELECT * FROM integration_connections WHERE tenant_id = ?",
    ).bind(_ctx.tenantId).all<Record<string, unknown>>()
    return (rows.results ?? []).map(mapConnection)
  }

  async updateStatus(_ctx: TenantDbContext, provider: string, status: string, error?: { code?: string; message?: string }): Promise<IntegrationConnectionRow | null> {
    const existing = await this.findByProvider(_ctx, provider)
    if (!existing) return null
    return this.upsert(_ctx, {
      ...existing,
      status,
      lastErrorCode: error?.code,
      lastErrorMessage: error?.message,
      updatedAt: nowISO(),
    })
  }
}

function mapConnection(row: Record<string, unknown>): IntegrationConnectionRow {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as IntegrationConnectionRow["tenantId"],
    provider: row.provider as string,
    status: row.status as string,
    mode: row.mode as string,
    displayName: row.display_name as string | undefined,
    externalAccountId: row.external_account_id as string | undefined,
    scopesJson: row.scopes_json as string | undefined,
    metadataJson: row.metadata_json as string | undefined,
    connectedAt: row.connected_at as string | undefined,
    disconnectedAt: row.disconnected_at as string | undefined,
    lastSyncAt: row.last_sync_at as string | undefined,
    lastErrorCode: row.last_error_code as string | undefined,
    lastErrorMessage: row.last_error_message as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
