/**
 * Execution Command Model
 *
 * Pure functions for building safe execution command envelopes.
 * Real execution is NOT enabled — only "blocked" and "dry_run" modes
 * are supported. This model ensures that if execution were to be
 * wired up in the future, the envelope is structurally safe.
 *
 * Security:
 * - No React, route handler, D1, or raw external client imports.
 * - No `any` types.
 * - No hashes, tenantId, actorUserId, tokens, secrets, rawPayload, or rawBody.
 * - Deterministic output for a given input.
 */

// ─── Public types ──────────────────────────────────────────────

export type SafePreviewRef = {
  readonly actionId: string
  readonly previewId: string
}

export type ExecutionCommandInput = {
  /** The selected WorkUnit ID. */
  readonly workUnitId: string
  /** Safe preview references (actionId + previewId only). */
  readonly previewRefs: readonly SafePreviewRef[]
  /** The requested action type (e.g., "slack_reply"), if known. */
  readonly requestedActionType?: string | null
  /** The server-owned approval ID, if safely available. */
  readonly approvalId?: string | null
}

export type ExecutionMode = "blocked" | "dry_run"

export type ExecutionCommandEnvelope = {
  readonly mode: ExecutionMode
  readonly workUnitId: string
  readonly previewRefs: readonly SafePreviewRef[]
  readonly requestedActionType: string | null
  readonly approvalId: string | null
  readonly approvalIdAvailable: boolean
  readonly blockedReason: string | null
}

// ─── Builder ───────────────────────────────────────────────────

/**
 * Build a safe execution command envelope.
 *
 * In the current phase, the envelope is always "blocked"
 * since external execution is not enabled. The envelope is
 * structurally complete so that future wiring is a matter
 * of changing the mode guard.
 */
export function buildExecutionCommandEnvelope(
  input: ExecutionCommandInput,
): ExecutionCommandEnvelope {
  // ── Validate mode-safe reference ──────────────────────────
  const safeRefs = input.previewRefs.map((ref) => ({
    actionId: ref.actionId,
    previewId: ref.previewId,
  }))

  // ── Determine approvalId availability ─────────────────────
  const approvalId = input.approvalId ?? null
  const approvalIdAvailable = approvalId !== null
  const blockedReason = approvalIdAvailable
    ? "External execution is blocked by kill switch (dry_run would be available)."
    : "External execution is blocked. Approval ID unavailable."

  return {
    mode: "blocked",
    workUnitId: input.workUnitId,
    previewRefs: safeRefs,
    requestedActionType: input.requestedActionType ?? null,
    approvalId,
    approvalIdAvailable,
    blockedReason,
  }
}

/**
 * Returns the reason why the approvalId is unavailable.
 * Used for safe user-facing messaging.
 */
export function approvalIdUnavailableReason(): string {
  return "approval_id_unavailable"
}
