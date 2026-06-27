/**
 * Canonical Action Field application-level error mapping.
 * UI consumes these states; server error vocabulary stays in security/safeErrors.
 */

import type { SafeErrorCode } from "../../security/safeErrors.ts"

export type ActionFieldErrorState =
  | "editable_correction"
  | "login_required"
  | "permission_denied"
  | "policy_disabled"
  | "approval_needed"
  | "approval_expired_state"
  | "approval_used_state"
  | "approval_invalidated"
  | "integration_required"
  | "conflict_state"
  | "rate_limited_state"
  | "generic_error"

const ERROR_STATE_MAP: Record<SafeErrorCode, ActionFieldErrorState> = {
  invalid_request: "editable_correction",
  unauthorized: "login_required",
  forbidden: "permission_denied",
  csrf_failed: "permission_denied",
  invalid_origin: "permission_denied",
  tenant_boundary_violation: "permission_denied",
  external_actions_disabled: "policy_disabled",
  approval_required: "approval_needed",
  approval_expired: "approval_expired_state",
  approval_used: "approval_used_state",
  approval_payload_mismatch: "approval_invalidated",
  approval_target_mismatch: "approval_invalidated",
  integration_missing: "integration_required",
  conflict: "conflict_state",
  rate_limited: "rate_limited_state",
  internal_error: "generic_error",
}

export function getActionFieldErrorState(code: SafeErrorCode): ActionFieldErrorState {
  return ERROR_STATE_MAP[code]
}

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
