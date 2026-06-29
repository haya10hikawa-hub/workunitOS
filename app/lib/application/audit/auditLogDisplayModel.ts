/**
 * Audit log display model.
 *
 * Active UI surfaces must never render raw internal identifiers. The audit log
 * carries an internal actorUserId and free-form metadata; this module maps them
 * to display-safe values:
 *   - deriveAuditActorLabel: a generic actor label instead of the raw id.
 *   - redactAuditMetadata: drops any forbidden internal keys before rendering.
 *
 * Pure functions, no IO, no forbidden field emission.
 */

export type AuditActorInput = {
  readonly actorUserId?: string | null
}

// Internal identifiers / hashes / secrets that must never reach an active UI.
// This is a deliberately small, exact-match render subset; the canonical backend
// policy (P0_FORBIDDEN_CONTEXT_KEYS / isForbiddenContextKey in
// app/lib/application/safety/p0Policy.ts) is broader and normalized. Keep them in
// sync if the canonical list grows.
const FORBIDDEN_METADATA_KEYS: ReadonlySet<string> = new Set([
  "actorUserId",
  "tenantId",
  "approvalId",
  "targetHash",
  "payloadHash",
  "role",
  "rawPayload",
  "providerPayload",
  "token",
  "secret",
  "authorization",
  "cookie",
])

/**
 * Returns a display-safe actor label, or null when there is no actor. Never
 * returns the raw actorUserId — the label only signals that an internal actor
 * performed the action.
 */
export function deriveAuditActorLabel(row: AuditActorInput): string | null {
  return row.actorUserId ? "Internal actor" : null
}

/**
 * Returns audit metadata with any forbidden internal keys removed, so the
 * rendered summary cannot leak ids/hashes/secrets even if the server includes
 * them.
 */
export function redactAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !FORBIDDEN_METADATA_KEYS.has(key)),
  )
}
