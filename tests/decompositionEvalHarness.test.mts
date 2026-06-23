import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { runDecompositionEvalHarness } from "../app/lib/application/decomposition/decompositionEvalHarness.ts"
import { createStaticMockDecompositionLlm } from "../app/lib/application/decomposition/mockDecompositionLlm.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = { source: "manual", externalId: "phase1d-eval", capturedAt: "2026-06-23T00:00:00.000Z" }

function clock(step = 5) {
  let now = 0
  return { now: () => { now += step; return now } }
}

test("harness runs golden cases with mock orchestrator only", () => {
  const report = runDecompositionEvalHarness([{ id: "formal", expectedTarget: "formal_node_candidate", input: { safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする", sourceRef, mockLlm: createStaticMockDecompositionLlm({ text: "A社契約書の修正要否をPM確認可能なメモにする", outcome: "PM can review the memo.", verifier: "human_owner", acceptanceCriteria: ["Memo is reviewable."] }) } }], { clock: clock() })
  assert.equal(report.summary.passed, 1)
  assert.equal(report.results[0]?.result.ok, true)
  if (report.results[0]?.result.ok) assert.equal(report.results[0].result.mockBoundary, "mock_only")
})

test("harness reports pass fail latency and P0 separately without persistence", () => {
  const report = runDecompositionEvalHarness([
    { id: "ok", expectedTarget: "formal_node_candidate", input: { safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする", sourceRef, mockLlm: createStaticMockDecompositionLlm({ text: "A社契約書の修正要否をPM確認可能なメモにする", outcome: "PM can review the memo.", verifier: "human_owner", acceptanceCriteria: ["Memo is reviewable."] }) } },
    { id: "p0", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "providerPayload", sourceRef } },
  ], { clock: clock(10) })
  assert.equal(report.summary.total, 2)
  assert.equal(report.summary.passed, 2)
  assert.equal(report.summary.failed, 0)
  assert.equal(report.summary.p0Violations, 0)
  assert.equal(report.summary.latency.total, 7)
  assert.deepEqual(report.results[0]?.latency.map((sample) => [sample.metric, sample.elapsedMs, sample.budgetMs, sample.withinBudget]), [
    ["orchestration_shell_ms", 20, 300, true],
    ["mock_fast_extraction_ms", 10, 3000, true],
    ["mock_total_orchestration_ms", 30, 6000, true],
  ])
  assert.equal(JSON.stringify(report).includes("formalNodeId"), false)
})

test("harness fails wrong expectations malformed cases and P0 expectation drift", () => {
  const report = runDecompositionEvalHarness([
    { id: "wrong-target", expectedTarget: "formal_node_candidate", input: { safeInputSummary: "A社の件、金曜まで", sourceRef } },
    { id: "p0-drift", p0: true, expectBlockedReason: "forbidden_mock_llm_output", input: { safeInputSummary: "providerPayload", sourceRef } },
    { id: "malformed", input: { safeInputSummary: "A社の件、金曜まで", sourceRef } } as never,
  ], { clock: clock() })
  assert.equal(report.summary.total, 3)
  assert.equal(report.summary.passed, 0)
  assert.equal(report.summary.failed, 3)
  assert.equal(report.summary.p0Violations, 1)
})

test("harness source has no real LLM API persistence or execution imports", async () => {
  const source = (await Promise.all([
    "app/lib/application/decomposition/decompositionEvalHarness.ts",
    "app/lib/application/decomposition/decompositionLatencyModel.ts",
    "app/lib/application/decomposition/decompositionGoldenRunner.ts",
  ].map((path) => readFile(path, "utf8")))).join("\n")
  const imports = source.split("\n").filter((line) => line.startsWith("import")).join("\n")
  for (const forbidden of ["OpenAI", "Anthropic", "fetch(", "/api/", "/persistence/", "executionPayload"]) {
    assert.equal(imports.includes(forbidden), false)
  }
})
