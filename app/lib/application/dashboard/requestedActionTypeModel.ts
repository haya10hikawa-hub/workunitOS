/**
 * Requested Action Type Model
 *
 * Pure functions that derive a canonical machine-readable action type
 * from safe WorkUnit metadata. The output is suitable for use in
 * execution command envelopes.
 *
 * Security:
 * - No React, D1, repository, route handler, or raw external client imports.
 * - No `any` types.
 * - No hashes, tenantId, actorUserId, approvalId, or raw server errors.
 * - Deterministic output for a given input.
 * - Does not use natural-language text (e.g. "Reply in Slack thread")
 *   as machine action type.
 */

// ─── Public types ──────────────────────────────────────────────

/** Canonical safe action type codes for execution command envelopes. */
export type RequestedActionTypeCode =
  | "slack_reply"
  | "github_issue"
  | "calendar_block"
  | "email_send"
  | "database_update"

export type DeriveActionTypeInput = {
  /** Source provider from the WorkUnit (e.g. "slack", "github", "calendar"). */
  readonly sourceProvider: string
  /** True when repository info is available (needed for github_issue). */
  readonly hasRepository: boolean
}

// ─── Derive ────────────────────────────────────────────────────

/**
 * Derive a canonical machine-readable action type from safe WorkUnit metadata.
 * Returns null when the source provider is not recognized or cannot safely
 * produce a known action type code.
 *
 * Never returns natural-language text such as "Reply in Slack thread".
 * That text belongs in `recommendedAction` / display text, not here.
 */
export function deriveRequestedActionType(
  input: DeriveActionTypeInput,
): RequestedActionTypeCode | null {
  switch (input.sourceProvider) {
    case "slack":
      return "slack_reply"
    case "calendar":
      return "calendar_block"
    case "github":
      // github_issue requires repository context
      return input.hasRepository ? "github_issue" : "database_update"
    case "email":
    case "gmail":
      return "email_send"
    default:
      // Unknown or unsupported provider — no canonical type available
      return null
  }
}
