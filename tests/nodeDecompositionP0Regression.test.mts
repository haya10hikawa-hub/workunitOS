import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  classifyDecompositionCandidate,
  detectForbiddenPromotion,
  evaluateDoneConditionDraft,
} from "../app/lib/application/decomposition/decompositionClassifier.ts"
import type { DoneConditionDraft } from "../app/lib/application/decomposition/types.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "p0",
  capturedAt: "2026-06-21T00:00:00.000Z",
}

const completeDone: DoneConditionDraft = {
  outcome: "PM can review the contract memo.",
  verifier: "human_owner",
  acceptanceCriteria: ["Memo is ready for PM review."],
  sourceRef,
  missingFields: [],
  status: "complete",
  invalidReasons: [],
  riskFlags: [],
  candidateOnly: true,
}

test("P0: DoneCondition complete must not promote to done", () => {
  const reasons = detectForbiddenPromotion({ from: "done_condition", to: "done", doneCondition: completeDone })
  assert.ok(reasons.includes("done_condition_complete_to_done"))
})
test("P0: Merge Candidate must not promote to merged", () => {
  const reasons = detectForbiddenPromotion({ from: "merge_candidate", to: "merged" })
  assert.ok(reasons.includes("merge_candidate_to_merged"))
})

test("P0: Split Candidate must not promote to finalized split", () => {
  const reasons = detectForbiddenPromotion({ from: "split_candidate", to: "finalized_split" })
  assert.ok(reasons.includes("split_candidate_to_finalized_split"))
})

test("P0: draft, preview, approval cannot skip boundaries", () => {
  assert.ok(detectForbiddenPromotion({ from: "draft", to: "approved" }).includes("draft_to_approved"))
  assert.ok(detectForbiddenPromotion({ from: "preview", to: "approval" }).includes("preview_to_approval"))
  assert.ok(detectForbiddenPromotion({ from: "approval", to: "execution" }).includes("approval_to_execution"))
})

test("P0: AI verifier is rejected", () => {
  const status = evaluateDoneConditionDraft({ ...completeDone, verifier: "AI" })
  assert.equal(status.status, "invalid")
  assert.ok(status.invalidReasons.includes("ai_verifier_forbidden"))
})

test("P0: sourceRef-less Formal Node is not accepted", () => {
  const result = classifyDecompositionCandidate({
    text: "A社契約書の修正要否を金曜までにPM確認可能なメモにする",
  })
  assert.notEqual(result.target, "formal_node_candidate")
  assert.equal(result.doneCondition.status, "partial")
  assert.ok(result.doneCondition.missingFields.includes("sourceRefOrHumanInputRef"))
})

test("P0: forbidden AI context fields are blocked", () => {
  const result = classifyDecompositionCandidate({
    text: "Slack投稿を準備する",
    sourceRef,
    context: { approvalId: "approval:1", nested: { targetHash: "hash" } },
  })
  assert.equal(result.target, "noise_candidate")
  assert.equal(result.humanReview?.severity, "p0")
  assert.ok(result.doneCondition.invalidReasons.includes("forbidden_context_field_present"))
})

test("P0: Pending candidate exposes no Draft Preview Approval Execution fields", () => {
  const result = classifyDecompositionCandidate({ text: "A社の件、金曜まで", sourceRef })
  const flat = JSON.stringify(result.pendingNodeCandidate)
  for (const forbidden of ["Draft", "Preview", "Approval", "Execution", "Execute"]) {
    assert.equal(flat.includes(forbidden), false)
  }
})

test("P0: decomposition source has no Tool Pin executable language", async () => {
  const source = await readFile("app/lib/application/decomposition/decompositionClassifier.ts", "utf8")
  assert.equal(source.includes("Tool Pin"), false)
  assert.equal(source.includes("Send / Post / Execute"), false)
})

test("P0: decomposition modules do not import UI API D1 provider fetch or live LLM", async () => {
  const files = [
    "types.ts",
    "doneConditionGate.ts",
    "promotionRules.ts",
    "pmCorrectionTaxonomy.ts",
    "decompositionClassifier.ts",
  ]
  for (const file of files) {
    const source = await readFile(`app/lib/application/decomposition/${file}`, "utf8")
    assert.equal(source.includes("react"), false, `${file} should not import react`)
    assert.equal(source.includes("next/server"), false, `${file} should not import API helpers`)
    assert.equal(source.includes("/api/"), false, `${file} should not import routes`)
    assert.equal(source.includes("/persistence/d1/"), false, `${file} should not import D1`)
    assert.equal(source.includes("/infrastructure/external/"), false, `${file} should not import providers`)
    assert.equal(source.includes("fetch("), false, `${file} should not call fetch`)
    assert.equal(source.includes("generateJson"), false, `${file} should not call live LLM providers`)
  }
})
