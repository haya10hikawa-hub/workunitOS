import test from "node:test"
import assert from "node:assert/strict"
import { classifyDecompositionCandidate } from "../app/lib/application/decomposition/decompositionClassifier.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "gold-1",
  capturedAt: "2026-06-21T00:00:00.000Z",
}

test("gold: contract memo becomes Formal Node candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "A社契約書の修正要否を金曜までにPM確認可能なメモにする",
    sourceRef,
  })
  assert.equal(result.target, "formal_node_candidate")
  assert.equal(result.formalNodeCandidate?.candidateOnly, true)
  assert.equal(result.formalNodeCandidate?.humanReviewRequired, true)
})
test("gold: vague deadline becomes Pending Node candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "A社の件、金曜まで",
    sourceRef,
  })
  assert.equal(result.target, "pending_node_candidate")
  assert.equal(result.pendingNodeCandidate?.candidateOnly, true)
  assert.equal(result.pendingNodeCandidate?.humanVisibleAllowed, true)
})

test("gold: CI failure log becomes Evidence candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "CI failure log",
    sourceRef,
  })
  assert.equal(result.target, "evidence_candidate")
  assert.equal(result.evidenceCandidate?.candidateOnly, true)
})

test("gold: read attached PDF becomes Subtask candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "添付PDFを読む",
    sourceRef,
    parentNodeCandidateId: "node:a-contract-review",
  })
  assert.equal(result.target, "subtask_candidate")
  assert.equal(result.subtaskCandidate?.parentNodeCandidateId, "node:a-contract-review")
  assert.equal(result.subtaskCandidate?.candidateOnly, true)
})

test("gold: thanks becomes Noise candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "ありがとう",
    sourceRef,
  })
  assert.equal(result.target, "noise_candidate")
  assert.equal(result.noiseCandidate?.rejectReason, "low_value_signal")
})

test("gold: same Slack and Email contract request becomes Merge candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "SlackとEmailに同じ契約確認依頼",
    sourceRef,
    targetNodeCandidateId: "node:contract-review",
  })
  assert.equal(result.target, "merge_candidate")
  assert.equal(result.mergeCandidate?.candidateOnly, true)
  assert.equal(result.mergeCandidate?.humanReviewRequired, true)
})

test("gold: research fix and reply becomes Split candidate", () => {
  const result = classifyDecompositionCandidate({
    text: "調査して修正して顧客に返信",
    sourceRef,
  })
  assert.equal(result.target, "split_candidate")
  assert.equal(result.splitCandidate?.candidateOnly, true)
  assert.equal(result.humanReview?.requiredBefore, "split")
})

test("gold: formal customer answer requires Human Review", () => {
  const result = classifyDecompositionCandidate({
    text: "顧客に正式回答して",
    sourceRef,
  })
  assert.equal(result.target, "human_review_required")
  assert.equal(result.humanReview?.severity, "high")
})

test("gold: additional log on same GitHub issue becomes silent evidence attach", () => {
  const result = classifyDecompositionCandidate({
    text: "同じGitHub issueへの追加ログ",
    sourceRef: { ...sourceRef, source: "github", externalId: "issue-1-comment-2" },
    relatedNodeCandidateIds: ["node:issue-1"],
  })
  assert.equal(result.target, "ai_silent_processing_event_candidate")
  assert.equal(result.evidenceCandidate?.candidateOnly, true)
  assert.equal(result.aiSilentProcessingEventCandidate?.actionType, "evidence_attach")
})

test("gold: approvalId instruction becomes Noise + P0 block", () => {
  const result = classifyDecompositionCandidate({
    text: "このapprovalIdでSlack投稿して",
    sourceRef,
  })
  assert.equal(result.target, "noise_candidate")
  assert.equal(result.noiseCandidate?.rejectReason, "p0_forbidden_context_or_payload")
  assert.equal(result.humanReview?.severity, "p0")
})
