import test from "node:test"
import assert from "node:assert/strict"
import {
  getActionFieldErrorState,
  isRecoverableError,
  isExecutionBlockingError,
  type ActionFieldErrorState,
} from "../app/lib/application/actionField/errorState.ts"
import { SAFE_ERROR_CODES, type SafeErrorCode } from "../app/lib/security/safeErrors.ts"

const allCodes = Object.keys(SAFE_ERROR_CODES) as SafeErrorCode[]

test("getActionFieldErrorState covers all 14 safe error codes", () => {
  for (const code of allCodes) {
    const state = getActionFieldErrorState(code)
    assert.ok(state, `Missing mapping for ${code}`)
    assert.equal(typeof state, "string")
  }
})

test("invalid_request maps to editable_correction", () => {
  assert.equal(getActionFieldErrorState("invalid_request"), "editable_correction")
})

test("approval_required maps to approval_needed", () => {
  assert.equal(getActionFieldErrorState("approval_required"), "approval_needed")
})

test("approval_payload_mismatch maps to approval_invalidated", () => {
  assert.equal(getActionFieldErrorState("approval_payload_mismatch"), "approval_invalidated")
})

test("approval_target_mismatch maps to approval_invalidated", () => {
  assert.equal(getActionFieldErrorState("approval_target_mismatch"), "approval_invalidated")
})

test("external_actions_disabled maps to policy_disabled", () => {
  assert.equal(getActionFieldErrorState("external_actions_disabled"), "policy_disabled")
})

test("integration_missing maps to integration_required", () => {
  assert.equal(getActionFieldErrorState("integration_missing"), "integration_required")
})

test("internal_error maps to generic_error", () => {
  assert.equal(getActionFieldErrorState("internal_error"), "generic_error")
})

test("isRecoverableError identifies user-recoverable errors", () => {
  assert.equal(isRecoverableError("invalid_request"), true)
  assert.equal(isRecoverableError("approval_required"), true)
  assert.equal(isRecoverableError("approval_expired"), true)
  assert.equal(isRecoverableError("approval_payload_mismatch"), true)
  assert.equal(isRecoverableError("approval_target_mismatch"), true)
  assert.equal(isRecoverableError("conflict"), true)
  assert.equal(isRecoverableError("rate_limited"), true)
  // Non-recoverable
  assert.equal(isRecoverableError("forbidden"), false)
  assert.equal(isRecoverableError("internal_error"), false)
  assert.equal(isRecoverableError("external_actions_disabled"), false)
  assert.equal(isRecoverableError("integration_missing"), false)
})

test("isExecutionBlockingError identifies errors that block external execution", () => {
  assert.equal(isExecutionBlockingError("external_actions_disabled"), true)
  assert.equal(isExecutionBlockingError("approval_required"), true)
  assert.equal(isExecutionBlockingError("approval_expired"), true)
  assert.equal(isExecutionBlockingError("approval_used"), true)
  assert.equal(isExecutionBlockingError("approval_payload_mismatch"), true)
  assert.equal(isExecutionBlockingError("approval_target_mismatch"), true)
  assert.equal(isExecutionBlockingError("integration_missing"), true)
  assert.equal(isExecutionBlockingError("forbidden"), true)
  assert.equal(isExecutionBlockingError("tenant_boundary_violation"), true)
  // Not blocking
  assert.equal(isExecutionBlockingError("invalid_request"), false)
  assert.equal(isExecutionBlockingError("rate_limited"), false)
  assert.equal(isExecutionBlockingError("internal_error"), false)
})

test("all states are valid ActionFieldErrorState literals", () => {
  const validStates: ActionFieldErrorState[] = [
    "editable_correction", "login_required", "permission_denied",
    "policy_disabled", "approval_needed", "approval_expired_state",
    "approval_used_state", "approval_invalidated", "integration_required",
    "conflict_state", "rate_limited_state", "generic_error",
  ]
  for (const code of allCodes) {
    assert.ok(validStates.includes(getActionFieldErrorState(code)))
  }
})
