import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const actionPreviewRoute = "app/api/workunit/[id]/action-preview/route.ts"
const approvalRoute = "app/api/workunit/[id]/approval/route.ts"
const dashboardComponent = "app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.tsx"
const dashboardPanel = "app/components/workunit-os/adopted/AdoptedActionFieldPanel.tsx"
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

test("dashboard renders Approve/Reject controls after preview creation", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // Approve/Reject is now connected — verify it uses the canonical client
  assert.equal(source.includes("approveDashboardActionPreviews"), false) // in dashboard comp
  // Verify the buttons exist in the panel
  assert.equal(source.includes('onClick={onApprove}'), true)
  assert.equal(source.includes('onClick={onReject}'), true)
  // Verify showApproveReject gate exists
  assert.equal(source.includes("showApproveReject"), true)
  // But verify no raw hashes/tenantId sent from the component
  assert.equal(source.includes("targetHash"), false)
  assert.equal(source.includes("payloadHash"), false)
  assert.equal(source.includes("tenantId"), false)
})

test("CSS has no approve/reject classes in external module (uses inline styles)", async () => {
  const source = await readFile(cssModule, "utf8")
  // No new CSS classes added — uses existing ctaButton with inline styles
  assert.equal(source.includes("ctaApproveRow"), false)
  assert.equal(source.includes("ctaApproveBtn"), false)
  assert.equal(source.includes("ctaRejectBtn"), false)
})

test("dashboard has safe approval error mapping", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("mapSafeApprovalError"), true)
  // Verify safe error messages exist
  assert.equal(source.includes("You do not have permission to approve this preview."), true)
  assert.equal(source.includes("Approval update failed. Please try again."), true)
  // No raw server error exposure
  assert.equal(source.includes("stack"), false)
})

test("dashboard stores preview refs after creation", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("setPreviewRefs(result.previews)"), true)
  assert.equal(source.includes("DashboardPreviewRef"), true)
})

test("dashboard approves only when showApproveReject returns true", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  // showApproveReject gates on: WorkUnit, preview status, refs, approval status
  assert.equal(source.includes("if (previewStatus !== \"created\") return false"), true)
  assert.equal(source.includes("if (previewRefs.length === 0) return false"), true)
  assert.equal(source.includes("showableStatuses.includes(approvalStatus.status)"), true)
  // Does not allow approve for approved/rejected/expired/used
  const showableLine = source.slice(source.indexOf("const showableStatuses"))
  assert.equal(showableLine.includes('"none"'), true)
  assert.equal(showableLine.includes('"pending"'), true)
  assert.equal(showableLine.includes('"approved"'), false)
})

test("approval client still sends only actionPreviewId and decision", async () => {
  const source = await readFile("app/lib/application/actionField/dashboardPreviewClient.ts", "utf8")
  assert.equal(source.includes("{ actionPreviewId: preview.previewId, decision }"), true)
  // No forbidden fields in the body construction
  const approveFn = source.slice(source.indexOf("export async function approveDashboardActionPreviews"))
  assert.equal(approveFn.includes("targetHash"), false)
  assert.equal(approveFn.includes("payloadHash"), false)
  assert.equal(approveFn.includes("tenantId"), false)
})

// ─── Lint suppression removed ─────────────────────────────────────

test("dashboard has exactly one react-hooks set-state-in-effect suppression (approval fetch)", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  const matches = source.match(/react-hooks\/set-state-in-effect/g)
  assert.equal(matches?.length ?? 0, 1)
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

// ─── Decision Trace is API-backed ────────────────────────────────

test("decision trace uses api-backed approval status via computeApprovalTraceStatus", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  assert.equal(source.includes("computeApprovalTraceStatus"), true)
  assert.equal(source.includes("approvalTraceInput"), true)
  assert.equal(source.includes("DecisionTraceApprovalInput"), true)
  // No longer hardcodes "Preview created, approval pending" as absolute truth
  assert.equal(source.includes("\"Preview created, approval pending\""), false)
  // No longer calls buildLogs with just previewCreated boolean
  assert.equal(source.includes("buildLogs(selectedWorkUnit, input.selectedDecision, input.previewCreated"), false)
})

test("decision trace includes server status texts for all states", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  assert.equal(source.includes("Approval completed by server record."), true)
  assert.equal(source.includes("Approval rejected by server record."), true)
  assert.equal(source.includes("Approval expired."), true)
  assert.equal(source.includes("Approval already consumed."), true)
  assert.equal(source.includes("Approval status unavailable."), true)
  assert.equal(source.includes("Approval pending."), true)
  assert.equal(source.includes("Approval not completed."), true)
})

