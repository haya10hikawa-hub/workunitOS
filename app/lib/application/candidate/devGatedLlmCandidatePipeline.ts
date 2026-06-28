/**
 * Dev-gated LLM candidate pipeline — INTERFACE ONLY, fail-closed.
 *
 * This is the shape of the "LLM投入" path WITHOUT performing any real LLM call.
 * For this sprint it is strictly fail-closed:
 *
 *   - It evaluates evaluateLlmProviderBoundary BEFORE generating any candidate
 *     (verify-before-call ordering).
 *   - The boundary always returns providerConnected:false and a non-empty
 *     blockedReasons (terminal: provider_implementation_missing), because no real
 *     provider implementation exists.
 *   - No real provider is ever asked to generate.
 *   - It then falls back to the mock candidate pipeline.
 *   - providerCallsEnabled remains literal false.
 *
 * It does NOT import any real provider SDK or isolated real client, does NOT make
 * network calls, and does NOT read environment variables. The only way a real
 * provider could ever run is by passing the Phase 1E readiness gate in a separate,
 * reviewed phase — which this sprint does not do.
 */

import { evaluateLlmProviderBoundary, type LlmProviderRuntimeControls } from "../llmProvider/llmProviderBoundary.ts"
import { buildLlmContextPack } from "../llmContext/buildLlmContextPack.ts"
import type { LLMContextPack } from "../llmContext/types.ts"
import { P0_FORBIDDEN_ACTIONS } from "../safety/p0Policy.ts"
import {
  candidateWorkUnitBridge,
  type CandidateWorkUnitBridgeInput,
  type CandidateWorkUnitBridgeResult,
} from "./candidateWorkUnitBridge.ts"

// All runtime controls closed: the boundary can never clear, so a non-mock
// provider always fails closed before generation.
const NO_GO_RUNTIME_CONTROLS: LlmProviderRuntimeControls = {
  featureFlagEnabled: false,
  globalKillSwitchOpen: false,
  tenantAllowlisted: false,
  budgetLimitAvailable: false,
  redactionApplied: false,
  auditLoggingEnabled: false,
  p0ScannerEnabled: false,
  contextAllowlistApplied: false,
}

export type DevGatedLlmCandidatePipelineResult = CandidateWorkUnitBridgeResult & {
  readonly source: "dev_gated_llm_candidate_pipeline"
  readonly providerConnected: false
  readonly fellBackToMock: true
  readonly boundaryBlockedReasons: readonly string[]
}

/**
 * Run the dev-gated path. Always fails closed and falls back to mock candidates.
 * Output is candidate-only and contains no forbidden fields (it reuses the
 * allowlist-projected candidate bridge).
 */
export function runDevGatedLlmCandidatePipeline(
  input: CandidateWorkUnitBridgeInput = {},
): DevGatedLlmCandidatePipelineResult {
  // 1. Verify-before-call: evaluate the provider boundary FIRST.
  const boundary = evaluateLlmProviderBoundary({
    request: { contextPack: buildProbeContextPack() },
    controls: NO_GO_RUNTIME_CONTROLS,
  })

  // 2. The boundary never connects a real provider; no generate() is called.
  //    Fall back to the mock candidate pipeline.
  const mock = candidateWorkUnitBridge(input)

  return {
    workUnits: mock.workUnits,
    source: "dev_gated_llm_candidate_pipeline",
    mode: "candidate_only",
    safety: {
      externalExecutionEnabled: false,
      approvalCreationEnabled: false,
      providerCallsEnabled: false,
      humanReviewRequired: true,
      containsRawPayload: false,
    },
    providerConnected: boundary.providerConnected,
    fellBackToMock: true,
    boundaryBlockedReasons: boundary.blockedReasons,
  }
}

// A minimal, safe probe context pack used only to exercise the provider boundary.
// It carries no signal data and no forbidden content.
function buildProbeContextPack(): LLMContextPack {
  const built = buildLlmContextPack({
    route: "fast_extraction",
    nodeSummary: "dev-gated provider readiness probe (candidate-only)",
  })
  if (built.ok) return built.pack
  // Defensive fallback (should not happen for a clean summary): a minimal valid pack.
  return {
    route: "fast_extraction",
    nodeSummary: "dev-gated provider readiness probe (candidate-only)",
    constraints: {
      externalExecutionBlocked: true,
      approvalRequired: true,
      humanReviewRequired: true,
      forbiddenActions: P0_FORBIDDEN_ACTIONS,
    },
  }
}
