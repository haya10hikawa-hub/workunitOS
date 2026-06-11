/**
 * D1 Approval Record Repository
 *
 * Implements ApprovalRecordRepository backed by a D1 database.
 * Uses parameter binding — never string-concatenates untrusted values into SQL.
 */

import type { TenantDbContext, ApprovalRecordRow } from "../types.ts"
import type { ApprovalRecordRepository } from "../repositories.ts"
import type { D1DatabaseLike } from "./types.ts"
import { nowISO } from "./rowHelpers.ts"

// ─── SQL ────────────────────────────────────────────────────────

const INSERT_SQL = `
  INSERT INTO approval_records
    (id, tenant_id, work_unit_id, action_preview_id, action_type,
     target_hash, payload_hash, status, approved_by_user_id,
     created_at, approved_at, expires_at, used_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const FIND_BY_ID_SQL = `
  SELECT * FROM approval_records WHERE id = ?
`

const FIND_BY_PREVIEW_ID_SQL = `
  SELECT * FROM approval_records WHERE action_preview_id = ? ORDER BY created_at DESC LIMIT 1
`

const UPDATE_STATUS_SQL = `
  UPDATE approval_records SET status = ? WHERE id = ?
`

const MARK_USED_SQL = `
  UPDATE approval_records SET status = 'used', used_at = ? WHERE id = ?
`

// ─── Implementation ─────────────────────────────────────────────

export class D1ApprovalRecordRepository implements ApprovalRecordRepository {
  private db: D1DatabaseLike
  constructor(db: D1DatabaseLike) {
    this.db = db
  }

  async create(ctx: TenantDbContext, row: ApprovalRecordRow): Promise<ApprovalRecordRow> {
    await this.db.prepare(INSERT_SQL)
      .bind(
        row.id,
        ctx.tenantId,
        row.workUnitId,
        row.actionPreviewId,
        row.actionType,
        row.targetHash,
        row.payloadHash,
        row.status,
        row.approvedByUserId ?? null,
        row.createdAt ?? nowISO(),
        row.approvedAt ?? null,
        row.expiresAt,
        row.usedAt ?? null,
      )
      .run()
    return row
  }

  async findById(_ctx: TenantDbContext, id: string): Promise<ApprovalRecordRow | null> {
    const row = await this.db.prepare(FIND_BY_ID_SQL).bind(id).first<Record<string, unknown>>()
    if (!row) return null
    return this.mapRow(row)
  }

  async findByPreviewId(_ctx: TenantDbContext, actionPreviewId: string): Promise<ApprovalRecordRow | null> {
    const row = await this.db.prepare(FIND_BY_PREVIEW_ID_SQL)
      .bind(actionPreviewId)
      .first<Record<string, unknown>>()
    if (!row) return null
    return this.mapRow(row)
  }

  async updateStatus(_ctx: TenantDbContext, id: string, status: ApprovalRecordRow["status"]): Promise<ApprovalRecordRow | null> {
    await this.db.prepare(UPDATE_STATUS_SQL).bind(status, id).run()
    return this.findById(_ctx, id)
  }

  async markUsed(_ctx: TenantDbContext, id: string, usedAt: string): Promise<ApprovalRecordRow | null> {
    await this.db.prepare(MARK_USED_SQL).bind(usedAt, id).run()
    return this.findById(_ctx, id)
  }

  // ── Private ──────────────────────────────────────────────────

  private mapRow(row: Record<string, unknown>): ApprovalRecordRow {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as ApprovalRecordRow["tenantId"],
      workUnitId: row.work_unit_id as string,
      actionPreviewId: row.action_preview_id as string,
      actionType: row.action_type as string,
      targetHash: (row.target_hash as string) ?? "",
      payloadHash: (row.payload_hash as string) ?? "",
      status: (row.status as ApprovalRecordRow["status"]) ?? "pending",
      approvedByUserId: (row.approved_by_user_id as ApprovalRecordRow["approvedByUserId"]) ?? undefined,
      createdAt: (row.created_at as string) ?? nowISO(),
      approvedAt: (row.approved_at as string) ?? undefined,
      expiresAt: (row.expires_at as string) ?? "",
      usedAt: (row.used_at as string) ?? undefined,
    }
  }
}