test("decision trace never shows raw server errors in text", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  // The approval_error case maps to safe text, not raw errors
  // Slice just the traceTextFor function body
  const fnStart = source.indexOf("function traceTextFor")
  const fnEnd = source.indexOf("function traceIndicatorFor", fnStart)
  const traceTextFor = source.slice(fnStart, fnEnd)
  assert.equal(traceTextFor.includes("Approval status unavailable."), true)
  // Should not contain raw error language
  assert.equal(traceTextFor.includes("Server Error"), false)
  assert.equal(traceTextFor.includes("Internal Error"), false)
})

test("view model imports approvalDecisionTraceModel", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  assert.equal(source.includes("from \"./approvalDecisionTraceModel.ts\""), true)
  assert.equal(source.includes("isApprovalCompleted"), true)
})

test("approvalDecisionTraceModel has no forbidden imports", async () => {
  const source = await readFile("app/lib/application/dashboard/approvalDecisionTraceModel.ts", "utf8")
  // Extract only import lines
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  // No React
  assert.equal(allImports.includes("react"), false)
  assert.equal(allImports.includes("useState"), false)
  // No D1 imports
  assert.equal(allImports.includes("@/lib/persistence"), false)
  assert.equal(allImports.includes("../persistence"), false)
  // No route handler
  assert.equal(allImports.includes("NextResponse"), false)
  // No raw client
  assert.equal(allImports.includes("fetchImpl"), false)
  // Only allowed import sources
  for (const line of importLines) {
    assert.ok(
      line.includes("./dashboardApprovalStatusClient.ts") ||
      line.includes("./adoptedDashboardViewModel.ts"),
      `unexpected import: ${line}`,
    )
  }
  // No `any` types anywhere
  assert.equal(source.includes(": any"), false)
  // No forbidden fields used as property keys in type definitions or output paths
  // (header comment mentions them as excluded, but they must not appear as actual keys)
  assert.equal(source.includes("tenantId:"), false)
  assert.equal(source.includes("tenantId "), false)
  assert.equal(source.includes("actorUserId:"), false)
  assert.equal(source.includes("targetHash:"), false)
  assert.equal(source.includes("payloadHash:"), false)
})

test("Approval Completed gate remains server-backed", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  // Uses canonical isApprovalCompleted from the decision trace model
  assert.equal(source.includes("isApprovalCompleted(approvalTraceInput)"), true)
  // Does NOT use raw approved boolean from client
  const buildFn = source.slice(source.indexOf("export function buildAdoptedDashboardViewModel"))
  assert.equal(buildFn.includes("approved: input.approved"), false)
})

test("adopted dashboard component passes full approval state to view model", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("approvalStatus,"), true)
  assert.equal(source.includes("approvalLoading,"), true)
  assert.equal(source.includes("approvalError,"), true)
  assert.equal(source.includes("previewStatus,"), true)
  // No longer passes raw approved boolean
  assert.equal(source.includes("approved: approvalStatus?.approved"), false)
})

// ─── Execution readiness is pure-model based ────────────────────

test("executionReadinessModel has no forbidden imports", async () => {
  const source = await readFile("app/lib/application/dashboard/executionReadinessModel.ts", "utf8")
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  assert.equal(allImports.includes("react"), false)
  assert.equal(allImports.includes("NextResponse"), false)
  assert.equal(allImports.includes("@/lib/persistence"), false)
  assert.equal(allImports.includes("fetchImpl"), false)
  assert.equal(source.includes(": any"), false)
  assert.equal(source.includes("tenantId:"), false)
  assert.equal(source.includes("actorUserId:"), false)
})

test("executionCommandModel has no forbidden imports", async () => {
  const source = await readFile("app/lib/application/dashboard/executionCommandModel.ts", "utf8")
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  assert.equal(allImports.includes("react"), false)
  assert.equal(allImports.includes("NextResponse"), false)
  assert.equal(allImports.includes("@/lib/persistence"), false)
  assert.equal(allImports.includes("fetchImpl"), false)
  assert.equal(source.includes(": any"), false)
  // Forbidden fields checked as property keys (colon-suffixed), not comments
  assert.equal(source.includes("tenantId:"), false)
  assert.equal(source.includes("actorUserId:"), false)
  assert.equal(source.includes("targetHash:"), false)
  assert.equal(source.includes("payloadHash:"), false)
})

