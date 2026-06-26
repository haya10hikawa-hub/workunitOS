import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  runGuardedCandidateOnlyMockBoundaryChain,
  createSafeGuardedCandidateOnlyMockBoundaryChainRequest,
} from "../app/lib/application/llmProvider/guardedCandidateOnlyMockBoundaryChain.ts"
import type { CandidateOnlyContextPackContract } from "../app/lib/application/llmProvider/candidateOnlyContextPackExclusionGuard.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/guardedCandidateOnlyMockBoundaryChain.ts"), "utf-8")
const safeReq = createSafeGuardedCandidateOnlyMockBoundaryChainRequest()

// ─── Safe path ────────────────────────────────────────────────

test("safe chain request produces candidate-only mock boundary result", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain(safeReq)
  assert.equal(r.decision, "produce_candidate_only_mock_boundary_result")
  assert.equal(r.reason, "context_pack_guard_allowed")
})

test("safe chain includes contextGuard", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain(safeReq)
  assert.ok(r.contextGuard)
  assert.equal(r.contextGuard.decision, "allow_mock_boundary_input")
})

test("safe chain includes mockBoundary result", () => {
  assert.ok(runGuardedCandidateOnlyMockBoundaryChain(safeReq).mockBoundary)
})

test("safe chain mockBoundary provider text includes DRY_RUN_CANDIDATE_ONLY", () => {
  assert.ok(runGuardedCandidateOnlyMockBoundaryChain(safeReq).mockBoundary!.provider.textCandidate.includes("[DRY_RUN_CANDIDATE_ONLY]"))
})

test("safe chain mockBoundary provider text says no live provider was called", () => {
  assert.ok(runGuardedCandidateOnlyMockBoundaryChain(safeReq).mockBoundary!.provider.textCandidate.includes("No live provider was called"))
})

// ─── Guard-blocked paths ──────────────────────────────────────

test("guard-blocked empty sanitizedText returns block_before_mock_boundary", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, contextPack: { ...safeReq.contextPack, sanitizedText: "" } })
  assert.equal(r.decision, "block_before_mock_boundary")
  assert.equal(r.reason, "context_pack_guard_blocked")
  assert.equal(r.mockBoundary, undefined)
})

test("guard-blocked rawSignalIncluded returns block_before_mock_boundary", () => {
  const cp = { ...safeReq.contextPack, rawSignalIncluded: true } as unknown as CandidateOnlyContextPackContract
  assert.equal(runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, contextPack: cp }).decision, "block_before_mock_boundary")
})

test("guard-blocked secretsIncluded returns block_before_mock_boundary", () => {
  const cp = { ...safeReq.contextPack, secretsIncluded: true } as unknown as CandidateOnlyContextPackContract
  assert.equal(runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, contextPack: cp }).decision, "block_before_mock_boundary")
})

test("guard-blocked block-severity finding returns block_before_mock_boundary", () => {
  const cp = { ...safeReq.contextPack, exclusionFindings: [{ code: "raw_secret" as const, severity: "block" as const, redacted: true as const, evidencePreview: "[REDACTED]" as const }] }
  assert.equal(runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, contextPack: cp }).decision, "block_before_mock_boundary")
})

test("guard-blocked invalid maxOutputChars returns block_before_mock_boundary", () => {
  assert.equal(runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, contextPack: { ...safeReq.contextPack, maxOutputChars: 0 } }).decision, "block_before_mock_boundary")
})

// ─── Unsafe routing through harness (still produces candidate-only) ──

test("safe context with routing blocked returns candidate-only blocked provider", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, routingRequest: { ...safeReq.routingRequest, requestedAdapterId: undefined } })
  assert.equal(r.decision, "produce_candidate_only_mock_boundary_result")
  assert.equal(r.mockBoundary!.provider.blocked, true)
})

test("safe context with future_live routing returns blocked provider", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, routingRequest: { ...safeReq.routingRequest, requestedAdapterId: "future_live_provider_adapter" } })
  assert.equal(r.decision, "produce_candidate_only_mock_boundary_result")
  assert.equal(r.mockBoundary!.routing.reason, "future_live_provider_adapter_blocked")
})

test("safe context with unknown adapter routing returns blocked provider", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, routingRequest: { ...safeReq.routingRequest, requestedAdapterId: "unknown" } })
  assert.equal(r.mockBoundary!.provider.blocked, true)
})

test("safe context with liveProviderRequested true returns blocked provider", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, routingRequest: { ...safeReq.routingRequest, liveProviderRequested: true } })
  assert.equal(r.mockBoundary!.routing.reason, "live_provider_requested")
})

test("safe context with externalExecutionRequested true returns blocked provider", () => {
  const r = runGuardedCandidateOnlyMockBoundaryChain({ ...safeReq, routingRequest: { ...safeReq.routingRequest, externalExecutionRequested: true } })
  assert.equal(r.mockBoundary!.routing.reason, "external_execution_requested")
})

// ─── False invariants ─────────────────────────────────────────

test("candidateOnly is true", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).candidateOnly, true) })
test("liveIntegrationAllowed is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).liveIntegrationAllowed, false) })
test("externalExecutionAllowed is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).externalExecutionAllowed, false) })
test("approvalCreationAllowed is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).approvalCreationAllowed, false) })
test("executionCreationAllowed is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).executionCreationAllowed, false) })
test("productionPipelineConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).productionPipelineConnected, false) })
test("uiConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).uiConnected, false) })
test("apiConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).apiConnected, false) })
test("sourceSignalConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).sourceSignalConnected, false) })
test("realContextPackBuilderConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).realContextPackBuilderConnected, false) })
test("realExclusionScannerConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).realExclusionScannerConnected, false) })
test("decompositionClassifierConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).decompositionClassifierConnected, false) })
test("decompositionOrchestratorConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).decompositionOrchestratorConnected, false) })
test("actionFieldConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).actionFieldConnected, false) })
test("humanReviewConnected is false", () => { assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).humanReviewConnected, false) })

// ─── Serialized safety ────────────────────────────────────────

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(runGuardedCandidateOnlyMockBoundaryChain(safeReq))
  for (const f of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) assert.equal(s.includes(f), false)
  for (const f of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) assert.equal(s.includes(f), false)
})

// ─── Determinism + freshness ──────────────────────────────────

test("output is deterministic", () => {
  assert.deepEqual(runGuardedCandidateOnlyMockBoundaryChain(safeReq), runGuardedCandidateOnlyMockBoundaryChain(safeReq))
})

test("returned object is fresh per call", () => {
  const a = runGuardedCandidateOnlyMockBoundaryChain(safeReq)
  ;(a as unknown as { liveIntegrationAllowed: boolean }).liveIntegrationAllowed = true
  assert.equal(runGuardedCandidateOnlyMockBoundaryChain(safeReq).liveIntegrationAllowed, false)
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("source has no direct adapter or routing imports", () => {
  for (const p of ["BLOCKED_PROVIDER_ADAPTER", "DRY_RUN_PROVIDER_ADAPTER", "routeProviderAdapter"]) {
    assert.equal(SRC.includes(p), false, `should not contain ${p}`)
  }
})

test("source has no upstream/downstream imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate",
    "route.ts", "React", "useState", "useEffect", "Supabase", "createClient", "D1", "database"]) {
    assert.equal(SRC.includes(p), false)
  }
})
