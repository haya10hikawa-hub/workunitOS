import test from "node:test"
import assert from "node:assert/strict"
import {
  buildMockExecutionModel,
  type MockExecutionInput,
} from "../app/lib/application/dashboard/mockExecutionModel.ts"

// ─── Fixtures ───────────────────────────────────────────────────

function input(overrides: Partial<MockExecutionInput> = {}): MockExecutionInput {
  return {
    dryRunStatus: "verified",
    dryRunReason: "Execution would be allowed.",
    actionCount: 2,
    requestedActionType: "slack_reply",
    envelopeMode: "blocked",
    envelopeBlockedReason: "External execution is blocked by kill switch.",
    workUnitId: "wu:1",
    previewRefCount: 2,
    externalExecutionEnabled: false,
    ...overrides,
  }
}

// ─── Kind mapping ──────────────────────────────────────────────

test("verified + externalExecutionEnabled false → mock_blocked", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "verified", externalExecutionEnabled: false }))
  assert.equal(m.kind, "mock_blocked")
  assert.equal(m.statusLabel, "Blocked")
  assert.equal(m.canRunRealExecution, false)
  assert.equal(m.sideEffectPolicy, "none")
})

test("verified + externalExecutionEnabled true → mock_prepared", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "verified", externalExecutionEnabled: true }))
  assert.equal(m.kind, "mock_prepared")
  assert.equal(m.statusLabel, "Prepared (mock)")
  assert.equal(m.canRunRealExecution, false)
  assert.equal(m.sideEffectPolicy, "none")
})

test("blocked → mock_blocked", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "blocked", dryRunReason: "kill switch active" }))
  assert.equal(m.kind, "mock_blocked")
  assert.equal(m.statusLabel, "Blocked")
})

test("not_ready → mock_not_ready", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "not_ready", dryRunReason: "no approval" }))
  assert.equal(m.kind, "mock_not_ready")
  assert.equal(m.statusLabel, "Not ready")
})

test("failed → mock_failed", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "failed", dryRunReason: "network error" }))
  assert.equal(m.kind, "mock_failed")
  assert.equal(m.statusLabel, "Failed (mock)")
})

// ─── requestedActionType handling ──────────────────────────────

test("requestedActionType string displays as-is", () => {
  const m = buildMockExecutionModel(input({ requestedActionType: "github_issue" }))
  assert.equal(m.requestedActionType, "github_issue")
  assert.equal(m.requestedActionTypeLabel, "github_issue")
})

test("requestedActionType null displays Not available", () => {
  const m = buildMockExecutionModel(input({ requestedActionType: null }))
  assert.equal(m.requestedActionType, null)
  assert.equal(m.requestedActionTypeLabel, "Not available")
})

// ─── actionCount ───────────────────────────────────────────────

test("actionCount is preserved", () => {
  const m = buildMockExecutionModel(input({ actionCount: 3 }))
  assert.equal(m.actionCount, 3)
})

test("negative actionCount is normalized to 0", () => {
  const m = buildMockExecutionModel(input({ actionCount: -1 }))
  assert.equal(m.actionCount, 0)
})

// ─── workUnitId ────────────────────────────────────────────────

test("empty workUnitId becomes null", () => {
  const m = buildMockExecutionModel(input({ workUnitId: "" }))
  assert.equal(m.workUnitId, null)
})

test("workUnitId is preserved as string", () => {
  const m = buildMockExecutionModel(input({ workUnitId: "wu:test" }))
  assert.equal(m.workUnitId, "wu:test")
})

// ─── Always-safe invariants ────────────────────────────────────

test("sideEffectPolicy is always none", () => {
  const statuses: MockExecutionInput["dryRunStatus"][] = ["verified", "blocked", "not_ready", "failed"]
  for (const s of statuses) {
    const m = buildMockExecutionModel(input({ dryRunStatus: s }))
    assert.equal(m.sideEffectPolicy, "none", `sideEffectPolicy should be none for ${s}`)
  }
})

test("canRunRealExecution is always false", () => {
  const statuses: MockExecutionInput["dryRunStatus"][] = ["verified", "blocked", "not_ready", "failed"]
  for (const s of statuses) {
    const m = buildMockExecutionModel(input({ dryRunStatus: s, externalExecutionEnabled: true }))
    assert.equal(m.canRunRealExecution, false, `canRunRealExecution should be false for ${s}`)
  }
})

test("mode is always mock_internal", () => {
  const statuses: MockExecutionInput["dryRunStatus"][] = ["verified", "blocked", "not_ready", "failed"]
  for (const s of statuses) {
    const m = buildMockExecutionModel(input({ dryRunStatus: s }))
    assert.equal(m.mode, "mock_internal", `mode should be mock_internal for ${s}`)
  }
})

// ─── No forbidden fields ───────────────────────────────────────

test("mock model output has no forbidden fields", () => {
  const m = buildMockExecutionModel(input())
  const flat = JSON.stringify(m)
  assert.equal(flat.includes("approvalId"), false)
  assert.equal(flat.includes("targetHash"), false)
  assert.equal(flat.includes("payloadHash"), false)
  assert.equal(flat.includes("tenantId"), false)
  assert.equal(flat.includes("actorUserId"), false)
  assert.equal(flat.includes("approvedByUserId"), false)
  assert.equal(flat.includes("role"), false)
  assert.equal(flat.includes("token"), false)
  assert.equal(flat.includes("secret"), false)
  assert.equal(flat.includes("rawPayload"), false)
  assert.equal(flat.includes("rawBody"), false)
  assert.equal(flat.includes("stack"), false)
})

test("mock model output only has safe fields", () => {
  const m = buildMockExecutionModel(input())
  const keys = Object.keys(m).sort()
  assert.deepEqual(keys, [
    "actionCount",
    "canRunRealExecution",
    "kind",
    "mode",
    "reason",
    "requestedActionType",
    "requestedActionTypeLabel",
    "sideEffectPolicy",
    "statusLabel",
    "workUnitId",
  ])
})

// ─── Reason fallbacks ──────────────────────────────────────────

test("blocked uses dryRunReason when available", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "blocked", dryRunReason: "specific block reason" }))
  assert.equal(m.reason, "specific block reason")
})

test("blocked falls back to envelopeBlockedReason", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "blocked", dryRunReason: "", envelopeBlockedReason: "envelope says blocked" }))
  assert.equal(m.reason, "envelope says blocked")
})

test("not_ready uses safe default when no reason", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "not_ready", dryRunReason: "" }))
  assert.equal(m.reason.includes("not met"), true)
})

test("failed uses safe default when no reason", () => {
  const m = buildMockExecutionModel(input({ dryRunStatus: "failed", dryRunReason: "" }))
  assert.equal(m.reason.includes("failed"), true)
})