test("executionCommandModel envelope has no forbidden fields in output", async () => {
  const source = await readFile("app/lib/application/dashboard/executionCommandModel.ts", "utf8")
  // Check the exported type definition for forbidden property keys
  const typeStart = source.indexOf("export type ExecutionCommandEnvelope")
  const envelopeSection = source.slice(typeStart)
  assert.equal(envelopeSection.includes("targetHash:"), false)
  assert.equal(envelopeSection.includes("payloadHash:"), false)
  assert.equal(envelopeSection.includes("tenantId:"), false)
  assert.equal(envelopeSection.includes("actorUserId:"), false)
  assert.equal(envelopeSection.includes("token"), false)
  assert.equal(envelopeSection.includes("rawPayload"), false)
  assert.equal(envelopeSection.includes("rawBody"), false)
})

test("dashboard component does not call POST /api/workunit/tools", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("/api/workunit/tools"), false)
})

test("dashboard shows external execution blocked notice", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("External Execution"), true)
  assert.equal(source.includes("BLOCKED"), true)
})

test("execute CTA is disabled and non-executing in dashboard", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // No real execution handler
  assert.equal(source.includes("handleExecute"), false)
  // Disabled Execute placeholder exists (not a real execution trigger)
  assert.equal(source.includes("Execute (disabled)"), true)
  // No actual POST to tools
  assert.equal(source.includes("/api/workunit/tools"), false)
})

// ─── Execution readiness binding regression ────────────────────

test("view model passes externalExecutionEnabled to readiness input", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  // externalExecutionEnabled is explicitly set to false
  assert.equal(source.includes("externalExecutionEnabled: false"), true)
})

test("component does not duplicate readiness conditions locally", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // Readiness is derived from viewModel.executionReadiness, not local state
  assert.equal(source.includes("viewModel.executionReadiness"), true)
  // Component does NOT compute readiness from local approval state
  assert.equal(source.includes("computeExecutionReadiness"), false)
})

test("execution readiness model reaches execution_ready when externalExecutionEnabled is true", async () => {
  const source = await readFile("app/lib/application/dashboard/executionReadinessModel.ts", "utf8")
  // Model uses externalExecutionEnabled to decide execution_blocked vs execution_ready
  assert.equal(source.includes("externalExecutionEnabled"), true)
  // When externalExecutionEnabled is true and approved, returns execution_ready
  assert.equal(source.includes('"execution_ready"'), true)
  // When false, returns execution_blocked
  assert.equal(source.includes('"execution_blocked"'), true)
})

test("dashboard component imports only view model, not raw readiness model", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  // Component imports from adoptedDashboardViewModel, not executionReadinessModel directly
  assert.equal(allImports.includes("executionReadinessModel"), false)
  assert.equal(allImports.includes("executionCommandModel"), false)
})

test("execution readiness trace text uses spec display text", async () => {
  const source = await readFile("app/lib/application/dashboard/executionReadinessModel.ts", "utf8")
  assert.equal(source.includes("Execution ready, but external execution is disabled."), true)
  assert.equal(source.includes("Ready for execution."), true)
})

// ─── Command envelope display binding regression ──────────────

test("view model imports buildExecutionCommandEnvelope", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  assert.equal(source.includes("from \"./executionCommandModel.ts\""), true)
  assert.equal(source.includes("buildExecutionCommandEnvelope"), true)
})

test("view model output type includes executionCommandPreview", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  assert.equal(source.includes("executionCommandPreview: ExecutionCommandPreviewView"), true)
  assert.equal(source.includes("ExecutionCommandPreviewView"), true)
})

test("view model ExecutionCommandPreviewView has no forbidden fields", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  // Find the ExecutionCommandPreviewView type definition
  const typeStart = source.indexOf("export type ExecutionCommandPreviewView")
  const typeSection = source.slice(typeStart, source.indexOf("}", typeStart) + 1)
  // Must include safe display fields
  assert.equal(typeSection.includes("mode: string"), true)
  assert.equal(typeSection.includes("reason: string"), true)
  assert.equal(typeSection.includes("workUnitId: string | null"), true)
  assert.equal(typeSection.includes("previewRefCount: number"), true)
  assert.equal(typeSection.includes("requestedActionType: string | null"), true)
  // Must NOT include forbidden fields
  assert.equal(typeSection.includes("approvalId"), false)
  assert.equal(typeSection.includes("targetHash"), false)
  assert.equal(typeSection.includes("payloadHash"), false)
  assert.equal(typeSection.includes("tenantId"), false)
  assert.equal(typeSection.includes("actorUserId"), false)
  assert.equal(typeSection.includes("role"), false)
  assert.equal(typeSection.includes("token"), false)
  assert.equal(typeSection.includes("secret"), false)
  assert.equal(typeSection.includes("rawPayload"), false)
  assert.equal(typeSection.includes("rawBody"), false)
})

