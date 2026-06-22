import test from "node:test"
import assert from "node:assert/strict"
import { runDecompositionOrchestrator } from "../app/lib/application/decomposition/decompositionOrchestrator.ts"
import { createStaticMockDecompositionLlm } from "../app/lib/application/decomposition/mockDecompositionLlm.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "orchestrator-1",
  capturedAt: "2026-06-22T00:00:00.000Z",
}

test("orchestrator returns candidate-only FormalCandidate with Rule Gate and Human Review", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    hotMemorySummaries: ["A社契約の前回レビュー方針"],
    warmMemorySummaries: ["契約レビューはPM確認が必要"],
    coldMemoryRefs: ["cold:contract-history"],
    mockLlm: createStaticMockDecompositionLlm({
      text: "A社契約書の修正要否をPM確認可能なメモにする",
      outcome: "PM can review the contract memo.",
      verifier: "human_owner",
      acceptanceCriteria: ["Human owner can verify before formalization."],
      confidence: 0.99,
    }),
  })
  if (!result.ok) assert.fail(result.reason)
  const flat = JSON.stringify(result)
  assert.equal(result.phase, "candidate_only")
  assert.equal(result.decomposition.target, "formal_node_candidate")
  assert.equal(result.decomposition.formalNodeCandidate?.candidateOnly, true)
  assert.equal(result.decomposition.formalNodeCandidate?.humanReviewRequired, true)
  assert.equal(result.promotionGate.humanReviewRequired, true)
  assert.equal(result.coldMemoryPolicy.mayEnterLlmContext, false)
  assert.equal(flat.includes("reviewReady"), false)
  assert.equal(flat.includes("formalNodeId"), false)
  assert.equal(JSON.stringify(result.contextPack).includes("cold:contract-history"), false)
})

test("orchestrator keeps Merge and Split as candidate-only with finalization blocked", () => {
  const merge = runDecompositionOrchestrator({
    safeInputSummary: "SlackとEmailに同じ契約確認依頼",
    sourceRef,
    mockLlm: createStaticMockDecompositionLlm({ text: "SlackとEmailに同じ契約確認依頼" }),
  })
  const split = runDecompositionOrchestrator({
    safeInputSummary: "調査して修正して顧客に返信",
    sourceRef,
    mockLlm: createStaticMockDecompositionLlm({ text: "調査して修正して顧客に返信" }),
  })
  if (!merge.ok) assert.fail(merge.reason)
  if (!split.ok) assert.fail(split.reason)
  assert.equal(merge.decomposition.mergeCandidate?.candidateOnly, true)
  assert.equal(split.decomposition.splitCandidate?.candidateOnly, true)
  assert.ok(merge.promotionGate.blockedReasons.includes("merge_candidate_to_merged"))
  assert.ok(split.promotionGate.blockedReasons.includes("split_candidate_to_finalized_split"))
})

test("orchestrator Pending candidate exposes no Preview Approval or Execution fields", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社の件、金曜まで",
    sourceRef,
    mockLlm: createStaticMockDecompositionLlm({ text: "A社の件、金曜まで" }),
  })
  if (!result.ok) assert.fail(result.reason)
  const flat = JSON.stringify(result.decomposition.pendingNodeCandidate)
  for (const forbidden of ["Preview", "Approval", "Execution", "Execute"]) {
    assert.equal(flat.includes(forbidden), false)
  }
})
