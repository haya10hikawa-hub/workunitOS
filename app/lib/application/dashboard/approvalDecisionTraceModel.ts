/**
 * Decision Trace approval status mapper.
 *
 * Pure function that maps server-derived approval status into safe,
 * dashboard-displayable Decision Trace entries. This module is the
 * single source of truth for what the Decision Trace tells users
 * about approval state.
 *
 * Security:
 * - No React, D1, repository, route handler, or raw external client imports.
 * - No `any` types.
 * - No hashes, tenantId, actorUserId, or raw server errors in output.
 * - Deterministic output for a given input.
 */

import type { DashboardApprovalStatus } from "./dashboardApprovalStatusClient.ts"
import type { DashboardLogEntryView } from "./adoptedDashboardViewModel.ts"

// ─── Public types ──────────────────────────────────────────────

export type DecisionTraceApprovalInput = {
  /** Approval status result if loaded (null while loading / not yet fetched). */
  readonly approvalStatus: DashboardApprovalStatus | null

  /** True while the approval status fetch is in flight. */
  readonly approvalLoading: boolean

  /** True when the approval status fetch returned an error. */
  readonly approvalError: boolean

  /** Current preview loading state. */
  readonly previewStatus: "idle" | "creating" | "created" | "failed"

  /** True when a preview has been successfully created. */
  readonly previewCreated: boolean

  /** Currently selected WorkUnit ID (empty string if none). */
  readonly selectedWorkUnitId: string

  /** Currently selected decision (null if none). */
  readonly selectedDecision: string | null
}

export type ApprovalTraceStatus =
  | "no_workunit_selected"
  | "decision_required"
  | "preview_not_created"
  | "preview_creating"
  | "preview_created"
  | "approval_loading"
  | "approval_none"
  | "approval_pending"
  | "approval_approved"
  | "approval_rejected"
  | "approval_expired"
  | "approval_used"
  | "approval_error"

// ─── Builder ───────────────────────────────────────────────────

const TRACE_TEXT: Record<ApprovalTraceStatus, string> = {
  no_workunit_selected: "No WorkUnit selected.",
  decision_required: "Decision is required before preview creation.",
  preview_not_created: "Action Preview not created.",
  preview_creating: "Creating Action Preview...",
  preview_created: "Action Preview created.",
  approval_loading: "Checking approval status...",
  approval_none: "Action Preview created. Approval not completed.",
  approval_pending: "Approval pending.",
  approval_approved: "Approval completed by server record.",
  approval_rejected: "Approval rejected by server record.",
  approval_expired: "Approval expired. Create a new preview before proceeding.",
  approval_used: "Approval already consumed.",
  approval_error: "Approval status unavailable.",
}

const TRACE_LOG_STATUS: Record<ApprovalTraceStatus, DashboardLogEntryView["status"]> = {
  no_workunit_selected: "INFO",
  decision_required: "NEEDS_OWNER",
  preview_not_created: "NOT_READY",
  preview_creating: "STATUS",
  preview_created: "STATUS",
  approval_loading: "STATUS",
  approval_none: "NOT_READY",
  approval_pending: "NEEDS_REVIEW",
  approval_approved: "READY",
  approval_rejected: "NOT_READY",
  approval_expired: "NOT_READY",
  approval_used: "NOT_READY",
  approval_error: "NOT_READY",
}

const TRACE_INDICATOR: Partial<Record<ApprovalTraceStatus, DashboardLogEntryView["indicator"]>> = {
  no_workunit_selected: "red",
  decision_required: "red",
  preview_not_created: "red",
  preview_creating: "yellow",
  preview_created: "yellow",
  approval_loading: "yellow",
  approval_none: "red",
  approval_pending: "yellow",
  approval_approved: "green",
  approval_rejected: "red",
  approval_expired: "red",
  approval_used: "red",
  approval_error: "red",
}

/**
 * Compute the approval-related Decision Trace status from the
 * current input. Server approval status always overrides local
 * preview-created assumptions once it is loaded.
 */
export function computeApprovalTraceStatus(
  input: DecisionTraceApprovalInput,
): ApprovalTraceStatus {
  // ── No WorkUnit selected ──────────────────────────────────
  if (!input.selectedWorkUnitId) {
    return "no_workunit_selected"
  }

  // ── No decision selected ──────────────────────────────────
  if (!input.selectedDecision) {
    return "decision_required"
  }

  // ── Preview not yet created ───────────────────────────────
  if (!input.previewCreated) {
    if (input.previewStatus === "creating") {
      return "preview_creating"
    }
    return "preview_not_created"
  }

  // ── Approval fetch error ──────────────────────────────────
  if (input.approvalError) {
    return "approval_error"
  }

  // ── Approval still loading ────────────────────────────────
  if (input.approvalLoading) {
    return "approval_loading"
  }

  // ── Approval status not yet loaded ────────────────────────
  if (!input.approvalStatus) {
    // Preview created but no approval data loaded yet.
    // This can happen transiently before the first fetch returns.
    return "approval_none"
  }

  // ── Server approval status wins ───────────────────────────
  switch (input.approvalStatus.status) {
    case "none":
      return "approval_none"
    case "pending":
      return "approval_pending"
    case "approved":
      return "approval_approved"
    case "rejected":
      return "approval_rejected"
    case "expired":
      return "approval_expired"
    case "used":
      return "approval_used"
    default:
      return "approval_error"
  }
}

/**
 * Build a display-safe Decision Trace log entry for the current
 * approval state. Returns null when the trace status does not
 * warrant a dedicated approval log entry (e.g., no_workunit_selected
 * and decision_required are handled by existing log entries).
 */
export function buildApprovalTraceEntry(
  input: DecisionTraceApprovalInput,
): DashboardLogEntryView {
  const traceStatus = computeApprovalTraceStatus(input)
  return {
    status: TRACE_LOG_STATUS[traceStatus],
    text: TRACE_TEXT[traceStatus],
    indicator: TRACE_INDICATOR[traceStatus],
  }
}

/**
 * Returns true when the approval is server-confirmed as completed
 * (approved, not consumed, not expired). This is the canonical gate
 * for the "Approval Completed" readiness check.
 */
export function isApprovalCompleted(input: DecisionTraceApprovalInput): boolean {
  const traceStatus = computeApprovalTraceStatus(input)
  return traceStatus === "approval_approved"
}
