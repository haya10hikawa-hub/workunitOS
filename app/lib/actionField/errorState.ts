/**
 * Action Field error-to-UI-state mapping.
 *
 * Maps canonical SafeErrorCodes to Action Field UI states defined in
 * ACTION_FIELD_SPEC.md Section 5 (State Model) and Section 11 (Error Model).
 *
 * This module is a foundation for the UI layer. It does not render UI.
 */

import type { SafeErrorCode } from "../security/safeErrors.ts"

// ─── Action Field UI State Categories ───────────────────────────

export type ActionFieldErrorState =
  | "editable_correction"       // User can fix input and resubmit
  | "login_required"            // Redirect to authentication
  | "permission_denied"         // Show role/permission badge, disable actions
  | "policy_disabled"           // Show system-policy banner
  | "approval_needed"           // Show approval request panel
  | "approval_expired_state"    // Show re-request button
  | "approval_used_state"       // Show already-executed with result link
  | "approval_invalidated"      // Show content/target changed warning
  | "integration_required"      // Show integration setup placeholder
  | "conflict_state"            // Show retry button
  | "rate_limited_state"        // Show countdown, disable temporarily
  | "generic_error"             // Show generic error with requestId

// ─── Mapping ────────────────────────────────────────────────────

const ERROR_STATE_MAP: Record<SafeErrorCode, ActionFieldErrorState> = {
  invalid_request:              "editable_correction",
  unauthorized:                 "login_required",
  forbidden:                    "permission_denied",
  tenant_boundary_violation:    "permission_denied",
  external_actions_disabled:    "policy_disabled",
  approval_required:            "approval_needed",
  approval_expired:             "approval_expired_state",
  approval_used:                "approval_used_state",
  approval_payload_mismatch:    "approval_invalidated",
  approval_target_mismatch:     "approval_invalidated",
  integration_missing:          "integration_required",
  conflict:                     "conflict_state",
  rate_limited:                 "rate_limited_state",
  internal_error:               "generic_error",
}

/** Map a SafeErrorCode to its Action Field UI state. */
export function getActionFieldErrorState(code: SafeErrorCode): ActionFieldErrorState {
  return ERROR_STATE_MAP[code]
}

/** Check whether the error allows the user to retry after a UI action. */
export function isRecoverableError(code: SafeErrorCode): boolean {
  switch (code) {
    case "invalid_request":
    case "approval_required":
    case "approval_expired":
    case "approval_payload_mismatch":
    case "approval_target_mismatch":
    case "conflict":
    case "rate_limited":
      return true
    default:
      return false
  }
}

/** Check whether the error blocks external execution entirely. */
export function isExecutionBlockingError(code: SafeErrorCode): boolean {
  switch (code) {
    case "external_actions_disabled":
    case "approval_required":
    case "approval_expired":
    case "approval_used":
    case "approval_payload_mismatch":
    case "approval_target_mismatch":
    case "integration_missing":
    case "forbidden":
    case "tenant_boundary_violation":
      return true
    default:
      return false
  }
}
