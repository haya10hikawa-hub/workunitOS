/**
 * In-Memory Repository Implementations
 *
 * Provides in-memory implementations of persistence repository interfaces
 * for testing and local development.
 *
 * NOT SAFE FOR PRODUCTION:
 *   - No persistence
 *   - No atomicity
 *   - State lost on restart
 */

import type { TenantDbContext, ApprovalRecordRow } from "./types.ts"
import type { ApprovalRecordRepository } from "./repositories.ts"

// ─── Approval Record Repository ─────────────────────────────────

export function createInMemoryApprovalRecordRepository(): ApprovalRecordRepository & {
  /** Directly insert a record (test-only). */
  addRecord(row: ApprovalRecordRow): void
  /** Get all records (test-only). */
  getAllRecords(): readonly ApprovalRecordRow[]
} {
  const records = new Map<string, ApprovalRecordRow>()

  return {
    async create(_ctx: TenantDbContext, row: ApprovalRecordRow) {
      records.set(row.id, { ...row })
      return { ...row }
    },

    async findById(_ctx: TenantDbContext, id: string) {
      return records.get(id) ?? null
    },

    async findByPreviewId(_ctx: TenantDbContext, previewId: string) {
      for (const row of records.values()) {
        if (row.actionPreviewId === previewId) return { ...row }
      }
      return null
    },

    async updateStatus(_ctx: TenantDbContext, id: string, status: ApprovalRecordRow["status"]) {
      const existing = records.get(id)
      if (!existing) return null
      const updated = { ...existing, status }
      records.set(id, updated)
      return { ...updated }
    },

    async markUsed(_ctx: TenantDbContext, id: string, usedAt: string) {
      const existing = records.get(id)
      if (!existing) return null
      const updated = { ...existing, status: "used" as const, usedAt }
      records.set(id, updated)
      return { ...updated }
    },

    addRecord(row: ApprovalRecordRow) {
      records.set(row.id, { ...row })
    },

    getAllRecords() {
      return Array.from(records.values())
    },
  }
}
