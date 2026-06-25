import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  runCandidateOnlyMockBoundaryHarness,
  createSafeCandidateOnlyMockBoundaryHarnessRequest,
  type CandidateOnlyMockBoundaryHarnessRequest,
} from "../app/lib/application/llmProvider/candidateOnlyMockBoundaryHarness.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/candidateOnlyMockBoundaryHarness.ts"), "utf-8")
const safe = createSafeCandidateOnlyMockBoundaryHarnessRequest()
const B = "blocked_provider_adapter" as const
const D = "dry_run_provider_adapter" as const

function req(overrides?: Partial<CandidateOnlyMockBoundaryHarnessRequest>): CandidateOnlyMockBoundaryHarnessRequest {
  return { ...safe, ...overrides, routingRequest: { ...safe.routingRequest, ...overrides?.routingRequest }, input: { ...safe.input, ...overrides?.input }, context: { ...safe.context, ...overrides?.context } }
}

// ─── Safe dry-run route ───────────────────────────────────────

test("safe harness request routes to dry_run_provider_adapter", () => {
  const r = runCandidateOnlyMockBoundaryHarness(safe)
  assert.equal(r.routing.selectedAdapterId, D)
  assert.equal(r.routing.decision, "route_to_dry_run_adapter")
  assert.equal(r.provider.adapterId, D)
})

test("safe harness provider text includes DRY_RUN_CANDIDATE_ONLY", () => {
  const r = runCandidateOnlyMockBoundaryHarness(safe)
  assert.ok(r.provider.textCandidate.includes("[DRY_RUN_CANDIDATE_ONLY]"))
})

test("safe harness provider text says no live provider was called", () => {
  assert.ok(runCandidateOnlyMockBoundaryHarness(safe).provider.textCandidate.includes("No live provider was called"))
})

test("safe harness does not echo raw prompt in serialized result", () => {
  const s = JSON.stringify(runCandidateOnlyMockBoundaryHarness(safe))
  assert.equal(s.includes("phase 4f dry-run prompt is not echoed"), false)
})

// ─── Blocked routes ───────────────────────────────────────────

test("absent requestedAdapterId routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, requestedAdapterId: undefined } }))
  assert.equal(r.routing.reason, "default_blocked")
  assert.equal(r.provider.blocked, true)
})

test("blocked route calls blocked provider adapter", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, requestedAdapterId: B } }))
  assert.equal(r.provider.adapterId, B)
  assert.equal(r.provider.blocked, true)
})

test("future_live_provider_adapter routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, requestedAdapterId: "future_live_provider_adapter" } }))
  assert.equal(r.routing.reason, "future_live_provider_adapter_blocked")
  assert.equal(r.provider.blocked, true)
})

test("unknown runtime adapter id routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, requestedAdapterId: "unknown_id" } }))
  assert.equal(r.routing.reason, "unknown_requested_adapter")
  assert.equal(r.provider.blocked, true)
})

// ─── Gate conditions ──────────────────────────────────────────

test("dry_run without explicit request routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, dryRunExplicitlyRequested: false } }))
  assert.equal(r.routing.reason, "dry_run_not_explicitly_requested")
  assert.equal(r.provider.blocked, true)
})

test("dry_run with no_go design gate routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, dryRunDesignDecision: "no_go" } }))
  assert.equal(r.routing.reason, "dry_run_design_gate_not_go")
  assert.equal(r.provider.blocked, true)
})

test("dry_run with conditional_go design gate routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, dryRunDesignDecision: "conditional_go" } }))
  assert.equal(r.routing.reason, "dry_run_design_gate_not_go")
  assert.equal(r.provider.blocked, true)
})

test("dry_run with liveProviderRequested true routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, liveProviderRequested: true } }))
  assert.equal(r.routing.reason, "live_provider_requested")
  assert.equal(r.provider.blocked, true)
})

test("dry_run with externalExecutionRequested true routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, externalExecutionRequested: true } }))
  assert.equal(r.routing.reason, "external_execution_requested")
})

test("dry_run with approvalCreationRequested true routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, approvalCreationRequested: true } }))
  assert.equal(r.routing.reason, "approval_creation_requested")
})

