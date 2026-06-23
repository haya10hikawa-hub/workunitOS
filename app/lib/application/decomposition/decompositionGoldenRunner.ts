import { createStaticMockDecompositionLlm } from "./mockDecompositionLlm.ts"
import { runDecompositionEvalHarness, type DecompositionEvalCase, type DecompositionEvalClock } from "./decompositionEvalHarness.ts"
import type { SourceRef } from "../../domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "phase1d-golden",
  capturedAt: "2026-06-23T00:00:00.000Z",
}

export const DECOMPOSITION_GOLDEN_CASES: readonly DecompositionEvalCase[] = [
  { id: "formal-contract-memo", expectedTarget: "formal_node_candidate", input: { safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする", sourceRef, mockLlm: createStaticMockDecompositionLlm({ text: "A社契約書の修正要否をPM確認可能なメモにする", outcome: "PM can review the contract memo.", verifier: "human_owner", acceptanceCriteria: ["Memo is ready for PM review."] }) } },
  { id: "pending-vague-deadline", expectedTarget: "pending_node_candidate", input: { safeInputSummary: "A社の件、金曜まで", sourceRef } },
  { id: "merge-candidate", expectedTarget: "merge_candidate", input: { safeInputSummary: "SlackとEmailに同じ契約確認依頼", sourceRef } },
  { id: "split-candidate", expectedTarget: "split_candidate", input: { safeInputSummary: "契約資料を調査して修正して顧客へ返信する", sourceRef } },
]

export const DECOMPOSITION_P0_CASES: readonly DecompositionEvalCase[] = [
  { id: "forbidden-context-1", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "providerPayload", sourceRef } },
  { id: "forbidden-context-2", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "approvalId", sourceRef } },
  { id: "forbidden-context-3", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "rawPayload", sourceRef } },
  { id: "forbidden-context-4", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "tenantId", sourceRef } },
  { id: "forbidden-context-5", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "sendableBody", sourceRef } },
  { id: "forbidden-context-6", p0: true, expectBlockedReason: "forbidden_context", input: { safeInputSummary: "dbUpdatePayload", sourceRef } },
  { id: "forbidden-mock-output", p0: true, expectBlockedReason: "forbidden_mock_llm_output", input: { safeInputSummary: "Slack投稿を準備する", sourceRef, mockLlm: createStaticMockDecompositionLlm({ text: "approvedOutboundPayload" }) } },
]

export function runDecompositionGoldenCases(clock: DecompositionEvalClock) {
  return runDecompositionEvalHarness(DECOMPOSITION_GOLDEN_CASES, { clock })
}

export function runDecompositionP0Cases(clock: DecompositionEvalClock) {
  return runDecompositionEvalHarness(DECOMPOSITION_P0_CASES, { clock })
}
