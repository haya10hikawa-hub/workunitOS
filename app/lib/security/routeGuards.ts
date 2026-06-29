/**
 * Shared route-level security guards.
 *
 * Consolidates checks that were previously duplicated (and subtly divergent)
 * across API route handlers, closing the gaps the red team found:
 *   - C-11: `hasClientOwnedFields` was case-sensitive, so `TargetHash` /
 *     `Status` bypassed the mass-assignment guard. Now matched case-insensitively.
 *   - D-6: `x-request-id` was reflected verbatim into responses/audit, allowing
 *     control-character / CRLF injection. Now sanitized and length-capped.
 *   - B-1 (support): a single source of truth for "is this preview expired".
 */

// Server-owned fields a client must never supply on a state-changing request.
// Union of every route's historical list, matched case-insensitively.
const CLIENT_OWNED_FIELDS: ReadonlySet<string> = new Set([
  "targethash",
  "payloadhash",
  "tenantid",
  "userid",
  "approvedbyuserid",
  "approvedbypm",
  "status",
  "usedat",
  "createdby",
  "createdbyuserid",
])

/**
 * True when the request body contains any server-owned field (mass-assignment
 * / parameter-tampering attempt). Comparison is case-insensitive.
 */
export function hasClientOwnedFields(body: Record<string, unknown>): boolean {
  for (const key of Object.keys(body)) {
    if (CLIENT_OWNED_FIELDS.has(key.toLowerCase())) return true
  }
  return false
}

/**
 * True when a stored preview's `expiresAt` is absent/invalid or already in the
 * past. Fail-closed: an unparseable timestamp is treated as expired.
 */
export function isPreviewExpired(expiresAt: string | undefined | null, now: number = Date.now()): boolean {
  if (!expiresAt) return true
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts)) return true
  return ts <= now
}

const REQUEST_ID_HEADER = "x-request-id"
const MAX_REQUEST_ID_LENGTH = 200
// C0 control characters (incl. CR/LF/TAB) and DEL — built from escapes so no
// literal control bytes live in source.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g")

/**
 * Resolve a request id from the inbound header, stripped of control characters
 * (incl. CR/LF) and length-capped, or generate a server-side fallback. Prevents
 * log/response injection via attacker-controlled `x-request-id`.
 */
export function resolveRequestId(request: Request): string {
  const raw = request.headers.get(REQUEST_ID_HEADER)
  if (raw) {
    const cleaned = raw.replace(CONTROL_CHARS, "").trim().slice(0, MAX_REQUEST_ID_LENGTH)
    if (cleaned.length > 0) return cleaned
  }
  return `req:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
}
