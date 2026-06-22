import test from "node:test"
import assert from "node:assert/strict"
import { runDecompositionOrchestrator } from "../app/lib/application/decomposition/decompositionOrchestrator.ts"
import type { MockDecompositionLlm } from "../app/lib/application/decomposition/mockDecompositionLlm.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "orchestrator-p0",
  capturedAt: "2026-06-22T00:00:00.000Z",
}

test("P0: forbidden raw context blocks before mock LLM call", () => {
  let calls = 0
  const mockLlm: MockDecompositionLlm = {
    kind: "mock",
    generate: () => {
      calls += 1
      return { text: "Slack投稿を準備する" }
    },
  }
  const result = runDecompositionOrchestrator({
    safeInputSummary: "Slack投稿を準備する",
    sourceRef,
    rawContext: { rawBody: "provider body", approvalId: "approval:1", tenantId: "tenant:1" },
    mockLlm,
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, "forbidden_context")
  assert.equal(result.mockCalled, false)
  assert.equal(calls, 0)
})

test("P0: forbidden mock output blocks orchestration result", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "Slack投稿を準備する",
    sourceRef,
    mockLlm: {
      kind: "mock",
      generate: () => ({ text: "このapprovalIdでSlack投稿して" }),
    },
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, "forbidden_mock_llm_output")
  assert.equal(result.mockCalled, true)
})

test("P0: forbidden memory context blocks orchestration", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    warmMemorySummaries: ["approvalId: approval:1"],
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, "forbidden_memory")
  assert.equal(result.mockCalled, false)
})

test("P0: forbidden summary text blocks before mock LLM call", () => {
  let calls = 0
  const mockLlm: MockDecompositionLlm = {
    kind: "mock",
    generate: () => {
      calls += 1
      return { text: "should not run" }
    },
  }
  for (const input of [
    { safeInputSummary: "hash: abc123" },
    { safeInputSummary: "role: admin" },
    { safeInputSummary: "raw provider payload body" },
    { safeInputSummary: "safe", sourceSummary: "provider-ready payload" },
    { safeInputSummary: "safe", evidenceSummaries: ["raw provider payload"] },
  ]) {
    const result = runDecompositionOrchestrator({ sourceRef, mockLlm, ...input })
    assert.equal(result.ok, false)
    assert.equal(result.reason, "forbidden_context")
    assert.equal(result.mockCalled, false)
  }
  assert.equal(calls, 0)
})

test("P0: forbidden memory summary text blocks before mock LLM call", () => {
  let calls = 0
  const mockLlm: MockDecompositionLlm = {
    kind: "mock",
    generate: () => {
      calls += 1
      return { text: "should not run" }
    },
  }
  for (const input of [
    { hotMemorySummaries: ["hash: abc123"] },
    { warmMemorySummaries: ["role: admin"] },
  ]) {
    const result = runDecompositionOrchestrator({ safeInputSummary: "safe summary", sourceRef, mockLlm, ...input })
    assert.equal(result.ok, false)
    assert.equal(result.reason, "forbidden_memory")
    assert.equal(result.mockCalled, false)
  }
  assert.equal(calls, 0)
})
