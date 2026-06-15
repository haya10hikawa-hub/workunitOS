/**
 * In-Memory Repository Implementations
 *
 * NOT SAFE FOR PRODUCTION — state lost on restart, no atomicity.
 */

import type {
  InboxWorkUnitRow,
  WorkUnitFeedbackRow,
  IntegrationConnectionRow,
  AuditLogRow,
  UsageEventRow,
  UsageDailySummaryRow,
  ApprovalRecordRow,
  TenantDbContext,
} from "./types.ts"
import type {
  WorkUnitRepository,
  WorkUnitFeedbackRepository,
  IntegrationConnectionRepository,
  AuditLogRepository,
  UsageRepository,
  ApprovalRecordRepository,
} from "./repositories.ts"

// ─── WorkUnit ───────────────────────────────────────────────────

export function createInMemoryWorkUnitRepository(): WorkUnitRepository {
  const store = new Map<string, InboxWorkUnitRow>()
  const keyFor = (tenantId: string, id: string) => `${tenantId}:${id}`
  return {
    async create(_ctx, row) { store.set(keyFor(row.tenantId, row.id), { ...row }); return row },
    async upsert(_ctx, row) { store.set(keyFor(row.tenantId, row.id), { ...row }); return row },
    async findById(_ctx, id) { return store.get(keyFor(_ctx.tenantId, id)) ?? null },
    async updateStatus(_ctx, id, status) {
      const key = keyFor(_ctx.tenantId, id)
      const r = store.get(key); if (!r) return null; const u = { ...r, status, updatedAt: new Date().toISOString() }; store.set(key, u); return u
    },
    async listRecent(_ctx, limit = 50) {
      return Array.from(store.values()).filter((row) => row.tenantId === _ctx.tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
    },
  }
}

// ─── WorkUnit Feedback ──────────────────────────────────────────

export function createInMemoryWorkUnitFeedbackRepository(): WorkUnitFeedbackRepository {
  const store = new Map<string, WorkUnitFeedbackRow>()
  return {
    async create(_ctx, row) { store.set(row.id, { ...row }); return row },
    async findByWorkUnitId(_ctx, wuId) {
      return Array.from(store.values()).filter((r) => r.workUnitId === wuId && r.tenantId === _ctx.tenantId)
    },
  }
}

// ─── Integration Connection ─────────────────────────────────────

export function createInMemoryIntegrationConnectionRepository(): IntegrationConnectionRepository {
  const store = new Map<string, IntegrationConnectionRow>()
  return {
    async upsert(_ctx, row) { store.set(`${row.tenantId}:${row.provider}`, { ...row }); return row },
    async findByProvider(_ctx, provider) { return store.get(`${_ctx.tenantId}:${provider}`) ?? null },
    async listByTenant(_ctx) { return Array.from(store.values()).filter((row) => row.tenantId === _ctx.tenantId) },
    async updateStatus(_ctx, provider, status, err) {
      const r = store.get(`${_ctx.tenantId}:${provider}`); if (!r) return null
      const u = { ...r, status, lastErrorCode: err?.code, lastErrorMessage: err?.message, updatedAt: new Date().toISOString() }
      store.set(`${_ctx.tenantId}:${provider}`, u); return u
    },
  }
}

// ─── Audit Log ──────────────────────────────────────────────────

export function createInMemoryAuditLogRepository(): AuditLogRepository {
  const store: AuditLogRow[] = []
  return {
    async append(_ctx: TenantDbContext, row: AuditLogRow) { void _ctx; store.push(row); return row },
    async listRecent(_ctx: TenantDbContext, limit = 50) { return store.filter((row) => row.tenantId === _ctx.tenantId).slice(-limit).reverse() },
    async findByWorkUnitId(_ctx, wuId) {
      return store.filter((r) => r.tenantId === _ctx.tenantId && (r.requestId === wuId || r.workUnitId === wuId)).reverse()
    },
  }
}

// ─── Usage ──────────────────────────────────────────────────────

export function createInMemoryUsageRepository(): UsageRepository {
  const events: UsageEventRow[] = []
  const summary = new Map<string, UsageDailySummaryRow>()
  return {
    async recordEvent(_ctx, row) {
      events.push(row)
      const date = row.createdAt.slice(0, 10)
      const key = `${row.tenantId}:${date}:${row.eventType}`
      const existing = summary.get(key)
      const qty = (existing?.quantity ?? 0) + row.quantity
      summary.set(key, { tenantId: row.tenantId, date, eventType: row.eventType, quantity: qty, updatedAt: new Date().toISOString() })
      return row
    },
    async getDailySummary(_ctx, _tenantId, date) {
      return Array.from(summary.values()).filter((s) => s.date === date && s.tenantId === _tenantId)
    },
    async getCurrentUsage(_ctx, tenantId, eventType) {
      return events.filter((e) => e.tenantId === tenantId && e.eventType === eventType).reduce((sum, e) => sum + e.quantity, 0)
    },
  }
}

// ─── Approval Record (existing) ─────────────────────────────────

export function createInMemoryApprovalRecordRepository(): ApprovalRecordRepository & {
  addRecord(row: ApprovalRecordRow): void
  getAllRecords(): readonly ApprovalRecordRow[]
} {
  const records = new Map<string, ApprovalRecordRow>()
  return {
    async create(_ctx, row) { records.set(row.id, { ...row }); return { ...row } },
    async findById(_ctx, id) { return records.get(id) ?? null },
    async findByPreviewId(_ctx, pid) {
      for (const row of records.values()) { if (row.actionPreviewId === pid) return { ...row } }
      return null
    },
    async findByWorkUnitId(_ctx, wuId) {
      return Array.from(records.values()).filter((r) => r.workUnitId === wuId).map((r) => ({ ...r }))
    },
    async updateStatus(_ctx, id, status) {
      const r = records.get(id); if (!r) return null; const u = { ...r, status }; records.set(id, u); return { ...u }
    },
    async markUsed(_ctx, id, usedAt) {
      const r = records.get(id); if (!r) return null; const u = { ...r, status: "used" as const, usedAt }; records.set(id, u); return { ...u }
    },
    addRecord(row) { records.set(row.id, { ...row }) },
    getAllRecords() { return Array.from(records.values()) },
  }
}
