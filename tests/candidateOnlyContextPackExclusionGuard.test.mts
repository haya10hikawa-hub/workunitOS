import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  guardCandidateOnlyContextPackForMockBoundary,
  createSafeCandidateOnlyContextPackContract,
  type CandidateOnlyContextPackContract
} from "../app/lib/application/llmProvider/candidateOnlyContextPackExclusionGuard.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/candidateOnlyContextPackExclusionGuard.ts"), "utf-8")

const safeC = createSafeCandidateOnlyContextPackContract()

// ─── Safe path ────────────────────────────────────────────────

test("safe context pack allows mock boundary input", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary(safeC)
  assert.equal(r.decision, "allow_mock_boundary_input")
  assert.equal(r.reason, "safe_candidate_only_context_pack")
})

test("safe result has correct phase", () => {
  assert.equal(guardCandidateOnlyContextPackForMockBoundary(safeC).phase, "phase_4g_candidate_only_context_pack_exclusion_guard")
})

test("safe result has correct flowSegment", () => {
  assert.equal(guardCandidateOnlyContextPackForMockBoundary(safeC).flowSegment, "context_pack_contract_to_exclusion_guard_to_mock_boundary_input")
})

test("safe result includes CandidateOnlyMockBoundaryInput", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary(safeC)
  assert.ok(r.input)
  assert.equal(typeof r.input.prompt, "string")
  assert.equal(typeof r.input.maxOutputChars, "number")
})

test("safe prompt includes CONTEXT_PACK_CANDIDATE_ONLY", () => {
  assert.ok(guardCandidateOnlyContextPackForMockBoundary(safeC).input!.prompt.includes("[CONTEXT_PACK_CANDIDATE_ONLY]"))
})

test("safe prompt includes sanitizedText", () => {
  assert.ok(guardCandidateOnlyContextPackForMockBoundary(safeC).input!.prompt.includes(safeC.sanitizedText))
})

test("safe prompt includes sourceKinds", () => {
  assert.ok(guardCandidateOnlyContextPackForMockBoundary(safeC).input!.prompt.includes("manual"))
})

test("safe prompt says no raw signal included", () => {
  assert.ok(guardCandidateOnlyContextPackForMockBoundary(safeC).input!.prompt.includes("No raw signal included"))
})

test("safe prompt says no secrets included", () => {
  assert.ok(guardCandidateOnlyContextPackForMockBoundary(safeC).input!.prompt.includes("No secrets included"))
})

// ─── Blocked paths ────────────────────────────────────────────

test("empty sanitizedText blocks", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, sanitizedText: "" })
  assert.equal(r.decision, "block_mock_boundary_input")
  assert.equal(r.reason, "empty_sanitized_text")
  assert.equal(r.input, undefined)
})

test("whitespace-only sanitizedText blocks", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, sanitizedText: "   " })
  assert.equal(r.reason, "empty_sanitized_text")
})

test("safe prompt uses trimmed sanitizedText", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, sanitizedText: "  trimmed  " })
  assert.equal(r.decision, "allow_mock_boundary_input")
  assert.ok(r.input!.prompt.includes("trimmed"))
  assert.equal(r.input!.prompt.includes("  trimmed  "), false)
})

test("leading/trailing whitespace is removed from output prompt", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, sanitizedText: "\nhello\t" })
  assert.ok(r.input!.prompt.includes("hello"))
  assert.equal(r.input!.prompt.includes("\nhello\t"), false)
})


test("rawSignalIncluded true blocks via type-cast", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, rawSignalIncluded: true } as unknown as CandidateOnlyContextPackContract)
  assert.equal(r.reason, "raw_signal_not_allowed")
})

test("secretsIncluded true blocks via type-cast", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, secretsIncluded: true } as unknown as CandidateOnlyContextPackContract)
  assert.equal(r.reason, "secrets_not_allowed")
})

test("block severity finding blocks", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({
    ...safeC,
    exclusionFindings: [{ code: "raw_secret", severity: "block", redacted: true, evidencePreview: "[REDACTED]" }],
  })
  assert.equal(r.reason, "blocking_exclusion_finding")
})

test("warn severity finding does not block", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({
    ...safeC,
    exclusionFindings: [{ code: "api_key", severity: "warn", redacted: true, evidencePreview: "[REDACTED]" }],
  })
  assert.equal(r.decision, "allow_mock_boundary_input")
})

