import test from "node:test"
import assert from "node:assert/strict"
import { runRuleGate } from "../app/lib/application/decomposition/ruleGate.ts"
import type { DoneConditionDraft } from "../app/lib/application/decomposition/types.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = { source: "manual", externalId: "gate", capturedAt: "2026-06-22T00:00:00.000Z" }
const completeDone: DoneConditionDraft = {
  outcome: "PM can review the result.",
  verifier: "human_owner",
  acceptanceCriteria: ["Human reviewer can verify the result."],
  sourceRef,
  missingFields: [],
  status: "complete",
  invalidReasons: [],
  riskFlags: [],
  candidateOnly: true,
}

test("Rule Gate blocks Pending Formal promotion without complete DoneCondition", () => {
  const result = runRuleGate({ boundary: "formal_candidate", source: "pending" })
  assert.equal(result.ok, false)
  assert.ok(result.blockedReasons.includes("pending_to_formal_without_done_condition_gate"))
})

test("Rule Gate blocks AI verifier and missing sourceRef for Formal candidate", () => {
  const result = runRuleGate({ boundary: "formal_candidate", source: "pending", doneCondition: { ...completeDone, verifier: "AI", sourceRef: undefined } })
  assert.equal(result.ok, false)
  assert.ok(result.blockedReasons.includes("ai_verifier_forbidden"))
  assert.ok(result.blockedReasons.includes("source_ref_required"))
})

test("Rule Gate blocks Preview Approval Execution boundary skips", () => {
  assert.ok(runRuleGate({ boundary: "approval" }).blockedReasons.includes("preview_to_approval"))
  assert.ok(runRuleGate({ boundary: "execution" }).blockedReasons.includes("approval_to_execution"))
})

test("Rule Gate blocks vector merge cache approval and executable Tool Pins", () => {
  const result = runRuleGate({
    boundary: "merge_finalization",
    vectorFinalizesMerge: true,
    cacheAuthorizesApproval: true,
    toolPinExecutable: true,
  })
  assert.equal(result.ok, false)
  assert.ok(result.blockedReasons.includes("merge_candidate_to_merged"))
  assert.ok(result.blockedReasons.includes("vector_merge_finalization"))
  assert.ok(result.blockedReasons.includes("cache_based_approval"))
  assert.ok(result.blockedReasons.includes("tool_pin_execution"))
})

test("Rule Gate blocks P0 LLM context fields before approval or preview", () => {
  const result = runRuleGate({ boundary: "preview", context: { approvedOutboundBody: "send this", nested: { approvalId: "a1" } } })
  assert.equal(result.ok, false)
  assert.ok(result.blockedReasons.includes("forbidden_context_field_present"))
})
