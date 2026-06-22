import test from "node:test"
import assert from "node:assert/strict"
import {
  buildDoneConditionDraft,
  canSilentlyProcess,
  classifyDecompositionCandidate,
  classifyPMCorrection,
  detectForbiddenPromotion,
  requiresHumanReview,
} from "../app/lib/application/decomposition/decompositionClassifier.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "pure-1",
  capturedAt: "2026-06-21T00:00:00.000Z",
}

test("pure model returns deterministic output for same input", () => {
  const input = {
    text: "A社契約書の修正要否を金曜までにPM確認可能なメモにする",
    sourceRef,
    now: "2026-06-21T00:00:00.000Z",
  }
  assert.deepEqual(classifyDecompositionCandidate(input), classifyDecompositionCandidate(input))
})
test("formal output is always candidate-only", () => {
  const result = classifyDecompositionCandidate({
    text: "A社契約書の修正要否を金曜までにPM確認可能なメモにする",
    sourceRef,
  })
  assert.equal(result.candidateOnly, true)
  assert.equal(result.formalNodeCandidate?.candidateOnly, true)
  assert.equal(JSON.stringify(result).includes('"status":"reviewed"'), false)
  assert.equal(JSON.stringify(result).includes('"trustLevel":"reviewed"'), false)
})

test("mock LLM-shaped output cannot become final Formal without Human Review", () => {
  const result = classifyDecompositionCandidate({
    text: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    outcome: "PM can review the contract decision memo.",
    verifier: "human_owner",
    acceptanceCriteria: ["Human owner can verify the memo before formalization."],
    context: { mockProvider: "mock-only", confidence: 0.99 },
  })
  const flat = JSON.stringify(result)
  assert.equal(result.target, "formal_node_candidate")
  assert.equal(result.candidateOnly, true)
  assert.equal(result.formalNodeCandidate?.humanReviewRequired, true)
  assert.equal(result.humanReview?.requiredBefore, "formalization")
  assert.equal(flat.includes('"formalNodeId"'), false)
  assert.equal(flat.includes('"reviewedAt"'), false)
  assert.equal(flat.includes('"approvedBy"'), false)
})

test("DoneConditionDraft complete is not final done", () => {
  const draft = buildDoneConditionDraft({
    text: "A社契約書の修正要否を金曜までにPM確認可能なメモにする",
    sourceRef,
  })
  assert.equal(draft.status, "complete")
  assert.equal(draft.candidateOnly, true)
  assert.equal(Object.hasOwn(draft, "done"), false)
  assert.equal(Object.hasOwn(draft, "approved"), false)
  assert.equal(Object.hasOwn(draft, "executable"), false)
})

test("requiresHumanReview catches high responsibility and high impact triggers", () => {
  assert.equal(requiresHumanReview({ highResponsibility: true }), true)
  assert.equal(requiresHumanReview({ lowConfidence: true, highImpact: true }), true)
  assert.equal(requiresHumanReview({ lowConfidence: true }), false)
})

test("canSilentlyProcess allows only low-risk processing", () => {
  assert.equal(canSilentlyProcess({ exactSourceMatch: true }), true)
  assert.equal(canSilentlyProcess({ exactSourceMatch: true, highImpact: true }), false)
  assert.equal(canSilentlyProcess({ noiseOnly: true, externalConsequence: true }), false)
})

test("PM correction taxonomy separates normal corrections from P0", () => {
  assert.equal(classifyPMCorrection({ expected: "evidence_candidate", actual: "formal_node_candidate" }), "wrong_formal_node")
  assert.equal(classifyPMCorrection({ expected: "formal_node_candidate", actual: "pending_node_candidate", humanReviewExpected: true, humanReviewActual: false }), "missed_human_review")
  assert.equal(classifyPMCorrection({ expected: "noise_candidate", actual: "noise_candidate", p0: true }), "p0_failure")
})

test("forbidden promotion detects sourceRef and AI verifier problems", () => {
  const doneCondition = buildDoneConditionDraft({
    text: "A社契約書の修正要否を金曜までにPM確認可能なメモにする",
    verifier: "AI",
  })
  const reasons = detectForbiddenPromotion({ from: "pending", to: "formal", doneCondition })
  assert.ok(reasons.includes("pending_to_formal_without_done_condition_gate"))
  assert.ok(reasons.includes("source_ref_required"))
  assert.ok(reasons.includes("ai_verifier_forbidden"))
})

test("merge and split classifier outputs are candidate-only", () => {
  const merge = classifyDecompositionCandidate({ text: "SlackとEmailに同じ契約確認依頼", sourceRef })
  const split = classifyDecompositionCandidate({ text: "調査して修正して顧客に返信", sourceRef })
  assert.equal(merge.mergeCandidate?.candidateOnly, true)
  assert.equal(split.splitCandidate?.candidateOnly, true)
  assert.equal(JSON.stringify(merge).includes('"merged"'), false)
  assert.equal(JSON.stringify(split).includes("finalized"), false)
})
