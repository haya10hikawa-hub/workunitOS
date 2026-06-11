/**
 * Trust boundary types for WorkUnit OS.
 *
 * These types make the data pipeline's security boundaries explicit:
 *
 *   Untrusted Source → Sanitized Candidate → WorkUnit Draft → Human Approval → Execution → Result
 *
 * Each stage carries a different trust level. Code must never treat
 * untrusted source content as trusted — boundaries are enforced by the
 * type system, not comments.
 */

import type { SourceHopperEvent, SanitizedWorkUnitCandidate, WorkUnitDraft } from "../types/sourceHopper"
import type { ExecutionResultLog, ExecutionApproval } from "./workUnitExecution"

// --- Trust Levels ---

export type TrustLevel = "untrusted" | "sanitized" | "draft" | "approved" | "executed"

// --- Boundary 1: Untrusted Source Content ---

/** Raw, untrusted input from external sources. Must be sanitized before any use. */
export type UntrustedSourceContent = SourceHopperEvent & {
  readonly _trust: "untrusted"
}

/** Mark content as untrusted. All external input starts here. */
export function asUntrusted(event: SourceHopperEvent): UntrustedSourceContent {
  return { ...event, _trust: "untrusted" }
}

// --- Boundary 2: Sanitized Candidate Data ---

/** Data extracted from untrusted sources, safe for WorkUnit generation. */
export type SanitizedWorkUnitData = SanitizedWorkUnitCandidate & {
  readonly _trust: "sanitized"
}

// --- Boundary 3: WorkUnit Draft ---

/** AI-generated or system-generated structured work candidate. Not yet approved. */
export type WorkUnitDraftData = WorkUnitDraft & {
  readonly _trust: "draft"
}

// --- Boundary 4: Human Approval ---

/** A server-side approval concept — not a client flag. */
export type HumanApprovalDecision = ExecutionApproval & {
  readonly _trust: "approved"
}

// --- Boundary 5: Execution Command ---

/** A server-side generated command for external action execution. */
export type ExecutionCommandData = {
  readonly _trust: "executed"
  workUnitId: string
  actionType: string
  target: string
  payload: unknown
  approvedBy: string
  approvedAt: string
}

// --- Boundary 6: External Execution Result ---

/** Result returned from Slack, Gmail, GitHub, Calendar, or other providers. */
export type ExternalExecutionResult = ExecutionResultLog & {
  readonly _trust: "executed"
}

// --- Trust boundary assertions ---

/**
 * Assert that raw source content has been sanitized before passing to Core.
 * This is a compile-time + runtime guard.
 */
export function assertSanitized(
  candidate: SanitizedWorkUnitCandidate,
): SanitizedWorkUnitCandidate {
  if (!candidate.sourceRef || !candidate.sourceRef.externalId || !candidate.sourceRef.capturedAt) {
    throw new Error("Boundary violation: sourceRef is required on sanitized candidates")
  }
  return candidate
}

/**
 * All external execution targets (channels, repositories, recipients, calendars)
 * that the system may write to.
 */
export const EXTERNAL_EXECUTION_TARGETS = [
  "slack_reply",
  "gmail_reply",
  "github_issue",
  "google_calendar_event",
] as const

export type ExternalExecutionTarget = (typeof EXTERNAL_EXECUTION_TARGETS)[number]
