/**
 * Phase 4D: Dry-run Provider Adapter
 *
 * Fixture-only provider adapter. Returns deterministic candidate
 * output without calling any live provider.
 *
 * No SDK. No network. No env secrets. No external execution.
 *
 * Live Real LLM integration: No-Go
 */

import type { ProviderAdapter, ProviderCandidateResult, ProviderAdapterContext } from "./providerAdapterBoundary.ts"

const DRY_RUN_TEXT = "[DRY_RUN_CANDIDATE_ONLY] No live provider was called. This is fixture-only output from the dry-run provider adapter."

function createDryRunResult(): ProviderCandidateResult {
  return {
    adapterId: "dry_run_provider_adapter",
    mode: "dry_run",
    blocked: false,
    candidateOnly: true,
    liveIntegrationAllowed: false,
    externalExecutionAllowed: false,
    approvalCreationAllowed: false,
    executionCreationAllowed: false,
    textCandidate: DRY_RUN_TEXT,
    diagnostics: [
      { key: "adapter_status", reason: "dry_run_provider_adapter_active" },
      { key: "provider_call", reason: "not_performed" },
      { key: "live_integration", reason: "no_go" },
    ],
  }
}

function createTruncatedDryRunResult(outputChars: number): ProviderCandidateResult {
  return {
    ...createDryRunResult(),
    textCandidate: DRY_RUN_TEXT.slice(0, outputChars),
  }
}

export const DRY_RUN_PROVIDER_ADAPTER: ProviderAdapter = {
  id: "dry_run_provider_adapter",
  mode: "dry_run",
  executeCandidate: (_context: ProviderAdapterContext, input: { readonly prompt: string; readonly maxOutputChars: number }) => {
    void input.prompt // never echoed
    return input.maxOutputChars >= DRY_RUN_TEXT.length
      ? createDryRunResult()
      : createTruncatedDryRunResult(input.maxOutputChars)
  },
}
