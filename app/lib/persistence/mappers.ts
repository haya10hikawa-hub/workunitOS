/**
 * Persistence Mappers
 *
 * Map between domain objects and persistence row types.
 * Domain types live in app/lib/domain/types.ts.
 * Row types live in app/lib/persistence/types.ts.
 */

import type { ActionApprovalRecord } from "../domain/types.ts"
import type { ApprovalRecordRow } from "./types.ts"
import type { TenantId, UserId } from "../tenant/types.ts"

// ─── Approval Record ────────────────────────────────────────────

/**
 * Convert a domain ActionApprovalRecord to a persistence ApprovalRecordRow.
 * All fields map directly — both use the same shape by design.
 */
export function approvalRecordDomainToRow(record: ActionApprovalRecord): ApprovalRecordRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    workUnitId: record.workUnitId,
    actionPreviewId: record.actionPreviewId,
    actionType: record.actionType,
    targetHash: record.targetHash,
    payloadHash: record.payloadHash,
    status: record.status,
    approvedByUserId: record.approvedByUserId,
    createdAt: record.createdAt,
    approvedAt: record.approvedAt,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt,
  }
}

/**
 * Convert a persistence ApprovalRecordRow to a domain ActionApprovalRecord.
 * All fields map directly — both use the same shape by design.
 */
export function approvalRecordRowToDomain(row: ApprovalRecordRow): ActionApprovalRecord {
  return {
    id: row.id,
    tenantId: row.tenantId as TenantId,
    workUnitId: row.workUnitId,
    actionPreviewId: row.actionPreviewId,
    actionType: row.actionType as ActionApprovalRecord["actionType"],
    targetHash: row.targetHash,
    payloadHash: row.payloadHash,
    status: row.status,
    approvedByUserId: row.approvedByUserId as UserId | undefined,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
  }
}