test("dry_run with executionCreationRequested true routes to blocked", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, executionCreationRequested: true } }))
  assert.equal(r.routing.reason, "execution_creation_requested")
})

// ─── Safety flags ─────────────────────────────────────────────

test("candidateOnly is true for blocked and dry-run", () => {
  assert.equal(runCandidateOnlyMockBoundaryHarness(safe).candidateOnly, true)
  assert.equal(runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, requestedAdapterId: undefined } })).candidateOnly, true)
})

test("all false flags hold for blocked and dry-run", () => {
  for (const r of [runCandidateOnlyMockBoundaryHarness(safe), runCandidateOnlyMockBoundaryHarness(req({ routingRequest: { ...safe.routingRequest, requestedAdapterId: undefined } }))]) {
    assert.equal(r.liveIntegrationAllowed, false)
    assert.equal(r.externalExecutionAllowed, false)
    assert.equal(r.approvalCreationAllowed, false)
    assert.equal(r.executionCreationAllowed, false)
  }
})

// ─── Disconnected flags ───────────────────────────────────────

test("productionPipelineConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).productionPipelineConnected, false) })
test("uiConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).uiConnected, false) })
test("sourceSigConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).sourceSigConnected, false) })
test("ctxPackConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).ctxPackConnected, false) })
test("exclScanConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).exclScanConnected, false) })
test("decompClassConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).decompClassConnected, false) })
test("actionConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).actionConnected, false) })
test("reviewConnected is false", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).reviewConnected, false) })

// ─── Provider invariants ──────────────────────────────────────

test("provider result also preserves candidateOnly true", () => { assert.equal(runCandidateOnlyMockBoundaryHarness(safe).provider.candidateOnly, true) })
test("provider result also preserves all false flags", () => {
  const p = runCandidateOnlyMockBoundaryHarness(safe).provider
  assert.equal(p.liveIntegrationAllowed, false)
  assert.equal(p.externalExecutionAllowed, false)
  assert.equal(p.approvalCreationAllowed, false)
  assert.equal(p.executionCreationAllowed, false)
})

// ─── maxOutputChars ───────────────────────────────────────────

test("maxOutputChars respected through dry-run adapter", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ input: { prompt: "p", maxOutputChars: 20 } }))
  assert.ok(r.provider.textCandidate.length <= 20)
})

test("negative maxOutputChars remains safe", () => {
  const r = runCandidateOnlyMockBoundaryHarness(req({ input: { prompt: "p", maxOutputChars: -1 } }))
  assert.equal(r.provider.textCandidate, "")
})

// ─── Determinism + freshness ──────────────────────────────────

test("output is deterministic", () => { assert.deepEqual(runCandidateOnlyMockBoundaryHarness(safe), runCandidateOnlyMockBoundaryHarness(safe)) })

test("result object is fresh per call", () => {
  const a = runCandidateOnlyMockBoundaryHarness(safe)
  ;(a as unknown as { liveIntegrationAllowed: boolean }).liveIntegrationAllowed = true
  assert.equal(runCandidateOnlyMockBoundaryHarness(safe).liveIntegrationAllowed, false)
})

// ─── Serialized safety ────────────────────────────────────────

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(runCandidateOnlyMockBoundaryHarness(safe))
  for (const f of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) assert.equal(s.includes(f), false)
  for (const f of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) assert.equal(s.includes(f), false)
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("source has no upstream/downstream imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate",
    "Source Signal", "sourceSignal", "LLMContextPack", "ContextPack", "Exclusion Scanner", "exclusionScanner",
    "Decomposition Classifier", "decompositionClassifier", "Decomposition Orchestrator", "decompositionOrchestrator",
    "Action Field", "actionField", "Human Review", "humanReview"]) {
    // Use word-boundary regex so sourceSignal doesn't match inside sourceSignalConnected etc.
    const re = new RegExp("\\b" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b")
    assert.equal(re.test(SRC), false, `should not contain ${p}`)
  }
})

test("source has no UI/API/persistence imports", () => {
  for (const p of ["React", "useState", "useEffect", "route.ts", "Supabase", "createClient", "D1", "database"]) {
    assert.equal(SRC.includes(p), false, `should not contain ${p}`)
  }
})