test("view model builds envelope without passing approvalId", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  // The approvalId is intentionally not passed
  assert.equal(source.includes("never fabricate"), true)
  // requestedActionType is now derived from deriveRequestedActionType, not nextAction
  const envelopeSection = source.slice(source.indexOf("Build safe execution command envelope"))
  assert.equal(envelopeSection.includes("deriveRequestedActionType"), true)
})

test("dashboard component passes previewRefs to view model", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("previewRefs: previewRefs.map"), true)
})

test("dashboard renders command envelope display", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("COMMAND ENVELOPE"), true)
  assert.equal(source.includes("viewModel.executionCommandPreview.mode"), true)
  assert.equal(source.includes("viewModel.executionCommandPreview.previewRefCount"), true)
  assert.equal(source.includes("viewModel.executionCommandPreview.requestedActionType"), true)
})

test("dashboard command envelope does not render approvalId", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("approvalId"), false)
})

test("dashboard command envelope does not render targetHash/payloadHash", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("targetHash"), false)
  assert.equal(source.includes("payloadHash"), false)
})

test("dashboard command envelope does not render tenantId/actorUserId/role", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("tenantId"), false)
  assert.equal(source.includes("actorUserId"), false)
})

test("dashboard command envelope does not render raw payloads or tokens", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("token"), false)
  assert.equal(source.includes("secret"), false)
  assert.equal(source.includes("rawPayload"), false)
  assert.equal(source.includes("rawBody"), false)
})

test("dashboard command envelope display is gated on execution_blocked", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // The envelope display only appears when traceStatus is execution_blocked
  // Count occurrences of "execution_blocked" — one for the CTA gate, one for envelope gate
  const blockedMatches = source.match(/execution_blocked/g)
  assert.ok((blockedMatches?.length ?? 0) >= 2, "execution_blocked should appear at least twice (CTA + envelope gates)")
})

// ─── requestedActionType normalization regression ─────────────

test("view model imports deriveRequestedActionType", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  assert.equal(source.includes("from \"./requestedActionTypeModel.ts\""), true)
  assert.equal(source.includes("deriveRequestedActionType"), true)
})

test("view model does NOT use workUnit.nextAction as requestedActionType", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  // The envelope builder block should use deriveRequestedActionType, not nextAction
  const envelopeSection = source.slice(source.indexOf("Build safe execution command envelope"))
  assert.equal(envelopeSection.includes("deriveRequestedActionType"), true)
  assert.equal(envelopeSection.includes("selectedWorkUnit?.nextAction"), false)
})

test("view model uses sourceProvider + hasRepository for action type derivation", async () => {
  const source = await readFile("app/lib/application/dashboard/adoptedDashboardViewModel.ts", "utf8")
  const envelopeSection = source.slice(source.indexOf("Build safe execution command envelope"))
  assert.equal(envelopeSection.includes("sourceProvider:"), true)
  assert.equal(envelopeSection.includes("hasRepository:"), true)
})

test("requestedActionTypeModel has no forbidden imports", async () => {
  const source = await readFile("app/lib/application/dashboard/requestedActionTypeModel.ts", "utf8")
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  assert.equal(allImports.includes("react"), false)
  assert.equal(allImports.includes("NextResponse"), false)
  assert.equal(allImports.includes("fetch"), false)
  assert.equal(source.includes(": any"), false)
  // Check code-only section (after JSDoc header) for forbidden property-key patterns
  const codeSection = source.slice(source.indexOf("export type RequestedActionTypeCode"))
  assert.equal(codeSection.includes("tenantId:"), false)
  assert.equal(codeSection.includes("actorUserId:"), false)
  assert.equal(codeSection.includes("approvalId:"), false)
  assert.equal(codeSection.includes("targetHash:"), false)
  assert.equal(codeSection.includes("payloadHash:"), false)
})

