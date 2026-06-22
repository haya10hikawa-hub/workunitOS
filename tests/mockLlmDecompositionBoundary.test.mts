import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { createStaticMockDecompositionLlm, validateMockDecompositionLlmOutput } from "../app/lib/application/decomposition/mockDecompositionLlm.ts"
import { runDecompositionOrchestrator } from "../app/lib/application/decomposition/decompositionOrchestrator.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = {
  source: "manual",
  externalId: "mock-boundary",
  capturedAt: "2026-06-22T00:00:00.000Z",
}

test("mock LLM schema rejects provider payload and forbidden fields", () => {
  assert.equal(validateMockDecompositionLlmOutput({ text: "safe", rawPayload: "{}" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "safe", confidence: 2 }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "approvalId: approval:1" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "provider-ready payload" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "raw provider payload body" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "providerPayload" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "hash: abc123" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "role: admin" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "hash" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "role" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "hash abc123" }).ok, false)
  assert.equal(validateMockDecompositionLlmOutput({ text: "role admin" }).ok, false)
})

test("orchestrator blocks provider payload text from mock LLM output", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "Slack投稿を準備する",
    sourceRef,
    mockLlm: createStaticMockDecompositionLlm({ text: "provider-ready payload" }),
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, "forbidden_mock_llm_output")
  assert.equal(result.mockCalled, true)
})

test("orchestrator blocks hash role and camelCase provider payload from mock LLM output", () => {
  for (const text of ["hash: abc123", "hash abc123", "role admin", "providerPayload"]) {
    const result = runDecompositionOrchestrator({
      safeInputSummary: "Slack投稿を準備する",
      sourceRef,
      mockLlm: createStaticMockDecompositionLlm({ text }),
    })
    assert.equal(result.ok, false)
    assert.equal(result.reason, "forbidden_mock_llm_output")
    assert.equal(result.mockCalled, true)
  }
})

test("mock LLM output cannot become Formal Node directly", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    mockLlm: createStaticMockDecompositionLlm({
      text: "A社契約書の修正要否をPM確認可能なメモにする",
      outcome: "PM can review the contract memo.",
      verifier: "human_owner",
      acceptanceCriteria: ["Human owner can verify before formalization."],
      confidence: 1,
    }),
  })
  if (!result.ok) assert.fail(result.reason)
  const flat = JSON.stringify(result)
  assert.equal(result.decomposition.target, "formal_node_candidate")
  assert.equal(result.decomposition.candidateOnly, true)
  assert.equal(result.decomposition.formalNodeCandidate?.humanReviewRequired, true)
  assert.equal(flat.includes("providerPayload"), false)
  assert.equal(flat.includes("approvedOutboundBody"), false)
  assert.equal(flat.includes("formalNodeId"), false)
})

test("mock orchestration source has no real LLM provider external execution or persistence imports", async () => {
  for (const file of ["decompositionOrchestrator.ts", "mockDecompositionLlm.ts"]) {
    const source = await readFile(`app/lib/application/decomposition/${file}`, "utf8")
    assert.equal(source.includes("OpenAI"), false, `${file} must not import OpenAI`)
    assert.equal(source.includes("Anthropic"), false, `${file} must not import Anthropic`)
    assert.equal(source.includes("DeepSeek"), false, `${file} must not import DeepSeek`)
    assert.equal(source.includes("Gemini"), false, `${file} must not import Gemini`)
    assert.equal(source.includes("Ollama"), false, `${file} must not import Ollama`)
    assert.equal(source.includes("fetch("), false, `${file} must not call fetch`)
    assert.equal(source.includes("/api/"), false, `${file} must not import API routes`)
    assert.equal(source.includes("/persistence/"), false, `${file} must not import persistence`)
    assert.equal(source.includes("supabase"), false, `${file} must not import Supabase`)
  }
})
