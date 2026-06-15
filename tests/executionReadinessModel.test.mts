import test from "node:test"
import assert from "node:assert/strict"
import {
  computeExecutionReadiness,
  buildExecutionReadinessTrace,
  READINESS_TRACE_TEXT,
  type ReadinessInput,
} from "../app/lib/application/dashboard/executionReadinessModel.ts"
import type { DashboardApprovalStatus } from "../app/lib/application/dashboard/dashboardApprovalStatusClient.ts"

// ─── Fixtures ───────────────────────────────────────────────────

function baseInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    selectedWorkUnitId: "wu:1",
    previewCreated: false,
    previewStatus: "idle",
    previewRefCount: 0,
    approvalStatus: null,
    approvalLoading: false,
    approvalError: false,
    externalExecutionEnabled: false,
    ...overrides,
  }
}

function makeApproval(overrides: Partial<DashboardApprovalStatus> = {}): DashboardApprovalStatus {
  return {
    workUnitId: "wu:1",
    latestApprovalId: null,
    latestActionPreviewId: null,
    status: "none",
    approved: false,
    rejected: false,
    expired: false,
    used: false,
    createdAt: null,
    expiresAt: null,
    usedAt: null,
    ...overrides,
  }
}

// ─── Blocked states ────────────────────────────────────────────

test("no WorkUnit → not ready", () => {
  const r = computeExecutionReadiness(baseInput({ selectedWorkUnitId: "" }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "no_workunit_selected")
})

test("preview not created → not ready", () => {
  const r = computeExecutionReadiness(baseInput({ previewCreated: false }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "preview_required")
})

test("preview failed → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: false,
    previewStatus: "failed",
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "preview_failed")
})

test("preview created but no approval data → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: null,
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_required")
})

test("approval still loading → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalLoading: true,
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_required")
})

test("approval fetch error → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalError: true,
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_status_unavailable")
})

test("approval none → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({ status: "none" }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_required")
})

test("approval pending → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({ status: "pending" }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_pending")
})

test("approval rejected → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({ status: "rejected", rejected: true }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_rejected")
})

test("approval expired → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({ status: "expired", expired: true }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_expired")
})

test("approval used → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({ status: "used", used: true }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_used")
})

test("approved but external execution blocked by default → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({
      status: "approved",
      approved: true,
      used: false,
      expired: false,
    }),
    externalExecutionEnabled: false,
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "execution_blocked")
})

test("approved + externalExecutionEnabled → ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({
      status: "approved",
      approved: true,
      used: false,
      expired: false,
    }),
    externalExecutionEnabled: true,
  }))
  assert.equal(r.ready, true)
  assert.equal(r.traceStatus, "execution_ready")
  assert.equal(r.reason, "Ready for execution.")
})

test("approved but used=true → not ready even if status is approved", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({
      status: "approved",
      approved: true,
      used: true,
      expired: false,
    }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_used")
})

test("approved but expired=true → not ready", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({
      status: "approved",
      approved: true,
      used: false,
      expired: true,
    }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_expired")
})

// ─── Cannot fabricate readiness from local state ───────────────

test("previewCreated alone cannot fabricate readiness", () => {
  // Even with previewCreated=true, without server approval, not ready
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: null,
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "approval_required")
})

test("no preview refs means not ready even if preview claimed created", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 0,
    approvalStatus: makeApproval({ status: "approved", approved: true }),
  }))
  assert.equal(r.ready, false)
  assert.equal(r.traceStatus, "preview_required")
})

// ─── buildExecutionReadinessTrace ──────────────────────────────

test("buildExecutionReadinessTrace returns display-safe output", () => {
  const trace = buildExecutionReadinessTrace(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({
      status: "approved",
      approved: true,
      used: false,
      expired: false,
    }),
    externalExecutionEnabled: false,
  }))
  assert.equal(trace.label, "External Execution Allowed")
  assert.equal(trace.checked, false)
  assert.equal(trace.traceStatus, "execution_blocked")
  assert.equal(trace.traceText.includes("disabled"), true)
})

test("buildExecutionReadinessTrace for no WorkUnit", () => {
  const trace = buildExecutionReadinessTrace(baseInput({ selectedWorkUnitId: "" }))
  assert.equal(trace.checked, false)
  assert.equal(trace.traceStatus, "no_workunit_selected")
})

// ─── All trace statuses have text ──────────────────────────────

test("README_TRACE_TEXT covers all statuses", () => {
  const statuses = [
    "no_workunit_selected",
    "preview_required",
    "preview_failed",
    "approval_required",
    "approval_pending",
    "approval_rejected",
    "approval_expired",
    "approval_used",
    "approval_status_unavailable",
    "execution_blocked",
    "execution_ready",
  ] as const
  for (const s of statuses) {
    assert.ok(typeof READINESS_TRACE_TEXT[s] === "string", `missing text for ${s}`)
  }
})

// ─── No forbidden fields in output ────────────────────────────

test("computeExecutionReadiness output has no hashes/tenant/errors", () => {
  const r = computeExecutionReadiness(baseInput({
    previewCreated: true,
    previewStatus: "created",
    previewRefCount: 1,
    approvalStatus: makeApproval({ status: "approved", approved: true }),
  }))
  const flat = JSON.stringify(r)
  assert.equal(flat.includes("targetHash"), false)
  assert.equal(flat.includes("payloadHash"), false)
  assert.equal(flat.includes("tenantId"), false)
  assert.equal(flat.includes("actorUserId"), false)
  assert.equal(flat.includes("stack"), false)
})
