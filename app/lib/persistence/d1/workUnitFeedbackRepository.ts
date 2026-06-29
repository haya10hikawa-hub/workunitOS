/**
 * D1 WorkUnit Feedback Repository
 */

import type { TenantDbContext, WorkUnitFeedbackRow } from "../types.ts"
import type { WorkUnitFeedbackRepository } from "../repositories.ts"
import type { D1DatabaseLike } from "./types.ts"

export class D1WorkUnitFeedbackRepository implements WorkUnitFeedbackRepository {
  private db: D1DatabaseLike
  constructor(db: D1DatabaseLike) { this.db = db }

  async create(_ctx: TenantDbContext, row: WorkUnitFeedbackRow): Promise<WorkUnitFeedbackRow> {
    await this.db.prepare(
      "INSERT INTO workunit_feedback (id,tenant_id,work_unit_id,feedback,actor_user_id,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(row.id, _ctx.tenantId, row.workUnitId, row.feedback, row.actorUserId ?? null, row.createdAt).run()
    return { ...row, tenantId: _ctx.tenantId }
  }

  async findByWorkUnitId(_ctx: TenantDbContext, workUnitId: string): Promise<WorkUnitFeedbackRow[]> {
    const rows = await this.db.prepare(
      "SELECT * FROM workunit_feedback WHERE tenant_id = ? AND work_unit_id = ? ORDER BY created_at DESC",
    ).bind(_ctx.tenantId, workUnitId).all<Record<string, unknown>>()
    return (rows.results ?? []).map(mapFeedback)
  }
}

function mapFeedback(row: Record<string, unknown>): WorkUnitFeedbackRow {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as WorkUnitFeedbackRow["tenantId"],
    workUnitId: row.work_unit_id as string,
    feedback: row.feedback as string,
    actorUserId: row.actor_user_id as string | undefined,
    createdAt: row.created_at as string,
  }
}
