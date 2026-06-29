/**
 * Mock Execution Model
 *
 * Pure functions for building display-safe mock/internal execution
 * result views. Represents what a future mock execution WOULD look
 * like given a dry-run verification result — without actually
 * performing execution or any side effects.
 *
 * Security:
 * - No React, D1, repository, route handler, or raw external client imports.
 * - No `any` types.
 * - No hashes, tenantId, actorUserId, approvalId, or raw server errors.
 * - Deterministic output for a given input.
 * - NEVER exposes approvalId, hashes, tokens, secrets, raw payloads.
 * - sideEffectPolicy is always "none".
 * - canRunRealExecution is always false.
 */

// ─── Public types ──────────────────────────────────────────────

export type MockExecutionKind =
  | "mock_not_ready"
  | "mock_prepared"
  | "mock_blocked"
  | "mock_failed"

export type MockExecutionModel = {
  readonly kind: MockExecutionKind
  readonly mode: "mock_internal"
  readonly statusLabel: string
  readonly reason: string
  readonly workUnitId: string | null
  readonly actionCount: number
  readonly requestedActionType: string | null
  readonly requestedActionTypeLabel: string
  readonly sideEffectPolicy: "none"
  readonly canRunRealExecution: false
}

export type MockExecutionInput = {
  /** Dry-run status from the execution result viewer or dashboard state. */
  readonly dryRunStatus: "verified" | "blocked" | "not_ready" | "failed"
  /** Safe reason message from the dry-run result. */
  readonly dryRunReason: string
  /** Number of preview actions checked. */
  readonly actionCount: number
  /** Safe action type code. */
  readonly requestedActionType: string | null
  /** Current command envelope mode. */
  readonly envelopeMode: string
  /** Command envelope blocked reason. */
  readonly envelopeBlockedReason: string | null
  /** Selected WorkUnit ID (empty if none). */
  readonly workUnitId: string
  /** Number of preview refs. */
  readonly previewRefCount: number
  /** True when external execution is enabled (always false in current release). */
  readonly externalExecutionEnabled: boolean
}

// ─── Labels ────────────────────────────────────────────────────

const KIND_LABEL: Record<MockExecutionKind, string> = {
  mock_not_ready: "Not ready",
  mock_prepared: "Prepared (mock)",
  mock_blocked: "Blocked",
  mock_failed: "Failed (mock)",
}

// ─── Builder ────────────────────────────────────────────────────

/**
 * Build a safe, display-only mock execution model from
 * dry-run verification state and command envelope metadata.
 *
 * NEVER performs execution or side effects.
 * sideEffectPolicy is always "none".
 * canRunRealExecution is always false.
 */
export function buildMockExecutionModel(
  input: MockExecutionInput,
): MockExecutionModel {
  const requestedActionTypeLabel = input.requestedActionType ?? "Not available"
  const actionCount = Math.max(0, input.actionCount)
  const workUnitId = input.workUnitId || null

  switch (input.dryRunStatus) {
    case "verified":
      // Dry-run passed but external execution is blocked by default
      return {
        kind: input.externalExecutionEnabled ? "mock_prepared" : "mock_blocked",
        mode: "mock_internal",
        statusLabel: input.externalExecutionEnabled ? KIND_LABEL.mock_prepared : KIND_LABEL.mock_blocked,
        reason: input.externalExecutionEnabled
          ? "Mock execution can proceed since external execution is enabled. Real execution remains unavailable in this release."
          : "External execution is disabled by kill switch. Mock execution cannot proceed.",
        workUnitId,
        actionCount,
        requestedActionType: input.requestedActionType,
        requestedActionTypeLabel,
        sideEffectPolicy: "none",
        canRunRealExecution: false,
      }

    case "blocked":
      return {
        kind: "mock_blocked",
        mode: "mock_internal",
        statusLabel: KIND_LABEL.mock_blocked,
        reason: input.dryRunReason || input.envelopeBlockedReason || "Execution is blocked.",
        workUnitId,
        actionCount,
        requestedActionType: input.requestedActionType,
        requestedActionTypeLabel,
        sideEffectPolicy: "none",
        canRunRealExecution: false,
      }

    case "not_ready":
      return {
        kind: "mock_not_ready",
        mode: "mock_internal",
        statusLabel: KIND_LABEL.mock_not_ready,
        reason: input.dryRunReason || "Approval or preview conditions are not met.",
        workUnitId,
        actionCount,
        requestedActionType: input.requestedActionType,
        requestedActionTypeLabel,
        sideEffectPolicy: "none",
        canRunRealExecution: false,
      }

    case "failed":
      return {
        kind: "mock_failed",
        mode: "mock_internal",
        statusLabel: KIND_LABEL.mock_failed,
        reason: input.dryRunReason || "Verification failed.",
        workUnitId,
        actionCount,
        requestedActionType: input.requestedActionType,
        requestedActionTypeLabel,
        sideEffectPolicy: "none",
        canRunRealExecution: false,
      }

    default:
      return {
        kind: "mock_not_ready",
        mode: "mock_internal",
        statusLabel: KIND_LABEL.mock_not_ready,
        reason: "Unknown dry-run status.",
        workUnitId,
        actionCount,
        requestedActionType: input.requestedActionType,
        requestedActionTypeLabel,
        sideEffectPolicy: "none",
        canRunRealExecution: false,
      }
  }
}
