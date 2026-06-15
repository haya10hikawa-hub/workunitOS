/**
 * Execution Readiness Model
 *
 * Pure functions that compute whether external execution is ready
 * based on server-derived state. No side effects, no I/O.
 *
 * Security:
 * - No React, D1, repository, route handler, or raw external client imports.
 * - No `any` types.
 * - No hashes, tenantId, actorUserId, or raw server errors in output.
 * - Deterministic output for a given input.
 */

import type { DashboardApprovalStatus } from "./dashboardApprovalStatusClient.ts"

// ─── Public types ──────────────────────────────────────────────

export type ReadinessInput = {
  /** Currently selected WorkUnit ID (empty string if none). */
  readonly selectedWorkUnitId: string
  /** True when a preview was successfully created. */
  readonly previewCreated: boolean
  /** Current preview status. */
  readonly previewStatus: "idle" | "creating" | "created" | "failed"
  /** Safe preview references (actionId + previewId only). */
  readonly previewRefCount: number
  /** Server-derived approval status (null if not yet loaded). */
  readonly approvalStatus: DashboardApprovalStatus | null
  /** True while approval status fetch is in flight. */
  readonly approvalLoading: boolean
  /** True when approval status fetch returned an error. */
  readonly approvalError: boolean
  /** True when external execution is theoretically enabled (kill switch off).
   *  Even when true, execution may be withheld at the UI layer.
   *  Default false — external execution is disabled in this release. */
  readonly externalExecutionEnabled: boolean
}

export type ReadinessTraceStatus =
  | "no_workunit_selected"
  | "preview_required"
  | "preview_failed"
  | "approval_required"
  | "approval_pending"
  | "approval_rejected"
  | "approval_expired"
  | "approval_used"
  | "approval_status_unavailable"
  | "execution_blocked"
  | "execution_ready"

// ─── Trace text map ────────────────────────────────────────────

export const READINESS_TRACE_TEXT: Record<ReadinessTraceStatus, string> = {
  no_workunit_selected: "No WorkUnit selected.",
  preview_required: "Action Preview must be created before execution.",
  preview_failed: "Preview creation failed. Create a new preview before proceeding.",
  approval_required: "Approval is required before execution.",
  approval_pending: "Approval is pending. Execution is not yet available.",
  approval_rejected: "Approval was rejected. Create a new preview and obtain approval.",
  approval_expired: "Approval has expired. Create a new preview and obtain approval.",
  approval_used: "Approval has already been consumed. Create a new preview and obtain approval.",
  approval_status_unavailable: "Approval status is unavailable. Execution is blocked.",
  execution_blocked: "Execution ready, but external execution is disabled.",
  execution_ready: "Ready for execution.",
}

// ─── Compute ───────────────────────────────────────────────────

/**
 * Compute execution readiness from server-derived state.
 * Returns false for any condition that blocks execution.
 *
 * Readiness is true ONLY when:
 * - selected WorkUnit exists
 * - preview was created (not failed)
 * - approval is server-confirmed as approved
 * - approval is not consumed (used === false)
 * - approval is not expired (expired === false)
 * - approval status is loaded and not in error
 */
export function computeExecutionReadiness(input: ReadinessInput): {
  readonly ready: boolean
  readonly traceStatus: ReadinessTraceStatus
  readonly reason: string
} {
  const traceStatus = computeReadinessTraceStatus(input)
  return {
    ready: traceStatus === "execution_ready",
    traceStatus,
    reason: READINESS_TRACE_TEXT[traceStatus],
  }
}

function computeReadinessTraceStatus(input: ReadinessInput): ReadinessTraceStatus {
  // ── No WorkUnit ──────────────────────────────────────────
  if (!input.selectedWorkUnitId) {
    return "no_workunit_selected"
  }

  // ── Preview failed (checked before preview_required) ─────
  if (input.previewStatus === "failed") {
    return "preview_failed"
  }

  // ── Preview required ─────────────────────────────────────
  if (!input.previewCreated) {
    return "preview_required"
  }

  if (input.previewStatus !== "created") {
    return "preview_required"
  }

  if (input.previewRefCount === 0) {
    return "preview_required"
  }

  // ── Approval required ────────────────────────────────────
  if (input.approvalError) {
    return "approval_status_unavailable"
  }

  if (input.approvalLoading) {
    return "approval_required"
  }

  if (!input.approvalStatus) {
    return "approval_required"
  }

  // ── Server approval status wins ──────────────────────────
  const a = input.approvalStatus

  switch (a.status) {
    case "none":
      return "approval_required"
    case "pending":
      return "approval_pending"
    case "approved":
      // Must also check consumed/expired
      if (a.used) return "approval_used"
      if (a.expired) return "approval_expired"
      // Approved + not consumed + not expired
      // External execution is disabled by default in this release
      return input.externalExecutionEnabled ? "execution_ready" : "execution_blocked"
    case "rejected":
      return "approval_rejected"
    case "expired":
      return "approval_expired"
    case "used":
      return "approval_used"
    default:
      return "approval_status_unavailable"
  }
}

/**
 * Build a display-safe execution readiness trace entry.
 * Suitable for rendering in the Decision Trace or Readiness Gates.
 */
export function buildExecutionReadinessTrace(input: ReadinessInput): {
  readonly label: string
  readonly checked: boolean
  readonly traceText: string
  readonly traceStatus: ReadinessTraceStatus
} {
  const { ready, traceStatus, reason } = computeExecutionReadiness(input)
  return {
    label: "External Execution Allowed",
    checked: ready,
    traceText: reason,
    traceStatus,
  }
}
