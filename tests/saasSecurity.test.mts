import test from "node:test"
import assert from "node:assert/strict"
import { validateToolBackendRequest } from "../app/lib/toolBackendValidation.ts"
import { areExternalActionsEnabled, isExternalOperation } from "../app/lib/security/externalActions.ts"
import { safeError, isSafeErrorCode, getSafeErrorStatus, toSafeErrorCode, SAFE_ERROR_CODES, type SafeErrorCode } from "../app/lib/security/safeErrors.ts"
import {
  assertTenantBoundary,
  createAnonymousDevelopmentTenantContext,
  requireTenantContext,
} from "../app/lib/tenant/types.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

// --- Validation tests ---

test("validateToolBackendRequest rejects non-object input", () => {
  assert.equal(validateToolBackendRequest(null).ok, false)
  assert.equal(validateToolBackendRequest("string").ok, false)
  assert.equal(validateToolBackendRequest([]).ok, false)
  assert.equal(validateToolBackendRequest(undefined).ok, false)
})

test("validateToolBackendRequest rejects missing id", () => {
  assert.equal(validateToolBackendRequest({ source: "slack", operation: "ingest" }).ok, false)
})

test("validateToolBackendRequest rejects invalid source", () => {
  assert.equal(validateToolBackendRequest({ id: "req-1", source: "unknown", operation: "ingest" }).ok, false)
})

test("validateToolBackendRequest rejects invalid operation for source", () => {
  // github only supports create_issue
  assert.equal(validateToolBackendRequest({ id: "req-2", source: "github", operation: "ingest" }).ok, false)
})

test("validateToolBackendRequest rejects ingest without event", () => {
  assert.equal(validateToolBackendRequest({ id: "req-1", source: "slack", operation: "ingest" }).ok, false)
})

test("validateToolBackendRequest rejects external op without draft", () => {
  assert.equal(validateToolBackendRequest({ id: "req-3", source: "github", operation: "create_issue" }).ok, false)
})

test("validateToolBackendRequest accepts valid ingest request", () => {
  const result = validateToolBackendRequest({
    id: "req-4",
    source: "slack",
    operation: "ingest",
    event: { id: "ev-1", source: "slack", title: "Test", timestamp: "2026-01-01T00:00:00Z" },
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.request.id, "req-4")
    assert.equal(result.request.source, "slack")
  }
})

test("validateToolBackendRequest strips approvedByPm and externalConfig", () => {
  const result = validateToolBackendRequest({
    id: "req-5",
    source: "slack",
    operation: "ingest",
    event: { id: "ev-1", source: "slack", title: "Test", timestamp: "2026-01-01T00:00:00Z" },
    approvedByPm: true,
    externalConfig: { slack: { channel: "#evil" } },
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal((result.request as Record<string, unknown>).approvedByPm, undefined)
    assert.equal((result.request as Record<string, unknown>).externalConfig, undefined)
  }
})

test("validateToolBackendRequest rejects oversized strings", () => {
  const result = validateToolBackendRequest({
    id: "x".repeat(20_000),
    source: "slack",
    operation: "ingest",
    event: { id: "ev-1", source: "slack", title: "Test", timestamp: "2026-01-01T00:00:00Z" },
  })
  assert.equal(result.ok, false)
})

// --- External actions kill switch ---

function testEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...process.env, ...overrides }
}

test("areExternalActionsEnabled returns false when env var not set", () => {
  assert.equal(areExternalActionsEnabled(testEnv()), false)
  assert.equal(areExternalActionsEnabled(testEnv({ EXTERNAL_ACTIONS_ENABLED: "false" })), false)
  assert.equal(areExternalActionsEnabled(testEnv({ EXTERNAL_ACTIONS_ENABLED: "1" })), false)
})

test("areExternalActionsEnabled returns true only for explicit 'true'", () => {
  assert.equal(areExternalActionsEnabled(testEnv({ EXTERNAL_ACTIONS_ENABLED: "true" })), true)
})

test("isExternalOperation correctly identifies external ops", () => {
  assert.equal(isExternalOperation("reply"), true)
  assert.equal(isExternalOperation("schedule"), true)
  assert.equal(isExternalOperation("create_issue"), true)
  assert.equal(isExternalOperation("ingest"), false)
  assert.equal(isExternalOperation("draft"), false)
  assert.equal(isExternalOperation("create_task"), false)
})

