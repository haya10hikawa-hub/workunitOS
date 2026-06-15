import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const actionPreviewRoute = "app/api/workunit/[id]/action-preview/route.ts"
const approvalRoute = "app/api/workunit/[id]/approval/route.ts"
const dashboardComponent = "app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.tsx"
const cssModule = "app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.module.css"
const auditLogType = "app/lib/security/auditLog.ts"

// ─── Hash non-exposure ───────────────────────────────────────────

test("POST action-preview response does not expose targetHash", async () => {
  const source = await readFile(actionPreviewRoute, "utf8")
  // Find the return json({ preview: { ... } }) block and extract field names
  const previewBlock = source.slice(source.indexOf("preview: {"))
  const fieldsEnd = previewBlock.indexOf("},\n  }, 201)")
  const fieldsBlock = previewBlock.slice(0, fieldsEnd)
  // Should include safe fields only
  assert.equal(fieldsBlock.includes("id: previewId"), true)
  assert.equal(fieldsBlock.includes("workUnitId,"), true)
  assert.equal(fieldsBlock.includes("actionType,"), true)
  assert.equal(fieldsBlock.includes("targetPreview,"), true)
  assert.equal(fieldsBlock.includes("payloadPreview,"), true)
  assert.equal(fieldsBlock.includes("requiresApproval"), true)
  assert.equal(fieldsBlock.includes("status:"), true)
  assert.equal(fieldsBlock.includes("createdAt:"), true)
  assert.equal(fieldsBlock.includes("expiresAt:"), true)
  // Should NOT include hashes
  assert.equal(fieldsBlock.includes("targetHash"), false)
  assert.equal(fieldsBlock.includes("payloadHash"), false)
})

test("POST approval response does not expose targetHash", async () => {
  const source = await readFile(approvalRoute, "utf8")
  // Find the return json({ approval: { ... } }) block
  const approvalBlock = source.slice(source.indexOf("approval: {"))
  const fieldsEnd = approvalBlock.indexOf("},\n  }, 201)")
  const fieldsBlock = approvalBlock.slice(0, fieldsEnd)
  // Should include safe fields only
  assert.equal(fieldsBlock.includes("id: approvalRow.id"), true)
  assert.equal(fieldsBlock.includes("workUnitId,"), true)
  assert.equal(fieldsBlock.includes("actionPreviewId,"), true)
  assert.equal(fieldsBlock.includes("actionType:"), true)
  assert.equal(fieldsBlock.includes("status:"), true)
  assert.equal(fieldsBlock.includes("expiresAt:"), true)
  assert.equal(fieldsBlock.includes("createdAt:"), true)
  // Should NOT include hashes
  assert.equal(fieldsBlock.includes("targetHash"), false)
  assert.equal(fieldsBlock.includes("payloadHash"), false)
})

test("server still stores hashes internally in action-preview route", async () => {
  const source = await readFile(actionPreviewRoute, "utf8")
  assert.equal(source.includes("hashActionTarget(targetPreview)"), true)
  assert.equal(source.includes("hashActionPayload(payloadPreview)"), true)
  assert.equal(source.includes("const targetHash ="), true)
  assert.equal(source.includes("const payloadHash ="), true)
})

test("server still stores hashes internally in approval route", async () => {
  const source = await readFile(approvalRoute, "utf8")
  assert.equal(source.includes("targetHash: preview.targetHash"), true)
  assert.equal(source.includes("payloadHash: preview.payloadHash"), true)
})

// ─── Approve/Reject UI removed ────────────────────────────────────

test("dashboard does not render Approve/Reject buttons", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("handleApproveReject"), false)
  assert.equal(source.includes("approveDashboardActionPreviews"), false)
  assert.equal(source.includes("DashboardPreviewRef"), false)
  assert.equal(source.includes("previewRefs"), false)
  assert.equal(source.includes("ctaApproveRow"), false)
})

test("CSS has no approve/reject classes", async () => {
  const source = await readFile(cssModule, "utf8")
  assert.equal(source.includes("ctaApproveRow"), false)
  assert.equal(source.includes("ctaApproveBtn"), false)
  assert.equal(source.includes("ctaRejectBtn"), false)
})

// ─── Lint suppression removed ─────────────────────────────────────

test("dashboard has no react-hooks set-state-in-effect suppression", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("react-hooks/set-state-in-effect"), false)
})

// ─── Approval status endpoint uses correct audit events ───────────

test("approval status route has proper audit event kinds", async () => {
  const source = await readFile("app/api/workunit/[id]/approval/status/route.ts", "utf8")
  assert.equal(source.includes('audit("approval_status_requested"'), true)
  assert.equal(source.includes('audit("approval_status_returned"'), true)
  assert.equal(source.includes('audit("approval_status_failed"'), true)
  // Should NOT use lookup_failed for success path
  const successAudit = source.slice(source.lastIndexOf('audit("'))
  assert.equal(successAudit.includes('audit("approval_lookup_failed"'), false)
})

// ─── Audit event types include status events ──────────────────────

test("auditLog includes approval_status_requested type", async () => {
  const source = await readFile(auditLogType, "utf8")
  assert.equal(source.includes('"approval_status_requested"'), true)
  assert.equal(source.includes('"approval_status_returned"'), true)
  assert.equal(source.includes('"approval_status_failed"'), true)
})

// ─── dashboardApprovalStatusClient shape validation ───────────────

test("dashboardApprovalStatusClient validates response shape", async () => {
  const source = await readFile("app/lib/application/dashboard/dashboardApprovalStatusClient.ts", "utf8")
  assert.equal(source.includes("!isRecord(data)"), true)
  assert.equal(source.includes('typeof data.status !== "string"'), true)
  assert.equal(source.includes("Invalid approval status response"), true)
  assert.equal(source.includes("emptyStatus"), false)
})
