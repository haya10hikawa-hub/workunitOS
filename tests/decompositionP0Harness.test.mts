import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { runDecompositionGoldenCases, runDecompositionP0Cases } from "../app/lib/application/decomposition/decompositionGoldenRunner.ts"

function clock() {
  let now = 0
  return { now: () => ++now }
}

test("golden runner keeps results candidate-only and human-review gated", () => {
  const report = runDecompositionGoldenCases(clock())
  assert.equal(report.summary.failed, 0)
  const formal = report.results.find((result) => result.id === "formal-contract-memo")
  const merge = report.results.find((result) => result.id === "merge-candidate")
  const split = report.results.find((result) => result.id === "split-candidate")
  assert.equal(formal?.candidateTarget, "formal_node_candidate")
  if (formal?.result.ok) assert.equal(formal.result.promotionGate.humanReviewRequired, true)
  if (merge?.result.ok) assert.deepEqual(merge.result.promotionGate.blockedReasons, ["merge_candidate_to_merged"])
  if (split?.result.ok) assert.deepEqual(split.result.promotionGate.blockedReasons, ["split_candidate_to_finalized_split"])
})

test("P0 runner counts blocked cases separately without creating payloads", () => {
  const report = runDecompositionP0Cases(clock())
  assert.equal(report.summary.failed, 0)
  assert.equal(report.summary.p0Violations, 0)
  assert.ok(report.results.every((result) => result.safetyResult === "blocked"))
  for (const forbidden of ["approvedOutboundPayload", "providerPayload", "approvalId", "rawPayload", "tenantId", "sendableBody", "dbUpdatePayload"]) {
    assert.equal(JSON.stringify(report).includes(forbidden), false)
  }
})

test("golden runner source does not import UI API live LLM or persistence", async () => {
  const source = await readFile("app/lib/application/decomposition/decompositionGoldenRunner.ts", "utf8")
  for (const forbidden of ["react", "next/server", "OpenAI", "Anthropic", "fetch(", "/api/", "/persistence/", "supabase"]) {
    assert.equal(source.includes(forbidden), false)
  }
})
