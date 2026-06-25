/**
 * Phase 4E: Dry-run Provider Adapter Routing Gate
 *
 * Pure routing decision layer. Given a routing request, decides
 * which provider adapter may be selected.
 *
 * Does NOT execute adapters. Does NOT connect to production pipeline.
 *
 * Live Real LLM integration: No-Go
 * External execution: No-Go
 * Production routing: No-Go
 */

import type { ProviderAdapterId } from "./providerAdapterBoundary.ts"
import type { DryRunProviderDesignDecision } from "./dryRunProviderAdapterDesignGate.ts"

export type ProviderAdapterRoutingRequest = {
  readonly requestedAdapterId?: ProviderAdapterId | string
  readonly dryRunExplicitlyRequested: boolean
  readonly liveProviderRequested: boolean
  readonly externalExecutionRequested: boolean
  readonly approvalCreationRequested: boolean
  readonly executionCreationRequested: boolean
  readonly dryRunDesignDecision: DryRunProviderDesignDecision
}

export type ProviderAdapterRoutingDecision =
  | "route_to_blocked_adapter"
  | "route_to_dry_run_adapter"

export type ProviderAdapterRoutingReason =
  | "default_blocked"
  | "dry_run_not_explicitly_requested"
  | "dry_run_design_gate_not_go"
  | "live_provider_requested"
  | "external_execution_requested"
  | "approval_creation_requested"
  | "execution_creation_requested"
  | "unknown_requested_adapter"
  | "future_live_provider_adapter_blocked"
  | "dry_run_adapter_allowed"

export type ProviderAdapterRoutingResult = {
  readonly decision: ProviderAdapterRoutingDecision
  readonly selectedAdapterId: ProviderAdapterId
  readonly reason: ProviderAdapterRoutingReason
  readonly candidateOnly: true
  readonly liveIntegrationAllowed: false
  readonly externalExecutionAllowed: false
  readonly approvalCreationAllowed: false
  readonly executionCreationAllowed: false
}

const FALSE = {
  candidateOnly: true,
  liveIntegrationAllowed: false,
  externalExecutionAllowed: false,
  approvalCreationAllowed: false,
  executionCreationAllowed: false,
} as const

function blocked(reason: ProviderAdapterRoutingReason): ProviderAdapterRoutingResult {
  return { ...FALSE, decision: "route_to_blocked_adapter", selectedAdapterId: "blocked_provider_adapter", reason }
}

export function createSafeDryRunRoutingRequest(): ProviderAdapterRoutingRequest {
  return {
    requestedAdapterId: "dry_run_provider_adapter",
    dryRunExplicitlyRequested: true,
    liveProviderRequested: false,
    externalExecutionRequested: false,
    approvalCreationRequested: false,
    executionCreationRequested: false,
    dryRunDesignDecision: "go_to_open_dry_run_adapter_pr",
  }
}

export function routeProviderAdapter(
  request: ProviderAdapterRoutingRequest,
): ProviderAdapterRoutingResult {
  const id = request.requestedAdapterId

  if (id === undefined) return blocked("default_blocked")
  if (id === "blocked_provider_adapter") return blocked("default_blocked")
  if (id === "future_live_provider_adapter") return blocked("future_live_provider_adapter_blocked")
  if (id !== "dry_run_provider_adapter") return blocked("unknown_requested_adapter")

  if (!request.dryRunExplicitlyRequested) return blocked("dry_run_not_explicitly_requested")
  if (request.dryRunDesignDecision !== "go_to_open_dry_run_adapter_pr") return blocked("dry_run_design_gate_not_go")
  if (request.liveProviderRequested) return blocked("live_provider_requested")
  if (request.externalExecutionRequested) return blocked("external_execution_requested")
  if (request.approvalCreationRequested) return blocked("approval_creation_requested")
  if (request.executionCreationRequested) return blocked("execution_creation_requested")

  return { ...FALSE, decision: "route_to_dry_run_adapter", selectedAdapterId: "dry_run_provider_adapter", reason: "dry_run_adapter_allowed" }
}
