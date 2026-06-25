/**
 * Phase 3A: Sealed Provider Adapter Interface
 *
 * Defines the contract that any future live provider adapter
 * must implement. No live adapter exists yet.
 *
 * Live provider integration remains No-Go.
 */

import type { SanitizedLlmProviderRequest, LlmProviderRuntimeControls } from "./llmProviderBoundary.ts"
import type { RealLlmProviderBoundaryPolicy } from "../llmReadiness/realLlmProviderPolicy.ts"
import type { SafeBlockedDiagnostic } from "./blockedDiagnosticRedaction.ts"

/** Every adapter declares what it can do. */
export type SealedAdapterCapability = {
  readonly adapterId: string
  readonly adapterLabel: string
  readonly routes: readonly string[]
  readonly maxContextTokens: number
  readonly features: readonly string[]
  readonly deterministic: boolean
  readonly networkRequired: boolean
}

/** The sealed adapter response. Always candidate-only. */
export type SealedAdapterResponse = {
  readonly adapterId: string
  readonly route: string
  readonly mode: string
  readonly ok: boolean
  readonly content?: string
  readonly blockedReasons?: readonly string[]
  readonly diagnostics?: readonly SafeBlockedDiagnostic[]
  readonly candidateOnly: true
}

/** The sealed adapter interface. */
export type SealedProviderAdapter = {
  readonly capability: SealedAdapterCapability
  readonly run: (
    request: SanitizedLlmProviderRequest,
    controls: LlmProviderRuntimeControls,
    policy?: Partial<RealLlmProviderBoundaryPolicy>,
  ) => SealedAdapterResponse
}

/** Always returns a factory that asserts no live adapter exists yet. */
export function assertNoLiveAdapter(): SealedProviderAdapter {
  return {
    capability: {
      adapterId: "no-live-adapter",
      adapterLabel: "No live provider adapter exists (Phase 3A sealed interface only)",
      routes: [],
      maxContextTokens: 0,
      features: ["no-live-adapter", "no-sdk", "no-network", "no-execution"],
      deterministic: true,
      networkRequired: false,
    },
    run: () => ({
      adapterId: "no-live-adapter",
      route: "none",
      mode: "sealed",
      ok: false,
      blockedReasons: ["provider_implementation_missing"],
      candidateOnly: true,
    }),
  }
}
