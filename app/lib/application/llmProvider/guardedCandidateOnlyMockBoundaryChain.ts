/**
 * Phase 4H: Guarded Candidate-only Mock Boundary Chain
 *
 * Connects only local candidate-only components:
 *   Phase 4G Exclusion Guard -> Phase 4F Mock Boundary Harness -> candidate-only result
 *
 * Does NOT connect to: Source Signal, real ContextPack Builder,
 * real Exclusion Scanner, production pipeline, UI, API, or persistence.
 *
 * Live Real LLM integration: No-Go
 */

import type { ProviderAdapterContext } from "./providerAdapterBoundary.ts"
import type { ProviderAdapterRoutingRequest } from "./providerAdapterRoutingGate.ts"
import {
  createSafeCandidateOnlyContextPackContract,
  guardCandidateOnlyContextPackForMockBoundary,
  type CandidateOnlyContextPackContract,
  type CandidateOnlyContextPackGuardResult,
} from "./candidateOnlyContextPackExclusionGuard.ts"
import {
  createSafeCandidateOnlyMockBoundaryHarnessRequest,
  runCandidateOnlyMockBoundaryHarness,
  type CandidateOnlyMockBoundaryHarnessResult,
} from "./candidateOnlyMockBoundaryHarness.ts"

export type GuardedCandidateOnlyMockBoundaryChainRequest = {
  readonly contextPack: CandidateOnlyContextPackContract
  readonly context: ProviderAdapterContext
  readonly routingRequest: ProviderAdapterRoutingRequest
}

export type GuardedCandidateOnlyMockBoundaryChainDecision =
  | "block_before_mock_boundary"
  | "produce_candidate_only_mock_boundary_result"

export type GuardedCandidateOnlyMockBoundaryChainReason =
  | "context_pack_guard_blocked"
  | "context_pack_guard_allowed"
  | "default_blocked"

export type GuardedCandidateOnlyMockBoundaryChainResult = {
  readonly phase: "phase_4h_guarded_candidate_only_mock_boundary_chain"
  readonly flowSegment: "context_pack_guard_to_mock_boundary_harness_to_candidate_only_result"
  readonly decision: GuardedCandidateOnlyMockBoundaryChainDecision
  readonly reason: GuardedCandidateOnlyMockBoundaryChainReason
  readonly contextGuard: CandidateOnlyContextPackGuardResult
  readonly mockBoundary?: CandidateOnlyMockBoundaryHarnessResult
  readonly candidateOnly: true
  readonly liveIntegrationAllowed: false
  readonly externalExecutionAllowed: false
  readonly approvalCreationAllowed: false
  readonly executionCreationAllowed: false
  readonly productionPipelineConnected: false
  readonly uiConnected: false
  readonly apiConnected: false
  readonly sourceSignalConnected: false
  readonly realContextPackBuilderConnected: false
  readonly realExclusionScannerConnected: false
  readonly decompositionClassifierConnected: false
  readonly decompositionOrchestratorConnected: false
  readonly actionFieldConnected: false
  readonly humanReviewConnected: false
}

const FALSE = {
  candidateOnly: true,
  liveIntegrationAllowed: false,
  externalExecutionAllowed: false,
  approvalCreationAllowed: false,
  executionCreationAllowed: false,
  productionPipelineConnected: false,
  uiConnected: false,
  apiConnected: false,
  sourceSignalConnected: false,
  realContextPackBuilderConnected: false,
  realExclusionScannerConnected: false,
  decompositionClassifierConnected: false,
  decompositionOrchestratorConnected: false,
  actionFieldConnected: false,
  humanReviewConnected: false,
} as const

const PHASE = "phase_4h_guarded_candidate_only_mock_boundary_chain" as const
const SEGMENT = "context_pack_guard_to_mock_boundary_harness_to_candidate_only_result" as const

export function createSafeGuardedCandidateOnlyMockBoundaryChainRequest(): GuardedCandidateOnlyMockBoundaryChainRequest {
  const harness = createSafeCandidateOnlyMockBoundaryHarnessRequest()
  return {
    contextPack: createSafeCandidateOnlyContextPackContract(),
    context: harness.context,
    routingRequest: harness.routingRequest,
  }
}

export function runGuardedCandidateOnlyMockBoundaryChain(
  request: GuardedCandidateOnlyMockBoundaryChainRequest,
): GuardedCandidateOnlyMockBoundaryChainResult {
  const contextGuard = guardCandidateOnlyContextPackForMockBoundary(request.contextPack)

  if (contextGuard.decision === "block_mock_boundary_input" || !contextGuard.input) {
    return {
      ...FALSE,
      phase: PHASE,
      flowSegment: SEGMENT,
      decision: "block_before_mock_boundary",
      reason: "context_pack_guard_blocked",
      contextGuard,
    }
  }

  const mockBoundary = runCandidateOnlyMockBoundaryHarness({
    context: request.context,
    routingRequest: request.routingRequest,
    input: contextGuard.input,
  })

  return {
    ...FALSE,
    phase: PHASE,
    flowSegment: SEGMENT,
    decision: "produce_candidate_only_mock_boundary_result",
    reason: "context_pack_guard_allowed",
    contextGuard,
    mockBoundary,
  }
}
