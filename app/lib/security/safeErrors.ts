/**
 * Safe error response helpers.
 *
 * All API error responses must use these helpers. They return standardized
 * JSON bodies without leaking stack traces, internal validation details,
 * environment values, tokens, or implementation details.
 *
 * Error codes and their HTTP statuses are defined here as the canonical source.
 * ERROR_MODEL.md provides the full specification for each code.
 */

export const SAFE_ERROR_CODES = {
  invalid_request:              { status: 400, message: "invalid_request" },
  unauthorized:                 { status: 401, message: "unauthorized" },
  forbidden:                    { status: 403, message: "forbidden" },
  tenant_boundary_violation:    { status: 403, message: "tenant_boundary_violation" },
  external_actions_disabled:    { status: 403, message: "external_actions_disabled" },
  approval_required:            { status: 403, message: "approval_required" },
  approval_expired:             { status: 403, message: "approval_expired" },
  approval_used:                { status: 409, message: "approval_used" },
  approval_payload_mismatch:    { status: 409, message: "approval_payload_mismatch" },
  approval_target_mismatch:     { status: 409, message: "approval_target_mismatch" },
  integration_missing:          { status: 503, message: "integration_missing" },
  conflict:                     { status: 409, message: "conflict" },
  rate_limited:                 { status: 429, message: "rate_limited" },
  internal_error:               { status: 500, message: "internal_error" },
} as const

export type SafeErrorCode = keyof typeof SAFE_ERROR_CODES

/** Standard API failure response envelope. Matches ERROR_MODEL.md Section 3. */
export type ApiFailure = {
  ok: false
  requestId: string
  error: SafeErrorCode
}

/**
 * Build a safe error response.
 *
 * @param requestId — client or server-generated request identifier
 * @param code — one of the 14 canonical safe error codes
 */
export function safeError(requestId: string, code: SafeErrorCode): ApiFailure {
  return { ok: false, requestId, error: code }
}

/**
 * Type guard: check if a string is a valid SafeErrorCode.
 * Use this before mapping unknown strings (e.g. from error messages)
 * onto the safe error vocabulary.
 */
export function isSafeErrorCode(value: string): value is SafeErrorCode {
  return value in SAFE_ERROR_CODES
}

/**
 * Get the HTTP status for a safe error code.
 */
export function getSafeErrorStatus(code: SafeErrorCode): number {
  return SAFE_ERROR_CODES[code].status
}

/**
 * Map an internal error string to a safe error code.
 *
 * Routes/provider-specific strings that should not be exposed to the client
 * are mapped to canonical safe codes. Unknown strings fall through to
 * `internal_error`.
 *
 * Mapping:
 *   "external_tool_not_configured:*"  → integration_missing
 *   "external_config_missing:*"       → integration_missing
 *   "external_actions_disabled"       → external_actions_disabled
 *   "external_action_not_approved"    → approval_required
 *   "approval_expired"                → approval_expired
 *   "approval_used"                   → approval_used
 *   "approval_payload_mismatch"       → approval_payload_mismatch
 *   "approval_target_mismatch"        → approval_target_mismatch
 *   "conflict"                        → conflict
 *   anything else                     → internal_error
 */
export function toSafeErrorCode(internalError: string): SafeErrorCode {
  if (isSafeErrorCode(internalError)) return internalError

  if (internalError.startsWith("external_tool_not_configured:")) return "integration_missing"
  if (internalError.startsWith("external_config_missing:"))       return "integration_missing"
  if (internalError === "external_action_not_approved")           return "approval_required"

  return "internal_error"
}
