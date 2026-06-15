import test from "node:test"
import assert from "node:assert/strict"
import {
  buildExecutionResultViewer,
  type ExecutionResultViewerInput,
} from "../app/lib/application/dashboard/executionResultViewerModel.ts"

// ─── Fixtures ───────────────────────────────────────────────────

function input(
  overrides: Partial<ExecutionResultViewerInput> = {},
): ExecutionResultViewerInput {
  return {
    dryRunStatus: "idle",
    dryRunMessage: null,
    dryRunActionCount: 0,
    dryRunActionType: null,
    ...overrides,
  }
}

// ─── Kind mapping ──────────────────────────────────────────────

test("idle maps to idle", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "idle" }))
  assert.equal(v.kind, "idle")
  assert.equal(v.title, "")
})

test("running maps to running", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "running", dryRunMessage: "verifying..." }))
  assert.equal(v.kind, "running")
  assert.equal(v.statusLabel, "Running")
  assert.equal(v.canClear, false)
  assert.equal(v.canRerun, false)
})

test("verified maps to dry_run_verified", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "verified", dryRunMessage: "allowed", dryRunActionCount: 2, dryRunActionType: "slack_reply" }))
  assert.equal(v.kind, "dry_run_verified")
  assert.equal(v.statusLabel, "Verified")
  assert.equal(v.reason, "allowed")
  assert.equal(v.actionCount, 2)
  assert.equal(v.requestedActionType, "slack_reply")
  assert.equal(v.requestedActionTypeLabel, "slack_reply")
  assert.equal(v.canClear, true)
  assert.equal(v.canRerun, true)
})

test("blocked maps to dry_run_blocked", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "blocked", dryRunMessage: "kill switch active" }))
  assert.equal(v.kind, "dry_run_blocked")
  assert.equal(v.statusLabel, "Blocked")
})

test("not_ready maps to dry_run_not_ready", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "not_ready", dryRunMessage: "no approval" }))
  assert.equal(v.kind, "dry_run_not_ready")
  assert.equal(v.statusLabel, "Not ready")
})

test("failed maps to dry_run_failed", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "failed", dryRunMessage: "network error" }))
  assert.equal(v.kind, "dry_run_failed")
  assert.equal(v.statusLabel, "Failed")
})

// ─── requestedActionType handling ──────────────────────────────

test("requestedActionType string displays as-is", () => {
  const v = buildExecutionResultViewer(input({
    dryRunStatus: "verified",
    dryRunMessage: "ok",
    dryRunActionType: "github_issue",
  }))
  assert.equal(v.requestedActionType, "github_issue")
  assert.equal(v.requestedActionTypeLabel, "github_issue")
})

test("requestedActionType null displays Not available", () => {
  const v = buildExecutionResultViewer(input({
    dryRunStatus: "blocked",
    dryRunMessage: "blocked",
    dryRunActionType: null,
  }))
  assert.equal(v.requestedActionType, null)
  assert.equal(v.requestedActionTypeLabel, "Not available")
})

// ─── actionCount ───────────────────────────────────────────────

test("actionCount is preserved", () => {
  const v = buildExecutionResultViewer(input({
    dryRunStatus: "verified",
    dryRunMessage: "ok",
    dryRunActionCount: 3,
  }))
  assert.equal(v.actionCount, 3)
})

test("running does not expose actionCount", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "running", dryRunMessage: "..." }))
  assert.equal(v.actionCount, null)
})

// ─── No forbidden fields ───────────────────────────────────────

test("viewer model has no forbidden fields — idle", () => {
  const v = buildExecutionResultViewer(input({ dryRunStatus: "idle" }))
  const flat = JSON.stringify(v)
  assert.equal(flat.includes("approvalId"), false)
  assert.equal(flat.includes("targetHash"), false)
  assert.equal(flat.includes("payloadHash"), false)
  assert.equal(flat.includes("tenantId"), false)
  assert.equal(flat.includes("actorUserId"), false)
  assert.equal(flat.includes("role"), false)
  assert.equal(flat.includes("token"), false)
  assert.equal(flat.includes("secret"), false)
  assert.equal(flat.includes("rawPayload"), false)
})

test("viewer model has no forbidden fields — verified", () => {
  const v = buildExecutionResultViewer(input({
    dryRunStatus: "verified",
    dryRunMessage: "ok",
    dryRunActionType: "slack_reply",
  }))
  const flat = JSON.stringify(v)
  assert.equal(flat.includes("approvalId"), false)
  assert.equal(flat.includes("targetHash"), false)
  assert.equal(flat.includes("payloadHash"), false)
  assert.equal(flat.includes("tenantId"), false)
  assert.equal(flat.includes("stack"), false)
})

test("viewer model only has safe fields", () => {
  const v = buildExecutionResultViewer(input({
    dryRunStatus: "blocked",
    dryRunMessage: "blocked",
    dryRunActionCount: 1,
    dryRunActionType: "slack_reply",
  }))
  const keys = Object.keys(v).sort()
  assert.deepEqual(keys, [
    "actionCount",
    "canClear",
    "canRerun",
    "kind",
    "reason",
    "requestedActionType",
    "requestedActionTypeLabel",
    "statusLabel",
    "title",
  ])
})
