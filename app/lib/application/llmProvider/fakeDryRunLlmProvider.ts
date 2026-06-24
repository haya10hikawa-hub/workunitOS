/**
 * Phase 2C: Fake Dry-Run LLM Provider
 *
 * Deterministic, no-network, no-SDK, no-secret implementation
 * of the ProviderDryRunContract. Used for testing the contract
 * shape before any real provider adapter is built.
 *
 * Live provider integration remains No-Go.
 */

import type {
  ProviderDryRunContract,
  ProviderAdapterCapability,
  ProviderDryRunResult,
} from "./providerDryRunContract.ts"
import type {
  SanitizedLlmProviderRequest,
  LlmProviderRuntimeControls,
} from "./llmProviderBoundary.ts"
import { evaluateLlmProviderBoundary } from "./llmProviderBoundary.ts"
import type { RealLlmProviderBoundaryPolicy } from "../llmReadiness/realLlmProviderPolicy.ts"

const FAKE_CAPABILITY: ProviderAdapterCapability = {
  providerId: "fake-dry-run",
  providerLabel: "Fake Dry-Run Provider (Phase 2C)",
  routes: ["fast_extraction", "draft_generation", "critic_verification", "deep_reasoning"],
  maxContextTokens: 0,
  features: ["deterministic", "no-network", "no-sdk"],
  deterministic: true,
  networkRequired: false,
}

function fakeAdapt(
  request: SanitizedLlmProviderRequest,
  controls: LlmProviderRuntimeControls,
  policy?: Partial<RealLlmProviderBoundaryPolicy>,
): ProviderDryRunResult {
  // Run boundary check first — never return ok:true if blocked
  const boundary = evaluateLlmProviderBoundary({ request, controls, policy })
  if (boundary.blockedReasons.length > 0) {
    return {
      providerId: "fake-dry-run",
      route: request.contextPack.route,
      mode: "dry_run",
      ok: false,
      blockedReasons: boundary.blockedReasons,
      readinessBlockedReasons: boundary.readinessBlockedReasons,
    }
  }

  // Deterministic response keyed on route
  const body = routeResponses[request.contextPack.route] ?? routeResponses.fast_extraction

  return {
    providerId: "fake-dry-run",
    route: request.contextPack.route,
    mode: "dry_run",
    ok: true,
    content: body,
    metadata: {
      tokensUsed: 0,
      latencyMs: 0,
      modelVersion: "fake-dry-run-v2c",
      deterministic: true,
    },
  }
}

const routeResponses: Record<string, string> = {
  fast_extraction: "[DRY-RUN] Fast extraction result: no live LLM connected. This is a deterministic placeholder for testing the contract shape.",
  draft_generation: "[DRY-RUN] Draft generation result: no live LLM connected. Content is deterministic test output.",
  critic_verification: "[DRY-RUN] Critic verification result: no live LLM connected. All outputs are non-executing.",
  deep_reasoning: "[DRY-RUN] Deep reasoning result: no live LLM connected. Placeholder for contract validation.",
}

/**
 * Preflight: check all Phase 2A boundary controls before calling the adapter.
 */
function fakePreflight(
  request: SanitizedLlmProviderRequest,
  controls: LlmProviderRuntimeControls,
  capability: ProviderAdapterCapability,
) {
  const result = evaluateLlmProviderBoundary({ request, controls })
  const blockers = [...result.blockedReasons]

  if (capability.networkRequired) {
    blockers.push("provider_implementation_missing" as const)
  }

  return blockers
}

/**
 * The complete Phase 2C fake dry-run contract.
 *
 * This contract proves that a deterministic, no-network, no-secret,
 * non-executing provider adapter is possible before any live provider
 * integration is attempted.
 */
export const FAKE_DRY_RUN_PROVIDER: ProviderDryRunContract = {
  capability: FAKE_CAPABILITY,
  preflight: fakePreflight,
  adapt: fakeAdapt,
}