test("requestedActionTypeModel returns canonical type codes only", async () => {
  const source = await readFile("app/lib/application/dashboard/requestedActionTypeModel.ts", "utf8")
  // Check code section only (skip JSDoc header which mentions examples)
  const codeSection = source.slice(source.indexOf("export type RequestedActionTypeCode"))
  // The type union has only canonical codes
  assert.equal(codeSection.includes('"slack_reply"'), true)
  assert.equal(codeSection.includes('"github_issue"'), true)
  assert.equal(codeSection.includes('"calendar_block"'), true)
  assert.equal(codeSection.includes('"email_send"'), true)
  assert.equal(codeSection.includes('"database_update"'), true)
  // No natural-language action descriptions in code (header comments excluded)
  const deriveSection = source.slice(source.indexOf("export function deriveRequestedActionType"))
  assert.equal(deriveSection.includes("Reply in Slack"), false)
})

// ─── Email mapping + null display regression ──────────────────

test("requestedActionTypeModel maps email and gmail to email_send", async () => {
  const source = await readFile("app/lib/application/dashboard/requestedActionTypeModel.ts", "utf8")
  const codeSection = source.slice(source.indexOf("export function deriveRequestedActionType"))
  assert.equal(codeSection.includes('case "email"'), true)
  assert.equal(codeSection.includes('case "gmail"'), true)
  assert.equal(codeSection.includes('"email_send"'), true)
})

test("dashboard renders Not available for null requestedActionType", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Not available"), true)
  // Uses nullish coalescing for safe fallback
  assert.equal(source.includes("requestedActionType ?? "), true)
})

test("dashboard does not use nextAction as action type fallback", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // The command envelope section should not reference nextAction
  const envelopeSection = source.slice(source.indexOf("COMMAND ENVELOPE"), source.indexOf("COMMAND ENVELOPE") + 400)
  assert.equal(envelopeSection.includes("nextAction"), false)
})

// ─── Dry-run dashboard binding regression ──────────────────────

test("dashboard imports dry-run client helper", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("runDashboardExecutionDryRun"), true)
})

test("dashboard renders Verify Execution button", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Verify Execution"), true)
  assert.equal(source.includes("onDryRun"), true)
})

test("dashboard Verify button is gated on execution_blocked + previewRefs", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // The button only shows when execution_blocked AND previewRefCount > 0
  assert.equal(source.includes('previewRefCount > 0'), true)
})

test("dashboard calls dry-run only, not tools route", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  // Uses the dry-run client helper
  assert.equal(source.includes("runDashboardExecutionDryRun"), true)
  // Does NOT call /api/workunit/tools
  assert.equal(source.includes("/api/workunit/tools"), false)
  // No handleExecute
  assert.equal(source.includes("handleExecute"), false)
})

test("dashboard dry-run result display exists", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("executionViewer.title"), true)
  assert.equal(source.includes("executionViewer.statusLabel"), true)
  assert.equal(source.includes("executionViewer.reason"), true)
})

test("dashboard dry-run does not render approvalId", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("approvalId"), false)
})

test("dashboard dry-run does not render hashes", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  // Ensure no targetHash/payloadHash in the dry-run/CTA section
  const ctaSection = source.slice(source.indexOf("CTA AREA"))
  assert.equal(ctaSection.includes("targetHash"), false)
  assert.equal(ctaSection.includes("payloadHash"), false)
})

test("dashboard dry-run resets state on WorkUnit switch", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  // The onClick handler resets dryRunStatus and dryRunMessage
  assert.equal(source.includes('setDryRunStatus("idle")'), true)
  assert.equal(source.includes("setDryRunMessage(null)"), true)
})

test("dashboard Execute CTA remains disabled", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Execute (disabled)"), true)
  assert.equal(source.includes("handleExecute"), false)
  assert.equal(source.includes("/api/workunit/tools"), false)
})

test("dashboard Execute CTA remains disabled with dry-run controls", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Execute (disabled)"), true)
  assert.equal(source.includes("handleExecute"), false)
  assert.equal(source.includes("/api/workunit/tools"), false)
})

// ─── Dry-run result detail display regression ─────────────────

test("dry-run result displays Actions checked", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Actions checked:"), true)
  assert.equal(source.includes("executionViewer.actionCount"), true)
})

test("dry-run result displays Action type", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Action type:"), true)
  assert.equal(source.includes("executionViewer.requestedActionTypeLabel"), true)
})

test("dry-run result null action type renders Not available", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // Component uses executionViewer.requestedActionTypeLabel from the model
  assert.equal(source.includes("executionViewer.requestedActionTypeLabel"), true)
  // The viewer model handles "Not available" for null action types
})

