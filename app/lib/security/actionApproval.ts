/**
 * Server-side action approval foundation.
 *
 * External actions (reply, schedule, create_issue) must be approved
 * server-side before execution. The client-provided `approvedByPm` flag
 * MUST NOT authorize execution.
 *
 * This module re-exports the ApprovalStore interface and verification
 * function from `approvalStore.ts`. Approval persistence (database) is
 * deferred to a future PR.
 */

import type { ToolBackendOperation } from "../../types/toolBackend.ts"
import type {
  ActionApprovalRecord,
  ApprovalActionType,
} from "../domain/types.ts"
import type { TenantId } from "../tenant/types.ts"
import {
  hashActionTarget,
  hashActionPayload,
} from "./hash.ts"

export type { ApprovalStore } from "./approvalStore.ts"
export {
  verifyApproval,
  defaultDenyApprovalStore,
  createInMemoryApprovalStore,
} from "./approvalStore.ts"
export type { ApprovalLookupInput, ApprovalVerificationResult } from "./approvalStore.ts"

// Re-export canonical hash utilities
export {
  hashActionTarget,
  hashActionPayload,
  hashField,
  canonicalize,
  canonicalizeActionTarget,
  canonicalizeActionPayload,
  isApprovalStillValidForPreview,
} from "./hash.ts"
export type { CanonicalTarget, CanonicalPayload } from "./hash.ts"

/**
 * Map a ToolBackendOperation to the corresponding ApprovalActionType.
 * Returns null for non-external operations.
 */
export function approvalActionTypeForOperation(operation: ToolBackendOperation): ApprovalActionType | null {
  switch (operation) {
    case "reply": return "slack_reply"
    case "schedule": return "calendar_event"
    case "create_issue": return "github_issue"
    default: return null
  }
}

/**
 * Create an approval record preview (not persisted — no database yet).
 * Used for type-safe approval record construction.
 */
export function createApprovalPreview(params: {
  tenantId: TenantId
  workUnitId: string
  actionPreviewId: string
  actionType: ApprovalActionType
  target: string
  payload: unknown
  ttlMinutes?: number
}): ActionApprovalRecord {
  const now = new Date().toISOString()
  const ttl = params.ttlMinutes ?? 60
  return {
    id: `approval:${params.workUnitId}:${params.actionType}:${Date.now()}`,
    tenantId: params.tenantId,
    workUnitId: params.workUnitId,
    actionPreviewId: params.actionPreviewId,
    actionType: params.actionType,
    targetHash: hashActionTarget({ destination: params.target }),
    payloadHash: hashActionPayload(params.payload as Record<string, unknown>),
    status: "pending",
    createdAt: now,
    expiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
  }
}
