/**
 * Execution Result Viewer Model
 *
 * Pure functions for building display-safe execution verification
 * result views. Currently supports dry-run outcomes only.
 *
 * Security:
 * - No React, D1, repository, route handler, or raw external client imports.
 * - No `any` types.
 * - No hashes, tenantId, actorUserId, approvalId, or raw server errors.
 * - Deterministic output for a given input.
 */

// ─── Public types ──────────────────────────────────────────────

export type ExecutionResultViewerKind =
  | "idle"
  | "running"
  | "dry_run_verified"
  | "dry_run_blocked"
  | "dry_run_not_ready"
  | "dry_run_failed"

export type ExecutionResultViewerModel = {
  readonly kind: ExecutionResultViewerKind
  readonly title: string
  readonly statusLabel: string
  readonly reason: string | null
  readonly actionCount: number | null
  readonly requestedActionType: string | null
  readonly requestedActionTypeLabel: string
  readonly canClear: boolean
  readonly canRerun: boolean
}

export type ExecutionResultViewerInput = {
  /** Current dry-run status from the dashboard. */
  readonly dryRunStatus: "idle" | "running" | "verified" | "blocked" | "not_ready" | "failed"
  /** Safe reason message from the dry-run response. */
  readonly dryRunMessage: string | null
  /** Number of preview actions checked. */
  readonly dryRunActionCount: number
  /** Safe action type code from the dry-run response. */
  readonly dryRunActionType: string | null
}

// ─── Labels ────────────────────────────────────────────────────

const KIND_TITLE: Record<ExecutionResultViewerKind, string> = {
  idle: "",
  running: "DRY-RUN RESULT",
  dry_run_verified: "DRY-RUN RESULT",
  dry_run_blocked: "DRY-RUN RESULT",
  dry_run_not_ready: "DRY-RUN RESULT",
  dry_run_failed: "DRY-RUN RESULT",
}

const KIND_STATUS: Record<ExecutionResultViewerKind, string> = {
  idle: "",
  running: "Running",
  dry_run_verified: "Verified",
  dry_run_blocked: "Blocked",
  dry_run_not_ready: "Not ready",
  dry_run_failed: "Failed",
}

// ─── Builder ────────────────────────────────────────────────────

/**
 * Build a safe, display-only execution result viewer model
 * from dry-run UI state.
 *
 * Returns an idle model when no result is available.
 * Does NOT inspect raw approval records, persisted data,
 * or external client state.
 */
export function buildExecutionResultViewer(
  input: ExecutionResultViewerInput,
): ExecutionResultViewerModel {
  const kind = mapKind(input.dryRunStatus)

  // Idle: nothing to show
  if (kind === "idle") {
    return {
      kind: "idle",
      title: "",
      statusLabel: "",
      reason: null,
      actionCount: null,
      requestedActionType: null,
      requestedActionTypeLabel: "",
      canClear: false,
      canRerun: false,
    }
  }

  // Running: minimal display, no detail
  if (kind === "running") {
    return {
      kind: "running",
      title: KIND_TITLE.running,
      statusLabel: KIND_STATUS.running,
      reason: input.dryRunMessage,
      actionCount: input.dryRunActionCount || null,
      requestedActionType: null,
      requestedActionTypeLabel: "",
      canClear: false,
      canRerun: false,
    }
  }

  // Completed: full detail
  return {
    kind,
    title: KIND_TITLE[kind],
    statusLabel: KIND_STATUS[kind],
    reason: input.dryRunMessage,
    actionCount: input.dryRunActionCount || null,
    requestedActionType: input.dryRunActionType,
    requestedActionTypeLabel: input.dryRunActionType ?? "Not available",
    canClear: true,
    canRerun: true,
  }
}

// ─── Mapper ─────────────────────────────────────────────────────

function mapKind(
  status: ExecutionResultViewerInput["dryRunStatus"],
): ExecutionResultViewerKind {
  switch (status) {
    case "idle":
      return "idle"
    case "running":
      return "running"
    case "verified":
      return "dry_run_verified"
    case "blocked":
      return "dry_run_blocked"
    case "not_ready":
      return "dry_run_not_ready"
    case "failed":
      return "dry_run_failed"
    default:
      return "idle"
  }
}
