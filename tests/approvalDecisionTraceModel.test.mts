import test from "node:test"
import assert from "node:assert/strict"
import {
  computeApprovalTraceStatus,
  buildApprovalTraceEntry,
  isApprovalCompleted,
  type DecisionTraceApprovalInput,
} from "../app/lib/application/dashboard/approvalDecisionTraceModel.ts"
import type { DashboardApprovalStatus } from "../app/lib/application/dashboard/dashboardApprovalStatusClient.ts"

// ─── Fixtures ───────────────────────────────────────────────────

function baseInput(overrides: Partial<DecisionTraceApprovalInput> = {}): DecisionTraceApprovalInput {
  return {
    approvalStatus: null,
    approvalLoading: false,
    approvalError: false,
    previewStatus: "idle",
    previewCreated: false,
    selectedWorkUnitId: "wu:1",
    selectedDecision: "Accept",
    ...overrides,
  }
}

function approvalStatus(overrides: Partial<DashboardApprovalStatus> = {}): DashboardApprovalStatus {
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

// ─── computeApprovalTraceStatus ────────────────────────────────

test("no WorkUnit → no_workunit_selected", () => {
  const status = computeApprovalTraceStatus(baseInput({ selectedWorkUnitId: "" }))
  assert.equal(status, "no_workunit_selected")
})

test("no decision → decision_required", () => {
  const status = computeApprovalTraceStatus(baseInput({ selectedDecision: null }))
  assert.equal(status, "decision_required")
})

test("preview not created, idle → preview_not_created", () => {
  const status = computeApprovalTraceStatus(baseInput({ previewStatus: "idle", previewCreated: false }))
  assert.equal(status, "preview_not_created")
})

test("preview creating → preview_creating", () => {
  const status = computeApprovalTraceStatus(baseInput({ previewStatus: "creating", previewCreated: false }))
  assert.equal(status, "preview_creating")
})

test("preview created + no approval data → approval_none", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: null,
    approvalLoading: false,
  }))
  assert.equal(status, "approval_none")
})

test("preview created + approval loading → approval_loading", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalLoading: true,
    approvalStatus: null,
  }))
  assert.equal(status, "approval_loading")
})

test("preview created + approval error → approval_error", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalError: true,
  }))
  assert.equal(status, "approval_error")
})

test("approval none status → approval_none", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "none" }),
  }))
  assert.equal(status, "approval_none")
})

test("approval pending status → approval_pending", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "pending" }),
  }))
  assert.equal(status, "approval_pending")
})

test("approval approved status → approval_approved", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "approved", approved: true }),
  }))
  assert.equal(status, "approval_approved")
})

test("approval rejected status → approval_rejected", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "rejected", rejected: true }),
  }))
  assert.equal(status, "approval_rejected")
})

test("approval expired status → approval_expired", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "expired", expired: true }),
  }))
  assert.equal(status, "approval_expired")
})

test("approval used status → approval_used", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "used", used: true }),
  }))
  assert.equal(status, "approval_used")
})

// ─── Server approval overrides local state ──────────────────────

test("server approved overrides local preview-created assumption", () => {
  // Even if local state shows preview_created, server approval status wins
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "approved", approved: true }),
  }))
  assert.equal(status, "approval_approved")
})

test("server rejected overrides local preview-created", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "rejected", rejected: true }),
  }))
  assert.equal(status, "approval_rejected")
})

test("server expired overrides local preview-created", () => {
  const status = computeApprovalTraceStatus(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "expired", expired: true }),
  }))
  assert.equal(status, "approval_expired")
})

// ─── buildApprovalTraceEntry ────────────────────────────────────

test("buildApprovalTraceEntry returns display-safe entry for approved", () => {
  const entry = buildApprovalTraceEntry(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "approved", approved: true }),
  }))
  assert.equal(entry.text, "Approval completed by server record.")
  assert.equal(entry.status, "READY")
  assert.equal(entry.indicator, "green")
})

test("buildApprovalTraceEntry returns display-safe entry for rejected", () => {
  const entry = buildApprovalTraceEntry(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalStatus: approvalStatus({ status: "rejected", rejected: true }),
  }))
  assert.equal(entry.text, "Approval rejected by server record.")
  assert.equal(entry.status, "NOT_READY")
  assert.equal(entry.indicator, "red")
})

