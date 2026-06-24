/**
 * Phase 2C: Provider Dry-Run Contract
 *
 * Defines the interface that all provider adapters (dry-run and live)
 * must implement. Dry-run providers must be deterministic and never
 * call network APIs, import SDKs, or read env secrets.
 *
 * Live provider integration remains No-Go.
 */

import type {
  SanitizedLlmProviderRequest,
  LlmProviderRuntimeControls,
  LlmProviderBoundaryBlocker,
} from "./llmProviderBoundary.ts"
import type { RealLlmProviderBoundaryPolicy } from "../llmReadiness/realLlmProviderPolicy.ts"
import type { RealLlmReadinessBlocker } from "../llmReadiness/realLlmReadinessGate.ts"

// ─── Contract Types ────────────────────────────────────────────

/**
 * Provider adapter identifier. Unique per adapter.
 */
export type ProviderAdapterId = string

/**
 * What an adapter declares it can do. Used by the dispatcher
 * to verify capability match before calling the adapter.
 */
export type ProviderAdapterCapability = {
  readonly providerId: ProviderAdapterId
  readonly providerLabel: string
  readonly routes: readonly string[]
  readonly maxContextTokens: number
  readonly features: readonly string[]
  readonly deterministic: boolean
  readonly networkRequired: boolean
}

/**
 * The safe response from a dry-run provider adapter.
 * Always deterministic, never contains executable output.
 */
export type ProviderDryRunResponse = {
  readonly providerId: ProviderAdapterId
  readonly route: string

  /** Always "dry_run" — no live provider connected. */
  readonly mode: "dry_run"

  /** Indicates the adapter produced a safe, non-executing response. */
  readonly ok: true

  /** Deterministic output. Never contains execution-ready payload. */
  readonly content: string

  /** Metadata for audit. Completely safe to inspect. */
  readonly metadata: {
    readonly tokensUsed: 0
    readonly latencyMs: 0
    readonly modelVersion: string
    readonly deterministic: true
  }
}

/**
 * The blocked response when preflight fails.
 * Always safe to inspect — never contains raw payload.
 */
export type ProviderDryRunBlocked = {
  readonly providerId: ProviderAdapterId
  readonly route: string
  readonly mode: "dry_run"
  readonly ok: false
  readonly blockedReasons: readonly LlmProviderBoundaryBlocker[]
  readonly readinessBlockedReasons?: readonly RealLlmReadinessBlocker[]
}

export type ProviderDryRunResult =
  | ProviderDryRunResponse
  | ProviderDryRunBlocked

// ─── Contract Functions ────────────────────────────────────────

/**
 * Every provider adapter must implement this function.
 *
 * In Phase 2C, only dry-run implementations exist.
 * Live adapters are No-Go until a future phase.
 */
export type ProviderAdapterFn = (
  request: SanitizedLlmProviderRequest,
  controls: LlmProviderRuntimeControls,
  policy?: Partial<RealLlmProviderBoundaryPolicy>,
) => ProviderDryRunResult

/**
 * Preflight check that runs before the adapter is called.
 * Returns blocked reasons if any safety check fails.
 */
export type ProviderPreflightCheck = (
  request: SanitizedLlmProviderRequest,
  controls: LlmProviderRuntimeControls,
  capability: ProviderAdapterCapability,
) => readonly LlmProviderBoundaryBlocker[]

/**
 * Full dry-run contract.
 */
export type ProviderDryRunContract = {
  readonly capability: ProviderAdapterCapability
  readonly preflight: ProviderPreflightCheck
  readonly adapt: ProviderAdapterFn
}