test("info severity finding does not block", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({
    ...safeC,
    exclusionFindings: [{ code: "unsafe_context", severity: "info", redacted: true, evidencePreview: "[REDACTED]" }],
  })
  assert.equal(r.decision, "allow_mock_boundary_input")
})

// ─── maxOutputChars ───────────────────────────────────────────

test("non-finite maxOutputChars blocks", () => {
  for (const n of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(guardCandidateOnlyContextPackForMockBoundary({ ...safeC, maxOutputChars: n }).reason, "invalid_max_output_chars")
  }
})

test("zero maxOutputChars blocks", () => {
  assert.equal(guardCandidateOnlyContextPackForMockBoundary({ ...safeC, maxOutputChars: 0 }).reason, "invalid_max_output_chars")
})

test("negative maxOutputChars blocks", () => {
  assert.equal(guardCandidateOnlyContextPackForMockBoundary({ ...safeC, maxOutputChars: -1 }).reason, "invalid_max_output_chars")
})

test("maxOutputChars over 1000 clamps to 1000", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, maxOutputChars: 5000 })
  assert.equal(r.decision, "allow_mock_boundary_input")
  assert.equal(r.input!.maxOutputChars, 1000)
})

// ─── Prompt safety ────────────────────────────────────────────

test("prompt does not include non-redacted evidence", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary(safeC)
  assert.equal(r.input!.prompt.includes("sk-"), false)
  assert.equal(r.input!.prompt.includes("SECRET"), false)
})

// ─── False invariants ─────────────────────────────────────────

test("safe result has all false flags", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary(safeC)
  assert.equal(r.candidateOnly, true)
  assert.equal(r.rawSignalIncluded, false)
  assert.equal(r.secretsIncluded, false)
  assert.equal(r.liveIntegrationAllowed, false)
  assert.equal(r.externalExecutionAllowed, false)
  assert.equal(r.approvalCreationAllowed, false)
  assert.equal(r.executionCreationAllowed, false)
  assert.equal(r.productionPipelineConnected, false)
  assert.equal(r.uiConnected, false)
  assert.equal(r.sourceSignalConnected, false)
  assert.equal(r.realContextPackBuilderConnected, false)
  assert.equal(r.realExclusionScannerConnected, false)
  assert.equal(r.decompositionClassifierConnected, false)
  assert.equal(r.decompositionOrchestratorConnected, false)
  assert.equal(r.actionFieldConnected, false)
  assert.equal(r.humanReviewConnected, false)
})

test("blocked result has all false flags", () => {
  const r = guardCandidateOnlyContextPackForMockBoundary({ ...safeC, sanitizedText: "" })
  assert.equal(r.candidateOnly, true)
  assert.equal(r.liveIntegrationAllowed, false)
  assert.equal(r.externalExecutionAllowed, false)
})

// ─── Serialized safety ────────────────────────────────────────

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(guardCandidateOnlyContextPackForMockBoundary(safeC))
  for (const f of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) assert.equal(s.includes(f), false)
  for (const f of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) assert.equal(s.includes(f), false)
})

// ─── Determinism + freshness ──────────────────────────────────

test("output is deterministic", () => {
  assert.deepEqual(guardCandidateOnlyContextPackForMockBoundary(safeC), guardCandidateOnlyContextPackForMockBoundary(safeC))
})

test("returned object is fresh per call", () => {
  const a = guardCandidateOnlyContextPackForMockBoundary(safeC)
  ;(a as unknown as { liveIntegrationAllowed: boolean }).liveIntegrationAllowed = true
  assert.equal(guardCandidateOnlyContextPackForMockBoundary(safeC).liveIntegrationAllowed, false)
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("source has no adapter or routing execution imports", () => {
  for (const p of ["runCandidateOnlyMockBoundaryHarness", "routeProviderAdapter", "BLOCKED_PROVIDER_ADAPTER", "DRY_RUN_PROVIDER_ADAPTER"]) {
    assert.equal(SRC.includes(p), false, `should not contain ${p}`)
  }
})

test("source has no upstream/downstream imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate"]) {
    assert.equal(SRC.includes(p), false)
  }
  for (const p of ["React", "useState", "useEffect", "route.ts", "Supabase", "createClient", "D1", "database"]) {
    assert.equal(SRC.includes(p), false)
  }
})
