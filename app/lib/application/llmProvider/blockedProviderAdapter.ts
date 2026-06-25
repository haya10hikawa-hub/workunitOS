/**
 * Phase 4B: Blocked Provider Adapter
 *
 * Default adapter that always returns blocked / candidate-only.
 * No live provider. No SDK. No network. No env secrets.
 *
 * Live Real LLM integration: No-Go
 */

import type { ProviderAdapter, ProviderCandidateResult } from "./providerAdapterBoundary.ts"

function createBlockedResult(): ProviderCandidateResult {
  return {
    adapterId: "blocked_provider_adapter",
    mode: "blocked",
    blocked: true,
    candidateOnly: true,
    liveIntegrationAllowed: false,
    externalExecutionAllowed: false,
    approvalCreationAllowed: false,
    executionCreationAllowed: false,
    textCandidate: "[BLOCKED] Provider adapter has not been approved for live integration.",
    diagnostics: [
      { key: "adapter_status", reason: "blocked_provider_adapter_is_active" },
      { key: "live_integration", reason: "live_provider_integration_remains_no_go" },
    ],
  }
}

export const BLOCKED_PROVIDER_ADAPTER: ProviderAdapter = {
  id: "blocked_provider_adapter",
  mode: "blocked",
  executeCandidate: () => createBlockedResult(),
}
