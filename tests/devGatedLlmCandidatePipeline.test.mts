/**
 * Dev-gated LLM candidate pipeline tests (interface only, fail-closed).
 *
 * Proves:
 *   - no real provider call / import / fetch / process.env
 *   - providerCallsEnabled remains false
 *   - the provider boundary is evaluated before candidate generation
 *   - provider_implementation_missing remains terminal
 *   - mock fallback produces candidate-only output
 *   - no forbidden fields are emitted
 *
 * The forbidden-key strings here are negative-control data, not product data.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { runDevGatedLlmCandidatePipeline } from "../app/lib/application/candidate/devGatedLlmCandidatePipeline.ts"
import { evaluateLlmProviderBoundary } from "../app/lib/application/llmProvider/llmProviderBoundary.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"
import { buildLlmContextPack } from "../app/lib/application/llmContext/buildLlmContextPack.ts"
import { FORBIDDEN_CANDIDATE_FIELDS } from "../app/lib/application/candidate/safeWorkUnitCandidate.ts"

const SRC = readFileSync(
  join(import.meta.dirname!, "../app/lib/application/candidate/devGatedLlmCandidatePipeline.ts"),
  "utf-8",
)

function forbiddenKeysOf(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === "object") {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if ((FORBIDDEN_CANDIDATE_FIELDS as readonly string[]).includes(key)) found.push(key)
        walk((node as Record<string, unknown>)[key])
      }
    }
  }
  walk(value)
  return found
}

// 1
test("dev_gated pipeline does not call a real provider (no import/fetch/env)", () => {
  for (const sdk of ["openai", "@anthropic-ai", "deepseekProvider", "createDeepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false, `must not reference ${sdk}`)
  }
  assert.equal(SRC.includes("fetch("), false)
  assert.equal(SRC.includes("process.env"), false)
})

// 2
test("providerCallsEnabled remains false", () => {
  const result = runDevGatedLlmCandidatePipeline()
  assert.equal(result.safety.providerCallsEnabled, false)
  assert.equal(result.providerConnected, false)
  assert.equal(result.source, "dev_gated_llm_candidate_pipeline")
})

// 3
test("provider boundary is evaluated before candidate generation (verify-before-call)", () => {
  // The result carries the boundary's blocked reasons, proving the boundary ran.
  const result = runDevGatedLlmCandidatePipeline()
  assert.ok(result.boundaryBlockedReasons.length > 0)
  assert.equal(result.fellBackToMock, true)
  // Static ordering check: evaluateLlmProviderBoundary call appears before the
  // candidateWorkUnitBridge fallback call in the source.
  const boundaryIdx = SRC.indexOf("evaluateLlmProviderBoundary(")
  const fallbackIdx = SRC.indexOf("candidateWorkUnitBridge(input)")
  assert.ok(boundaryIdx > 0 && fallbackIdx > 0 && boundaryIdx < fallbackIdx)
})

// 4
test("provider_implementation_missing remains terminal under full-green policy+controls", () => {
  const pack = buildLlmContextPack({ route: "fast_extraction", nodeSummary: "probe" })
  assert.equal(pack.ok, true)
  if (!pack.ok) return
  const boundary = evaluateLlmProviderBoundary({
    request: { contextPack: pack.pack },
    controls: {
      featureFlagEnabled: true,
      globalKillSwitchOpen: true,
      tenantAllowlisted: true,
      budgetLimitAvailable: true,
      redactionApplied: true,
      auditLoggingEnabled: true,
      p0ScannerEnabled: true,
      contextAllowlistApplied: true,
    },
    policy: REAL_LLM_PROVIDER_POLICY_REQUIRED,
  })
  assert.equal(boundary.ok, false)
  assert.equal(boundary.providerConnected, false)
  assert.deepEqual(boundary.blockedReasons, ["provider_implementation_missing"])
})

// 5
test("mock fallback produces candidate-only output", () => {
  const result = runDevGatedLlmCandidatePipeline()
  assert.equal(result.mode, "candidate_only")
  assert.ok(result.workUnits.length > 0)
  for (const wu of result.workUnits) {
    assert.equal(wu.candidateOnly, true)
    assert.equal(wu.humanReviewRequired, true)
  }
})

// 6
test("no forbidden fields are emitted", () => {
  const result = runDevGatedLlmCandidatePipeline()
  assert.deepEqual(forbiddenKeysOf(result.workUnits), [])
  // boundaryBlockedReasons are enum strings only.
  for (const reason of result.boundaryBlockedReasons) assert.equal(typeof reason, "string")
})