// --- Safe errors ---

test("safeError returns ApiFailure with requestId and error code", () => {
  const result = safeError("req-1", "invalid_request")
  assert.equal(result.ok, false)
  assert.equal(result.requestId, "req-1")
  assert.equal(result.error, "invalid_request")
})

test("safeError responses never leak internals", () => {
  const codes: SafeErrorCode[] = Object.keys(SAFE_ERROR_CODES) as SafeErrorCode[]
  for (const code of codes) {
    const result = safeError("req-1", code)
    assert.equal(result.ok, false)
    assert.equal(typeof result.error, "string")
    // Must not leak stack traces or internals
    assert.equal((result as Record<string, unknown>).stack, undefined)
    assert.equal((result as Record<string, unknown>).token, undefined)
    assert.equal((result as Record<string, unknown>).secret, undefined)
  }
})

test("all 16 safe error codes exist with correct HTTP statuses", () => {
  // Phase 5A added csrf_failed and invalid_origin (both 403) to the canonical set.
  assert.equal(Object.keys(SAFE_ERROR_CODES).length, 16)
  assert.equal(getSafeErrorStatus("invalid_request"), 400)
  assert.equal(getSafeErrorStatus("unauthorized"), 401)
  assert.equal(getSafeErrorStatus("forbidden"), 403)
  assert.equal(getSafeErrorStatus("csrf_failed"), 403)
  assert.equal(getSafeErrorStatus("invalid_origin"), 403)
  assert.equal(getSafeErrorStatus("tenant_boundary_violation"), 403)
  assert.equal(getSafeErrorStatus("external_actions_disabled"), 403)
  assert.equal(getSafeErrorStatus("approval_required"), 403)
  assert.equal(getSafeErrorStatus("approval_expired"), 403)
  assert.equal(getSafeErrorStatus("approval_used"), 409)
  assert.equal(getSafeErrorStatus("approval_payload_mismatch"), 409)
  assert.equal(getSafeErrorStatus("approval_target_mismatch"), 409)
  assert.equal(getSafeErrorStatus("conflict"), 409)
  assert.equal(getSafeErrorStatus("integration_missing"), 503)
  assert.equal(getSafeErrorStatus("rate_limited"), 429)
  assert.equal(getSafeErrorStatus("internal_error"), 500)
})

test("isSafeErrorCode rejects unknown strings", () => {
  assert.equal(isSafeErrorCode("invalid_request"), true)
  assert.equal(isSafeErrorCode("approval_payload_mismatch"), true)
  assert.equal(isSafeErrorCode("external_tool_not_configured:github"), false)
  assert.equal(isSafeErrorCode("random_string"), false)
  assert.equal(isSafeErrorCode(""), false)
})

test("toSafeErrorCode maps internal errors to safe codes", () => {
  assert.equal(toSafeErrorCode("external_tool_not_configured:github"), "integration_missing")
  assert.equal(toSafeErrorCode("external_config_missing:slack"), "integration_missing")
  assert.equal(toSafeErrorCode("external_actions_disabled"), "external_actions_disabled")
  assert.equal(toSafeErrorCode("external_action_not_approved"), "approval_required")
  assert.equal(toSafeErrorCode("some_unknown_error"), "internal_error")
})

test("toSafeErrorCode passes through already-safe codes", () => {
  assert.equal(toSafeErrorCode("invalid_request"), "invalid_request")
  assert.equal(toSafeErrorCode("forbidden"), "forbidden")
  assert.equal(toSafeErrorCode("rate_limited"), "rate_limited")
})

// --- Tenant boundary ---

test("assertTenantBoundary passes when tenants match", () => {
  const ctx = createAnonymousDevelopmentTenantContext()
  const result = assertTenantBoundary(ctx, "dev-tenant" as TenantId)
  assert.equal(result.ok, true)
})

test("assertTenantBoundary fails when tenants differ", () => {
  const ctx = createAnonymousDevelopmentTenantContext()
  const result = assertTenantBoundary(ctx, "other-tenant" as TenantId)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, "tenant_mismatch")
})

test("requireTenantContext returns null for missing context", () => {
  assert.equal(requireTenantContext(null), null)
  assert.equal(requireTenantContext(undefined), null)
})

test("requireTenantContext returns context when valid", () => {
  const ctx = createAnonymousDevelopmentTenantContext()
  assert.ok(requireTenantContext(ctx))
})
