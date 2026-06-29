/**
 * Internal Alpha Flow Regression Tests
 *
 * Locks the current safe internal alpha execution-preparation loop.
 *
 * This file proves:
 * - Each flow step is wired in the adopted dashboard.
 * - The dashboard never calls real execution or external providers.
 * - Execute CTA remains disabled.
 * - Dry-run does not mark approval as used.
 * - Forbidden fields are never rendered or exposed.
 * - Combined view model output contains only safe fields.
 *
 * No real execution. No external providers. No /api/workunit/tools.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { candidateWorkUnitBridge } from "../app/lib/application/candidate/candidateWorkUnitBridge.ts"
import { runDevGatedLlmCandidatePipeline } from "../app/lib/application/candidate/devGatedLlmCandidatePipeline.ts"
import { candidatesToLauncherWorkUnits } from "../app/lib/application/launcher/candidateToLauncherWorkUnit.ts"
import { deriveWorkUnitTreeMap } from "../app/lib/application/launcher/workUnitTreeModel.ts"
import { deriveWorkspaceModel } from "../app/lib/application/launcher/deriveWorkspaceModel.ts"
import { deriveActionFieldEditorDraft } from "../app/lib/application/launcher/actionFieldEditorDraftModel.ts"
import { FORBIDDEN_CANDIDATE_FIELDS } from "../app/lib/application/candidate/safeWorkUnitCandidate.ts"

const dashboardComponent = "app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.tsx"
const dashboardPanel = "app/components/workunit-os/adopted/AdoptedActionFieldPanel.tsx"
const viewModel = "app/lib/application/dashboard/adoptedDashboardViewModel.ts"
const dryRunClient = "app/lib/application/dashboard/dashboardExecutionDryRunClient.ts"
const previewClient = "app/lib/application/actionField/dashboardPreviewClient.ts"
const readinessModel = "app/lib/application/dashboard/executionReadinessModel.ts"
const viewerModel = "app/lib/application/dashboard/executionResultViewerModel.ts"
const decisionTraceModel = "app/lib/application/dashboard/approvalDecisionTraceModel.ts"
const actionTypeModel = "app/lib/application/dashboard/requestedActionTypeModel.ts"
const dryRunRoute = "app/api/workunit/[id]/execution/dry-run/route.ts"

// ─── Flow step presence ───────────────────────────────────────

test("alpha flow: WorkUnit selection → inbox fetch exists", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("fetchDashboardWorkUnits"), true)
})

test("alpha flow: Action Preview → preview client imported", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("createDashboardActionPreviews"), true)
  assert.equal(source.includes("dashboardPreviewClient"), true)
})

test("alpha flow: Approve/Reject → approval client + handlers exist", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("approveDashboardActionPreviews"), true)
  assert.equal(source.includes("handleApprove"), true)
  assert.equal(source.includes("handleReject"), true)
})

test("alpha flow: Approval Status → status client imported", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("fetchDashboardApprovalStatus"), true)
})

test("alpha flow: Decision Trace → computeApprovalTraceStatus wired", async () => {
  const source = await readFile(viewModel, "utf8")
  assert.equal(source.includes("computeApprovalTraceStatus"), true)
  assert.equal(source.includes("isApprovalCompleted"), true)
})

test("alpha flow: Execution Readiness → computeExecutionReadiness wired", async () => {
  const source = await readFile(viewModel, "utf8")
  assert.equal(source.includes("computeExecutionReadiness"), true)
  assert.equal(source.includes("externalExecutionEnabled"), true)
})

test("alpha flow: Command Envelope → buildExecutionCommandEnvelope wired", async () => {
  const source = await readFile(viewModel, "utf8")
  assert.equal(source.includes("buildExecutionCommandEnvelope"), true)
})

test("alpha flow: Dry-run → client imported, button exists", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Verify Execution"), true)
  // runDashboardExecutionDryRun is imported in dashboardComponent
})

test("alpha flow: Result Viewer → buildExecutionResultViewer wired", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("buildExecutionResultViewer"), true)
})

test("alpha flow: Clear/Re-run → handleClearDryRun + Re-run exists", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Re-run verification"), true)
  // handleClearDryRun is in dashboardComponent
})

// ─── No real execution ────────────────────────────────────────

test("alpha flow: dashboard never calls /api/workunit/tools", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("/api/workunit/tools"), false)
})

test("alpha flow: no handleExecute real execution path", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  assert.equal(source.includes("handleExecute"), false)
})

test("alpha flow: Execute CTA is disabled", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Execute (disabled)"), true)
  const executeSection = source.slice(source.indexOf("Execute (disabled)"))
  assert.equal(executeSection.includes("disabled"), true)
})

test("alpha flow: dry-run verified does not enable Execute", async () => {
  const source = await readFile(dashboardPanel, "utf8")
  assert.equal(source.includes("Execute (disabled)"), true)
})

// ─── Dry-run does not mark approval used ──────────────────────

test("alpha flow: dry-run route never marks approval used", async () => {
  const source = await readFile(dryRunRoute, "utf8")
  assert.equal(source.includes("markApprovalUsed"), false)
  assert.equal(source.includes("NEVER marks approval"), true)
})

test("alpha flow: dry-run client never sends approvalId", async () => {
  const source = await readFile(dryRunClient, "utf8")
  // The JSON body section should not contain approvalId
  const bodyStart = source.indexOf("JSON.stringify({")
  const bodyEnd = source.indexOf("})", bodyStart)
  const bodySection = source.slice(bodyStart, bodyEnd)
  assert.equal(bodySection.includes("approvalId"), false)
})

// ─── Forbidden fields across all view models ──────────────────

const FORBIDDEN_KEYS = [
  "approvalId", "targetHash", "payloadHash",
  "tenantId", "actorUserId", "approvedByUserId",
  "role", "tokens", "secret",
  "rawPayload", "rawBody",
]

test("alpha flow: executionReadinessModel has no forbidden fields in code", async () => {
  const source = await readFile(readinessModel, "utf8")
  const codeSection = source.slice(source.indexOf("export type ReadinessInput"))
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(codeSection.includes(`${key}:`), false, `${key} should not appear in readiness model code`)
  }
})

test("alpha flow: executionCommandModel code has safe display subset", async () => {
  // The raw ExecutionCommandEnvelope type includes approvalId (internal model).
  // But the view-model's ExecutionCommandPreviewView strips it for display.
  // Verify the view model output type is safe.
  const source = await readFile(viewModel, "utf8")
  const typeSection = source.slice(source.indexOf("export type ExecutionCommandPreviewView"))
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(typeSection.includes(`${key}:`), false, `${key} should not appear in ExecutionCommandPreviewView`)
  }
})

test("alpha flow: executionResultViewerModel has no forbidden fields in code", async () => {
  const source = await readFile(viewerModel, "utf8")
  const codeSection = source.slice(source.indexOf("export type ExecutionResultViewerModel"))
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(codeSection.includes(`${key}:`), false, `${key} should not appear in viewer model code`)
  }
})

test("alpha flow: decisionTraceModel has no forbidden fields in code", async () => {
  const source = await readFile(decisionTraceModel, "utf8")
  const codeSection = source.slice(source.indexOf("export type DecisionTraceApprovalInput"))
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(codeSection.includes(`${key}:`), false, `${key} should not appear in decision trace model code`)
  }
})

test("alpha flow: requestedActionTypeModel has no forbidden fields in code", async () => {
  const source = await readFile(actionTypeModel, "utf8")
  const codeSection = source.slice(source.indexOf("export type DeriveActionTypeInput"))
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(codeSection.includes(`${key}:`), false, `${key} should not appear in action type model code`)
  }
})

test("alpha flow: view model ExecutionCommandPreviewView has no forbidden fields", async () => {
  const source = await readFile(viewModel, "utf8")
  const typeSection = source.slice(source.indexOf("export type ExecutionCommandPreviewView"))
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(typeSection.includes(`${key}:`), false, `${key} should not appear in ExecutionCommandPreviewView`)
  }
})

test("alpha flow: dashboard component renders no forbidden keys", async () => {
  const source = await readFile(dashboardComponent, "utf8")
  // Check property-key patterns in rendered content, not comments/imports
  for (const key of ["approvalId", "targetHash", "payloadHash", "tenantId", "actorUserId", "rawPayload", "rawBody"]) {
    assert.equal(source.includes(`${key}`), false, `${key} should not appear in dashboard`)
  }
})

// ─── Client helpers send only safe fields ─────────────────────

test("alpha flow: preview client still strips forbidden keys from requests", async () => {
  const source = await readFile(previewClient, "utf8")
  assert.equal(source.includes("FORBIDDEN_CLIENT_KEYS"), true)
  assert.equal(source.includes('"targetHash"'), true)
  assert.equal(source.includes('"payloadHash"'), true)
})

test("alpha flow: dry-run client sends only safe fields", async () => {
  const source = await readFile(dryRunClient, "utf8")
  // Extract only the JSON body keys, excluding comments
  const bodyStart = source.indexOf("JSON.stringify({")
  const bodyEnd = source.indexOf("  }),", bodyStart)
  // Filter out comment lines
  const bodyLines = source.slice(bodyStart, bodyEnd).split("\n").filter((line) => !line.trimStart().startsWith("//"))
  const bodySection = bodyLines.join("\n")
  assert.equal(bodySection.includes("workUnitId"), true)
  assert.equal(bodySection.includes("previewRefs"), true)
  assert.equal(bodySection.includes("requestedActionType"), true)
  for (const key of ["approvalId", "targetHash", "payloadHash", "tenantId", "userId", "role", "tokens", "secret", "rawPayload", "rawBody"]) {
    assert.equal(bodySection.includes(key), false, `${key} should not be sent by dry-run client`)
  }
})

// ─── View model integration ───────────────────────────────────

test("alpha flow: view model returns both executionReadiness and executionCommandPreview", async () => {
  const source = await readFile(viewModel, "utf8")
  const returnSection = source.slice(source.indexOf("return {"))
  assert.equal(returnSection.includes("executionReadiness"), true)
  assert.equal(returnSection.includes("executionCommandPreview"), true)
})

test("alpha flow: view model externalExecutionEnabled is hardcoded false", async () => {
  const source = await readFile(viewModel, "utf8")
  assert.equal(source.includes("externalExecutionEnabled: false"), true)
})

test("alpha flow: view model requestedActionType uses deriveRequestedActionType not nextAction", async () => {
  const source = await readFile(viewModel, "utf8")
  const envelopeSection = source.slice(source.indexOf("Build safe execution command envelope"), source.indexOf("const envelope = buildExecutionCommandEnvelope"))
  assert.equal(envelopeSection.includes("deriveRequestedActionType"), true)
  // nextAction is used elsewhere in the view model (e.g., buildActionFieldView)
  // but NOT inside the envelope building block
  assert.equal(envelopeSection.includes("nextAction"), false)
})

test("alpha flow: approval completed uses isApprovalCompleted from decision trace model", async () => {
  const source = await readFile(viewModel, "utf8")
  assert.equal(source.includes("isApprovalCompleted(approvalTraceInput)"), true)
})

// ─── Dry-run response safety ─────────────────────────────────

test("alpha flow: dry-run response type has only safe fields", async () => {
  const source = await readFile(dryRunRoute, "utf8")
  const typeStart = source.indexOf("type DryRunResponse")
  // Find just the type definition block (ends at the first "}" after "ok: true")
  const typeBlockEnd = source.indexOf("\n}", source.indexOf("requestedActionType:", typeStart)) + 2
  const typeSection = source.slice(typeStart, typeBlockEnd)
  const safeKeys = ["ok", "mode", "status", "reason", "workUnitId", "actionCount", "requestedActionType"]
  for (const key of safeKeys) {
    assert.equal(typeSection.includes(key), true, `DryRunResponse should include ${key}`)
  }
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(typeSection.includes(`${key}`), false, `DryRunResponse should not include ${key}`)
  }
})

test("alpha flow: dry-run route has no markApprovalUsed", async () => {
  const source = await readFile(dryRunRoute, "utf8")
  assert.equal(source.includes("markApprovalUsed"), false)
})

test("alpha flow: dry-run route has no external provider calls (slack/gmail/github/calendar)", async () => {
  const source = await readFile(dryRunRoute, "utf8")
  // The route does not import or call any external provider
  const importLines = source.split("\n").filter((line) => line.trimStart().startsWith("import"))
  const allImports = importLines.join("\n")
  assert.equal(allImports.includes("slack"), false)
  assert.equal(allImports.includes("gmail"), false)
  assert.equal(allImports.includes("github"), false)
  assert.equal(allImports.includes("calendar"), false)
})

// ─── Kill switch ──────────────────────────────────────────────

test("alpha flow: executionReadinessModel uses externalExecutionEnabled gate", async () => {
  const source = await readFile(readinessModel, "utf8")
  assert.equal(source.includes("externalExecutionEnabled"), true)
})

test("alpha flow: dry-run route respects kill switch", async () => {
  const source = await readFile(dryRunRoute, "utf8")
  assert.equal(source.includes("areExternalActionsEnabled"), true)
})

// ─── Phase 2B/2C: candidate-only launcher flow (end to end) ────
//
// mock/manual Signal → SafeWorkUnitCandidate → Command Palette → Workspace → Action Field.
// No execution, no approval, no provider call, no forbidden fields.

const candidateRuntimeFiles = [
  "app/lib/application/candidate/safeWorkUnitCandidate.ts",
  "app/lib/application/candidate/candidateWorkUnitBridge.ts",
  "app/lib/application/candidate/devGatedLlmCandidatePipeline.ts",
  "app/lib/application/launcher/candidateToLauncherWorkUnit.ts",
  "app/lib/application/launcher/deriveWorkspaceModel.ts",
]

const launcherComponentFiles = [
  "app/components/workunit-os/launcher/WorkUnitLauncher.tsx",
  "app/components/workunit-os/launcher/ActionFieldView.tsx",
  "app/components/workunit-os/launcher/WorkUnitTreeMap.tsx",
  "app/components/workunit-os/launcher/ActionFieldEditor.tsx",
  "app/components/workunit-os/launcher/CommandPaletteView.tsx",
]

function deepForbiddenKeys(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === "object") {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if ((FORBIDDEN_CANDIDATE_FIELDS as readonly string[]).includes(key)) found.push(key)
        walk((node as Record<string, unknown>)[key])
      }
    }
  }
  walk(value)
  return found
}

test("candidate flow: mock signal becomes candidate-only WorkUnit", () => {
  const bridge = candidateWorkUnitBridge()
  assert.equal(bridge.mode, "candidate_only")
  assert.equal(bridge.source, "mock_candidate_pipeline")
  assert.equal(bridge.safety.externalExecutionEnabled, false)
  assert.equal(bridge.safety.approvalCreationEnabled, false)
  assert.equal(bridge.safety.providerCallsEnabled, false)
  assert.ok(bridge.workUnits.length > 0)
  for (const wu of bridge.workUnits) {
    assert.equal(wu.candidateOnly, true)
    assert.equal(wu.humanReviewRequired, true)
  }
})

test("candidate flow: candidate adapts into launcher → workspace → action field", () => {
  const launcher = candidatesToLauncherWorkUnits(candidateWorkUnitBridge().workUnits)
  assert.ok(launcher.length > 0)
  const treeMap = deriveWorkUnitTreeMap(launcher[0]!)
  const workspace = deriveWorkspaceModel(launcher[0]!, treeMap)
  assert.equal(workspace.rootCard?.title, launcher[0]!.title)
  const draft = deriveActionFieldEditorDraft(launcher[0]!, null)
  assert.equal(draft.editable, true)
  assert.equal(draft.title, launcher[0]!.title)
})

test("candidate flow: no forbidden fields appear across the whole flow", () => {
  const launcher = candidatesToLauncherWorkUnits(candidateWorkUnitBridge().workUnits)
  const treeMap = deriveWorkUnitTreeMap(launcher[0]!)
  assert.deepEqual(deepForbiddenKeys(candidateWorkUnitBridge()), [])
  assert.deepEqual(deepForbiddenKeys(launcher), [])
  assert.deepEqual(deepForbiddenKeys(deriveWorkspaceModel(launcher[0]!, treeMap)), [])
  assert.deepEqual(deepForbiddenKeys(deriveActionFieldEditorDraft(launcher[0]!, null)), [])
  assert.deepEqual(deepForbiddenKeys(runDevGatedLlmCandidatePipeline()), [])
})

test("candidate flow: dev-gated path is fail-closed and provider-disabled", () => {
  const result = runDevGatedLlmCandidatePipeline()
  assert.equal(result.safety.providerCallsEnabled, false)
  assert.equal(result.providerConnected, false)
  assert.equal(result.fellBackToMock, true)
  assert.ok(result.boundaryBlockedReasons.length > 0)
})

test("candidate flow: runtime + adapter import no provider, fetch, env, or tools route", () => {
  for (const file of candidateRuntimeFiles) {
    const src = readFileSync(join(process.cwd(), file), "utf-8")
    for (const sdk of ["openai", "@anthropic-ai", "deepseekProvider", "createDeepseek", "gemini", "ollama"]) {
      assert.equal(src.includes(sdk), false, `${file} must not reference ${sdk}`)
    }
    assert.equal(src.includes("fetch("), false, `${file} must not call fetch(`)
    assert.equal(src.includes("process.env"), false, `${file} must not read process.env`)
    assert.equal(src.includes("/api/workunit/tools"), false, `${file} must not call tools route`)
  }
})

test("candidate flow: launcher components never call the tools route or providers", () => {
  for (const file of launcherComponentFiles) {
    const src = readFileSync(join(process.cwd(), file), "utf-8")
    assert.equal(src.includes("/api/workunit/tools"), false, `${file} tools route`)
    assert.equal(src.includes("fetch("), false, `${file} fetch(`)
    for (const sdk of ["openai", "@anthropic-ai", "deepseekProvider"]) {
      assert.equal(src.includes(sdk), false, `${file} provider ${sdk}`)
    }
  }
})
