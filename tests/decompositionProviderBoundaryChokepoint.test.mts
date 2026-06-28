/**
 * Phase 2A — provider boundary is the mandatory chokepoint for decomposition.
 *
 * Proves that the decomposition orchestrator routes any non-mock provider through
 * evaluateLlmProviderBoundary (which fails closed) before generation, that the mock
 * provider is never asked to generate in that case, and that the mock path is
 * unchanged. No real provider is connected; the readiness gate stays the gate.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { runDecompositionOrchestrator } from "../app/lib/application/decomposition/decompositionOrchestrator.ts"
import { createStaticMockDecompositionLlm, type MockDecompositionLlm } from "../app/lib/application/decomposition/mockDecompositionLlm.ts"
import { evaluateLlmProviderBoundary } from "../app/lib/application/llmProvider/llmProviderBoundary.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"
import type { LLMContextPack } from "../app/lib/application/llmContext/types.ts"
import type { SourceRef } from "../app/lib/domain/types.ts"

const sourceRef: SourceRef = { source: "manual", externalId: "chokepoint-1", capturedAt: "2026-06-22T00:00:00.000Z" }

// A provider that lies about being a mock (kind !== "mock"). It must never be asked
// to generate; the orchestrator must refuse it at the boundary first.
function nonMockProvider(onGenerate: () => void): MockDecompositionLlm {
  return { kind: "real_provider", generate: () => { onGenerate(); return { text: "should never run" } } } as unknown as MockDecompositionLlm
}

test("non-mock provider is refused at the boundary before any generation", () => {
  let generated = false
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    mockLlm: nonMockProvider(() => { generated = true }),
  })
  assert.equal(generated, false, "provider must not generate when it is non-mock")
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, "real_provider_requires_readiness_gate")
  assert.equal(result.mockCalled, false)
  assert.equal(result.mockBoundary, "mock_only")
  assert.equal(result.candidateOnly, true)
})

test("the boundary verdict surfaced by the orchestrator fails closed", () => {
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    mockLlm: nonMockProvider(() => {}),
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  // Runtime controls are unwired in the candidate-only phase, so the boundary blocks
  // on closed controls (strictly stronger than provider_implementation_missing).
  assert.equal((result.findings ?? []).includes("feature_flag_disabled"), true)
  assert.equal((result.findings ?? []).length > 0, true)
})

test("readiness gate is the terminal block even when every control is green", () => {
  // Verify-before-call ordering: with the required policy satisfied and all runtime
  // controls open, there is still no provider implementation, so it fails closed.
  const safePack: LLMContextPack = {
    route: "fast_extraction",
    nodeSummary: "Editable candidate only",
    constraints: { externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [] },
  }
  const boundary = evaluateLlmProviderBoundary({
    request: { contextPack: safePack },
    controls: { featureFlagEnabled: true, globalKillSwitchOpen: true, tenantAllowlisted: true, budgetLimitAvailable: true, redactionApplied: true, auditLoggingEnabled: true, p0ScannerEnabled: true, contextAllowlistApplied: true },
    policy: REAL_LLM_PROVIDER_POLICY_REQUIRED,
  })
  assert.equal(boundary.ok, false)
  assert.equal(boundary.providerConnected, false)
  assert.deepEqual(boundary.blockedReasons, ["provider_implementation_missing"])
})

test("mock provider path is unchanged and still produces candidate-only output", () => {
  let generated = false
  const result = runDecompositionOrchestrator({
    safeInputSummary: "A社契約書の修正要否をPM確認可能なメモにする",
    sourceRef,
    mockLlm: {
      kind: "mock",
      generate: () => { generated = true; return { text: "A社契約書の修正要否をPM確認可能なメモにする", outcome: "PM can review the contract memo.", verifier: "human_owner", acceptanceCriteria: ["Human owner can verify before formalization."], confidence: 0.99 } },
    },
  })
  assert.equal(generated, true, "mock provider must still generate")
  if (!result.ok) assert.fail(result.reason)
  assert.equal(result.phase, "candidate_only")
  assert.equal(result.candidateOnly, true)
  assert.equal(result.mockBoundary, "mock_only")
  assert.equal(result.decomposition.candidateOnly, true)
})

test("default (no provider supplied) path stays candidate-only via the static mock", () => {
  const result = runDecompositionOrchestrator({ safeInputSummary: "A社の件、金曜まで", sourceRef })
  if (!result.ok) assert.fail(result.reason)
  assert.equal(result.mockBoundary, "mock_only")
  assert.equal(result.candidateOnly, true)
  // Sanity: the static mock helper still constructs a mock-kind provider.
  assert.equal(createStaticMockDecompositionLlm({ text: "x" }).kind, "mock")
})
