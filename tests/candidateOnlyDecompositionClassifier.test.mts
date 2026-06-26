import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  classifyCandidateOnlyMockBoundaryResult,
  createBlockedCandidateOnlyDecompositionClassifierResult,
} from "../app/lib/application/llmProvider/candidateOnlyDecompositionClassifier.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/candidateOnlyDecompositionClassifier.ts"), "utf-8")

// Local fixtures — no runtime imports from 4F/4G/4H
function mockHarness(opts?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    candidateOnly: true,
    liveIntegrationAllowed: false,
    externalExecutionAllowed: false,
    approvalCreationAllowed: false,
    executionCreationAllowed: false,
    routing: {
      decision: opts?.decision ?? "route_to_dry_run_adapter",
      selectedAdapterId: "dry_run_provider_adapter",
      reason: "dry_run_adapter_allowed",
    },
    provider: {
      adapterId: "dry_run_provider_adapter",
      mode: "dry_run",
      blocked: opts?.providerBlocked ?? (opts?.blocked ?? false),
      candidateOnly: opts?.providerCandidateOnly ?? true,
      liveIntegrationAllowed: false,
      externalExecutionAllowed: false,
      approvalCreationAllowed: false,
      executionCreationAllowed: false,
      textCandidate: opts?.text ?? "[DRY_RUN_CANDIDATE_ONLY] No live provider was called.",
    },
  }
}

const dryRun = mockHarness()
const blockedProvider = mockHarness({ providerBlocked: true, text: "[BLOCKED]" })

// ─── Classification ───────────────────────────────────────────

test("dry-run mock boundary result classifies as workunit_candidate", () => {
  const r = classifyCandidateOnlyMockBoundaryResult(dryRun)
  assert.equal(r.candidateType, "workunit_candidate")
  assert.equal(r.decision, "classify_candidate_type")
  assert.equal(r.reason, "dry_run_workunit_candidate_detected")
})

test("blocked provider result classifies as blocked_candidate", () => {
  const r = classifyCandidateOnlyMockBoundaryResult(blockedProvider)
  assert.equal(r.candidateType, "blocked_candidate")
  assert.equal(r.decision, "block_candidate_type")
  assert.equal(r.reason, "mock_boundary_blocked")
})

test("non-dry-run routing decision classifies as blocked_candidate", () => {
  const r = classifyCandidateOnlyMockBoundaryResult(mockHarness({ decision: "route_to_blocked_adapter", text: "[BLOCKED]", providerBlocked: true }))
  assert.equal(r.candidateType, "blocked_candidate")
})

test("empty textCandidate classifies as clarification_needed", () => {
  const r = classifyCandidateOnlyMockBoundaryResult(mockHarness({ text: "" }))
  assert.equal(r.candidateType, "clarification_needed")
  assert.equal(r.reason, "missing_mock_boundary_text")
})

test("whitespace-only textCandidate classifies as clarification_needed", () => {
  const r = classifyCandidateOnlyMockBoundaryResult(mockHarness({ text: "   " }))
  assert.equal(r.candidateType, "clarification_needed")
})

test("non-empty unknown textCandidate classifies as clarification_needed", () => {
  const r = classifyCandidateOnlyMockBoundaryResult(mockHarness({ text: "some unknown result" }))
  assert.equal(r.candidateType, "clarification_needed")
  assert.equal(r.reason, "unknown_candidate_shape")
})

// ─── False invariants ─────────────────────────────────────────

test("candidateOnly is true", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).candidateOnly, true) })
test("rawCandidateTextIncluded is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).rawCandidateTextIncluded, false) })
test("liveIntegrationAllowed is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).liveIntegrationAllowed, false) })
test("externalExecutionAllowed is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).externalExecutionAllowed, false) })
test("approvalCreationAllowed is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).approvalCreationAllowed, false) })
test("executionCreationAllowed is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).executionCreationAllowed, false) })
test("productionPipelineConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).productionPipelineConnected, false) })
test("uiConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).uiConnected, false) })
test("apiConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).apiConnected, false) })
test("sourceSignalConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).sourceSignalConnected, false) })
test("realContextPackBuilderConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).realContextPackBuilderConnected, false) })
test("realExclusionScannerConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).realExclusionScannerConnected, false) })
test("mockBoundaryHarnessConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).mockBoundaryHarnessConnected, false) })
test("guardedChainConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).guardedChainConnected, false) })
test("decompositionOrchestratorConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).decompositionOrchestratorConnected, false) })
test("actionFieldConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).actionFieldConnected, false) })
test("humanReviewConnected is false", () => { assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).humanReviewConnected, false) })

// ─── Serialized safety ────────────────────────────────────────

test("serialized result has no raw candidate text", () => {
  const s = JSON.stringify(classifyCandidateOnlyMockBoundaryResult(dryRun))
  assert.equal(s.includes("[DRY_RUN_CANDIDATE_ONLY]"), false)
  assert.equal(s.includes("No live provider was called"), false)
})

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(classifyCandidateOnlyMockBoundaryResult(dryRun))
  for (const f of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) assert.equal(s.includes(f), false)
  for (const f of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) assert.equal(s.includes(f), false)
})

// ─── Determinism + freshness ──────────────────────────────────

test("output is deterministic", () => {
  assert.deepEqual(classifyCandidateOnlyMockBoundaryResult(dryRun), classifyCandidateOnlyMockBoundaryResult(dryRun))
})

test("returned object is fresh per call", () => {
  const a = classifyCandidateOnlyMockBoundaryResult(dryRun)
  ;(a as unknown as Record<string, boolean>).liveIntegrationAllowed = true
  assert.equal(classifyCandidateOnlyMockBoundaryResult(dryRun).liveIntegrationAllowed, false)
})

// ─── Helper ───────────────────────────────────────────────────

test("createBlockedCandidateOnlyDecompositionClassifierResult returns blocked", () => {
  const r = createBlockedCandidateOnlyDecompositionClassifierResult("default_blocked")
  assert.equal(r.decision, "block_candidate_type")
  assert.equal(r.candidateType, "blocked_candidate")
  assert.equal(r.candidateOnly, true)
  assert.equal(r.liveIntegrationAllowed, false)
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("source has no forbidden runtime imports", () => {
  for (const p of ["BLOCKED_PROVIDER_ADAPTER", "DRY_RUN_PROVIDER_ADAPTER", "routeProviderAdapter",
    "runCandidateOnlyMockBoundaryHarness", "guardCandidateOnlyContextPackForMockBoundary", "runGuardedCandidateOnlyMockBoundaryChain"]) {
    assert.equal(SRC.includes(p), false, `should not contain ${p}`)
  }
})

test("source has no upstream/downstream imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate",
    "route.ts", "React", "useState", "useEffect", "Supabase", "createClient", "D1", "database"]) {
    assert.equal(SRC.includes(p), false)
  }
})

test("source imports only CandidateOnlyMockBoundaryHarnessResult as type-only", () => {
  const imports = SRC.match(/^import .+$/gm) ?? []
  assert.equal(imports.length, 1)
  assert.ok(imports[0].startsWith("import type "))
  assert.ok(imports[0].includes("CandidateOnlyMockBoundaryHarnessResult"))
  assert.ok(imports[0].includes("./candidateOnlyMockBoundaryHarness.ts"))
})
