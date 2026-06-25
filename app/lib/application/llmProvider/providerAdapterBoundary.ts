/**
 * Phase 4B: Provider Adapter Boundary
 *
 * Defines the adapter interface that any future live provider
 * adapter must implement. Does NOT connect a provider.
 *
 * Live Real LLM integration: No-Go
 * External execution: No-Go
 * UI connection: No-Go
 */

export type ProviderAdapterId =
  | "blocked_provider_adapter"
  | "dry_run_provider_adapter"
  | "future_live_provider_adapter"

export type ProviderAdapterMode =
  | "blocked"
  | "dry_run"
  | "future_live"

export type ProviderAdapterContext = {
  readonly tenantId: string
  readonly userId: string
  readonly nodeId: string
  readonly requestId: string
}

export type ProviderCandidateResult = {
  readonly adapterId: ProviderAdapterId
  readonly mode: ProviderAdapterMode
  readonly blocked: boolean
  readonly candidateOnly: true
  readonly liveIntegrationAllowed: false
  readonly externalExecutionAllowed: false
  readonly approvalCreationAllowed: false
  readonly executionCreationAllowed: false
  readonly textCandidate: string
  readonly diagnostics: readonly {
    readonly key: string
    readonly reason: string
  }[]
}

export type ProviderAdapter = {
  readonly id: ProviderAdapterId
  readonly mode: ProviderAdapterMode
  readonly executeCandidate: (
    context: ProviderAdapterContext,
    input: { readonly prompt: string; readonly maxOutputChars: number },
  ) => ProviderCandidateResult
}
