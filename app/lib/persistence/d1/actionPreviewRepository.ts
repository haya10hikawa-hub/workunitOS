/**
 * D1 ActionPreview Repository
 *
 * Implements ActionPreviewRepository backed by a D1 database.
 * Uses parameter binding — never string-concatenates untrusted values into SQL.
 */

import type { TenantDbContext, ActionPreviewRow } from "../types.ts"
import type { ActionPreviewRepository } from "../repositories.ts"
import type { D1DatabaseLike } from "./types.ts"
import { safeJsonParse, safeJsonStringify, nowISO } from "./rowHelpers.ts"

// ─── SQL ────────────────────────────────────────────────────────

const INSERT_SQL = `
  INSERT INTO action_previews
    (id, tenant_id, work_unit_id, action_type,
     target_preview, payload_preview, requires_approval, status,
     target_hash, payload_hash, created_at, expires_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const FIND_BY_ID_SQL = `
  SELECT * FROM action_previews WHERE id = ?
`

const FIND_BY_WORK_UNIT_SQL = `
  SELECT * FROM action_previews WHERE work_unit_id = ? ORDER BY created_at DESC
`

// ─── Implementation ─────────────────────────────────────────────

export class D1ActionPreviewRepository implements ActionPreviewRepository {
  private db: D1DatabaseLike
  constructor(db: D1DatabaseLike) {
    this.db = db
  }

  async create(ctx: TenantDbContext, row: ActionPreviewRow): Promise<ActionPreviewRow> {
    await this.db.prepare(INSERT_SQL)
      .bind(
        row.id,
        ctx.tenantId,
        row.workUnitId,
        row.actionType,
        safeJsonStringify(row.targetPreview ? safeJsonParse(safeJsonStringify(row.targetPreview), {}) : {}),
        safeJsonStringify(row.payloadPreview ? safeJsonParse(safeJsonStringify(row.payloadPreview), {}) : {}),
        row.requiresApproval ? 1 : 0,
        row.status,
        row.targetHash,
        row.payloadHash,
        row.createdAt ?? nowISO(),
        row.expiresAt ?? null,
      )
      .run()
    return row
  }

  async findById(_ctx: TenantDbContext, id: string): Promise<ActionPreviewRow | null> {
    const row = await this.db.prepare(FIND_BY_ID_SQL).bind(id).first<Record<string, unknown>>()
    if (!row) return null
    return this.mapRow(row)
  }

  async findByWorkUnitId(_ctx: TenantDbContext, workUnitId: string): Promise<ActionPreviewRow[]> {
    const result = await this.db.prepare(FIND_BY_WORK_UNIT_SQL)
      .bind(workUnitId)
      .all<Record<string, unknown>>()
    return result.results.map((r) => this.mapRow(r))
  }

  // ── Private ──────────────────────────────────────────────────

  private mapRow(row: Record<string, unknown>): ActionPreviewRow {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as ActionPreviewRow["tenantId"],
      workUnitId: row.work_unit_id as string,
      actionType: row.action_type as string,
      targetPreview: safeJsonParse(row.target_preview as string, {}).toString() !== "[object Object]"
        ? safeJsonParse(row.target_preview as string, "{}")
        : "{}",
      payloadPreview: safeJsonParse(row.payload_preview as string, "{}").toString() !== "[object Object]"
        ? safeJsonParse(row.payload_preview as string, "{}")
        : "{}",
      requiresApproval: row.requires_approval === 1 || row.requires_approval === "1" ? 1 : 0,
      status: (row.status as string) ?? "preview",
      targetHash: (row.target_hash as string) ?? "",
      payloadHash: (row.payload_hash as string) ?? "",
      createdAt: (row.created_at as string) ?? nowISO(),
      expiresAt: (row.expires_at as string) ?? undefined,
    }
  }
}
