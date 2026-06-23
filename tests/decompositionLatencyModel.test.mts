import test from "node:test"
import assert from "node:assert/strict"
import { buildLatencySample, summarizeLatencyBudget, type DecompositionLatencyBudget } from "../app/lib/application/decomposition/decompositionLatencyModel.ts"

test("latency sample reports deterministic budget status", () => {
  const ok = buildLatencySample("mock_total_orchestration_ms", 120, { orchestration_shell_ms: 1, mock_fast_extraction_ms: 1, mock_total_orchestration_ms: 200, p0_block_ms: 1 })
  const slow = buildLatencySample("p0_block_ms", 301, { orchestration_shell_ms: 1, mock_fast_extraction_ms: 1, mock_total_orchestration_ms: 1, p0_block_ms: 300 })
  assert.equal(ok.withinBudget, true)
  assert.equal(slow.withinBudget, false)
})

test("latency summary counts over-budget samples without mutation", () => {
  const samples = [buildLatencySample("orchestration_shell_ms", 10), buildLatencySample("orchestration_shell_ms", 301)]
  const summary = summarizeLatencyBudget(samples)
  assert.equal(summary.total, 2)
  assert.equal(summary.overBudget, 1)
  assert.equal(summary.samples, samples)
})

test("latency sample falls back for invalid elapsed and budget values", () => {
  const budget = { orchestration_shell_ms: Number.NaN } as DecompositionLatencyBudget
  const sample = buildLatencySample("orchestration_shell_ms", -1, budget)
  assert.equal(sample.elapsedMs, Number.POSITIVE_INFINITY)
  assert.equal(sample.budgetMs, 300)
  assert.equal(sample.withinBudget, false)
})
