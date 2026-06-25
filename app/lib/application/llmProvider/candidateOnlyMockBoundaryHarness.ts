/**
 * Phase 4F: Candidate-only Mock Boundary Harness
 *
 * Isolated harness covering only:
 *   Mock LLM Boundary -> Rule Gate / Routing Gate -> candidate-only result
 *
 * Does NOT connect to: production pipeline, signal flow,
 * context assembly, exclusion scan, decomposition classify,
 * action editing, human approval, UI, or API routes.
 *
 * Only BLOCKED_PROVIDER_ADAPTER and DRY_RUN_PROVIDER_ADAPTER may be called.
 *
 * Live Real LLM integration: No-Go
 */

import type { ProviderAdapterContext, ProviderCandidateResult } from "./providerAdapterBoundary.ts"
import { BLOCKED_PROVIDER_ADAPTER } from "./blockedProviderAdapter.ts"
import { DRY_RUN_PROVIDER_ADAPTER } from "./dryRunProviderAdapter.ts"
import {
  routeProviderAdapter,
  createSafeDryRunRoutingRequest,
  type ProviderAdapterRoutingRequest,
  type ProviderAdapterRoutingResult,
} from "./providerAdapterRoutingGate.ts"

export type CandidateOnlyMockBoundaryInput = {
  readonly prompt: string
  readonly maxOutputChars: number
}

export type CandidateOnlyMockBoundaryHarnessRequest = {
  readonly context: ProviderAdapterContext
  readonly routingRequest: ProviderAdapterRoutingRequest
  readonly input: CandidateOnlyMockBoundaryInput
}

export type CandidateOnlyMockBoundaryHarnessResult = {
  readonly phase: "phase_4f_candidate_only_mock_boundary_harness"
  readonly flowSegment: "mock_boundary_to_routing_gate_to_candidate_only_result"
  readonly routing: ProviderAdapterRoutingResult
  readonly provider: ProviderCandidateResult
  readonly candidateOnly: true
  readonly liveIntegrationAllowed: false
  readonly externalExecutionAllowed: false
  readonly approvalCreationAllowed: false
  readonly executionCreationAllowed: false
  readonly productionPipelineConnected: false
  readonly uiConnected: false
  readonly sourceSignalConnected: false
  readonly contextPackConnected: false
  readonly exclusionScannerConnected: false
  readonly decompositionClassifierConnected: false
  readonly actionFieldConnected: false
  readonly humanReviewConnected: false
}

const DISCONNECTED = {
  candidateOnly: true,
  liveIntegrationAllowed: false,
  externalExecutionAllowed: false,
  approvalCreationAllowed: false,
  executionCreationAllowed: false,
  productionPipelineConnected: false,
  uiConnected: false,
  sourceSignalConnected: false,
  contextPackConnected: false,
  exclusionScannerConnected: false,
  decompositionClassifierConnected: false,
  actionFieldConnected: false,
  humanReviewConnected: false,
} as const

export function createSafeCandidateOnlyMockBoundaryHarnessRequest(): CandidateOnlyMockBoundaryHarnessRequest {
  return {
    context: {
      tenantId: "phase-4f-dry-run-tenant",
      userId: "phase-4f-dry-run-user",
      nodeId: "phase-4f-dry-run-node",
      requestId: "phase-4f-dry-run-request",
    },
    routingRequest: createSafeDryRunRoutingRequest(),
    input: {
      prompt: "phase 4f dry-run prompt is not echoed",
      maxOutputChars: 500,
    },
  }
}

export function runCandidateOnlyMockBoundaryHarness(
  request: CandidateOnlyMockBoundaryHarnessRequest,
): CandidateOnlyMockBoundaryHarnessResult {
  const routing = routeProviderAdapter(request.routingRequest)

  let provider: ProviderCandidateResult

  if (routing.selectedAdapterId === "dry_run_provider_adapter" && routing.decision === "route_to_dry_run_adapter") {
    provider = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(request.context, request.input)
  } else {
    // default blocked: blocked, future_live, unknown IDs, any conflicting state
    provider = BLOCKED_PROVIDER_ADAPTER.executeCandidate(request.context, request.input)
  }

  return {
    phase: "phase_4f_candidate_only_mock_boundary_harness",
    flowSegment: "mock_boundary_to_routing_gate_to_candidate_only_result",
    routing,
    provider,
    ...DISCONNECTED,
  }
}