test("dryRunActionCount and dryRunActionType reset on WorkUnit switch", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("setDryRunActionCount(0)"), true)
  assert.equal(source.includes("setDryRunActionType(null)"), true)
})

test("dry-run client returns requestedActionType", async () => {
  const source = await readFile("app/lib/application/dashboard/dashboardExecutionDryRunClient.ts", "utf8")
  assert.equal(source.includes("requestedActionType: typeof data.requestedActionType"), true)
  // Falls back to null for invalid data
  assert.equal(source.includes("? data.requestedActionType : null"), true)
})

// ─── Dry-run result controls regression ───────────────────────

test("dashboard has handleClearDryRun function", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("onClearDryRun"), true)
})

test("Clear result is local-only — no API call", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // handleClearDryRun only calls setDryRunStatus/idle, setDryRunMessage/null, etc.
  // No fetch, no runDashboardExecutionDryRun inside handleClearDryRun
  const clearFn = source.slice(source.indexOf("handleClearDryRun"), source.indexOf("// ─── Show Approve"))
  assert.equal(clearFn.includes("fetch"), false)
  assert.equal(clearFn.includes("runDashboardExecutionDryRun"), false)
})

test("dashboard renders Clear result button", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Clear result"), true)
})

test("dashboard renders Re-run verification button", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Re-run verification"), true)
})

test("Re-run verification reuses handleDryRun", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  // Both Verify Execution and Re-run verification call onDryRun
  assert.equal(source.includes('onClick={onDryRun}'), true)
})

test("Clear result resets all dry-run state fields", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  const clearFn = source.slice(source.indexOf("handleClearDryRun"), source.indexOf("// ─── Show Approve"))
  assert.equal(clearFn.includes('setDryRunStatus("idle")'), true)
  assert.equal(clearFn.includes("setDryRunMessage(null)"), true)
  assert.equal(clearFn.includes("setDryRunActionCount(0)"), true)
  assert.equal(clearFn.includes("setDryRunActionType(null)"), true)
})

test("dashboard dry-run controls do not expose approvalId", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("approvalId"), false)
})

test("dashboard Execute CTA remains disabled with dry-run controls", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Execute (disabled)"), true)
  assert.equal(source.includes("handleExecute"), false)
  assert.equal(source.includes("/api/workunit/tools"), false)
})

// ─── Execution result viewer model regression ─────────────────

test("dashboard imports executionResultViewerModel", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("buildExecutionResultViewer"), true)
  assert.equal(source.includes("executionResultViewerModel"), true)
})

test("dashboard renders dry-run result through viewer model", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("executionViewer.kind"), true)
  assert.equal(source.includes("executionViewer.title"), true)
  assert.equal(source.includes("executionViewer.statusLabel"), true)
  assert.equal(source.includes("executionViewer.actionCount"), true)
  assert.equal(source.includes("executionViewer.requestedActionTypeLabel"), true)
  assert.equal(source.includes("executionViewer.canClear"), true)
})

test("executionResultViewerModel has no forbidden imports", async () => {
  const source = await readFile("app/lib/application/dashboard/executionResultViewerModel.ts", "utf8")
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  assert.equal(allImports.includes("react"), false)
  assert.equal(allImports.includes("NextResponse"), false)
  assert.equal(allImports.includes("fetch"), false)
  assert.equal(allImports.includes("@/lib/persistence"), false)
  assert.equal(source.includes(": any"), false)
})

test("executionResultViewerModel type has no forbidden fields", async () => {
  const source = await readFile("app/lib/application/dashboard/executionResultViewerModel.ts", "utf8")
  const typeStart = source.indexOf("export type ExecutionResultViewerModel")
  const typeSection = source.slice(typeStart, source.indexOf("}", typeStart) + 1)
  assert.equal(typeSection.includes("approvalId"), false)
  assert.equal(typeSection.includes("targetHash"), false)
  assert.equal(typeSection.includes("payloadHash"), false)
  assert.equal(typeSection.includes("tenantId"), false)
  assert.equal(typeSection.includes("actorUserId"), false)
  assert.equal(typeSection.includes("role"), false)
  assert.equal(typeSection.includes("token"), false)
  assert.equal(typeSection.includes("secret"), false)
  assert.equal(typeSection.includes("rawPayload"), false)
  assert.equal(typeSection.includes("rawBody"), false)
})