test("buildApprovalTraceEntry returns display-safe entry for error", () => {
  const entry = buildApprovalTraceEntry(baseInput({
    previewCreated: true,
    previewStatus: "created",
    approvalError: true,
  }))
  assert.equal(entry.text, "Approval status unavailable.")
  assert.equal(entry.status, "NOT_READY")
  assert.equal(entry.indicator, "red")
})

// ─── No raw server error / no hashes / no tenantId ──────────────

test("buildApprovalTraceEntry does not include raw errors", () => {
  const entry = buildApprovalTraceEntry(baseInput({
    previewCreated: true,
    approvalError: true,
  }))
  assert.equal(entry.text.includes("Approval status unavailable"), true)
  assert.equal(entry.text.includes("stack"), false)
  assert.equal(entry.text.includes("Error"), false)
  assert.equal(entry.text.includes("trace"), false)
})

test("decision trace text never contains targetHash/payloadHash/tenantId", () => {
  const statuses = [
    "no_workunit_selected",
    "decision_required",
    "preview_not_created",
    "approval_loading",
    "approval_none",
    "approval_pending",
    "approval_approved",
    "approval_rejected",
    "approval_expired",
    "approval_used",
    "approval_error",
  ] as const

  for (const s of statuses) {
    // Build every status via the full function
    const entries: Array<{ text: string }> = []
    if (s === "no_workunit_selected") {
      entries.push(buildApprovalTraceEntry(baseInput({ selectedWorkUnitId: "" })))
    } else if (s === "decision_required") {
      entries.push(buildApprovalTraceEntry(baseInput({ selectedDecision: null })))
    } else if (s === "preview_not_created") {
      entries.push(buildApprovalTraceEntry(baseInput({ previewCreated: false })))
    } else if (s === "approval_loading") {
      entries.push(buildApprovalTraceEntry(baseInput({ previewCreated: true, approvalLoading: true })))
    } else {
      const statusMap: Record<string, DashboardApprovalStatus["status"]> = {
        approval_none: "none",
        approval_pending: "pending",
        approval_approved: "approved",
        approval_rejected: "rejected",
        approval_expired: "expired",
        approval_used: "used",
        approval_error: "none",
      }
      const as = statusMap[s]
      entries.push(buildApprovalTraceEntry(baseInput({
        previewCreated: true,
        approvalStatus: (s === "approval_error" && as === "none")
          ? null
          : approvalStatus({
              status: as === "none" ? "none" : as,
              approved: as === "approved",
              rejected: as === "rejected",
              expired: as === "expired",
              used: as === "used",
            }),
        approvalError: s === "approval_error",
      })))
    }

    for (const entry of entries) {
      const flat = JSON.stringify(entry)
      assert.equal(flat.includes("targetHash"), false, `${s}: has targetHash`)
      assert.equal(flat.includes("payloadHash"), false, `${s}: has payloadHash`)
      assert.equal(flat.includes("tenantId"), false, `${s}: has tenantId`)
      assert.equal(flat.includes("Should not"), false, `${s}: has raw error`)
    }
  }
})

// ─── isApprovalCompleted ────────────────────────────────────────

test("isApprovalCompleted = true only for server-approved", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalStatus: approvalStatus({ status: "approved", approved: true }),
  })), true)
})

test("isApprovalCompleted = false for none", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalStatus: approvalStatus({ status: "none", approved: false }),
  })), false)
})

test("isApprovalCompleted = false for pending", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalStatus: approvalStatus({ status: "pending", approved: false }),
  })), false)
})

test("isApprovalCompleted = false for rejected", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalStatus: approvalStatus({ status: "rejected", rejected: true }),
  })), false)
})

test("isApprovalCompleted = false for expired", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalStatus: approvalStatus({ status: "expired", expired: true }),
  })), false)
})

test("isApprovalCompleted = false for used", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalStatus: approvalStatus({ status: "used", used: true }),
  })), false)
})

test("isApprovalCompleted = false for error", () => {
  assert.equal(isApprovalCompleted(baseInput({
    previewCreated: true,
    approvalError: true,
  })), false)
})

test("isApprovalCompleted = false when no WorkUnit selected", () => {
  assert.equal(isApprovalCompleted(baseInput({ selectedWorkUnitId: "" })), false)
})

test("isApprovalCompleted = false when no preview created", () => {
  assert.equal(isApprovalCompleted(baseInput({ previewCreated: false })), false)
})
