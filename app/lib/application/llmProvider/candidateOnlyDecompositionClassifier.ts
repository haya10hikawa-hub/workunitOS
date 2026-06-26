/**
 * Phase 4I: Candidate-only Decomposition Classifier Boundary
 *
 * Pure classifier covering only:
 *   mock boundary result -> classifier -> candidate type
 *
 * Does NOT call: Phase 4F harness, Phase 4G guard, Phase 4H chain,
 * adapters, provider routing, production pipeline, UI, API.
 *
 * Live Real LLM integration: No-Go
 */

import type { CandidateOnlyMockBoundaryHarnessResult } from "./candidateOnlyMockBoundaryHarness.ts"

export type CandidateOnlyDecompositionCandidateType =
  | "workunit_candidate"
  | "clarification_needed"
  | "blocked_candidate"

export type CandidateOnlyDecompositionClassifierDecision =
  | "classify_candidate_type"
  | "block_candidate_type"

export type CandidateOnlyDecompositionClassifierReason =
  | "dry_run_workunit_candidate_detected"
  | "mock_boundary_blocked"
  | "missing_mock_boundary_text"
  | "unknown_candidate_shape"
  | "default_blocked"

export type CandidateOnlyDecompositionClassifierResult = {
  readonly phase: "phase_4i_candidate_only_decomposition_classifier"
  readonly flowSegment: "mock_boundary_result_to_decomposition_classifier_to_candidate_type"
  readonly decision: CandidateOnlyDecompositionClassifierDecision
  readonly candidateType: CandidateOnlyDecompositionCandidateType
  readonly reason: CandidateOnlyDecompositionClassifierReason
  readonly candidateOnly: true
  readonly rawCandidateTextIncluded: false
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
  readonly mockBoundaryHarnessConnected: false
  readonly guardedChainConnected: false
  readonly decompositionOrchestratorConnected: false
  readonly actionFieldConnected: false
  readonly humanReviewConnected: false
}

const FALSE = {
  candidateOnly: true,
  rawCandidateTextIncluded: false,
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
  mockBoundaryHarnessConnected: false,
  guardedChainConnected: false,
  decompositionOrchestratorConnected: false,
  actionFieldConnected: false,
  humanReviewConnected: false,
} as const

const PHASE = "phase_4i_candidate_only_decomposition_classifier" as const
const SEGMENT = "mock_boundary_result_to_decomposition_classifier_to_candidate_type" as const

export function createBlockedCandidateOnlyDecompositionClassifierResult(
  reason: CandidateOnlyDecompositionClassifierReason,
): CandidateOnlyDecompositionClassifierResult {
  return { ...FALSE, phase: PHASE, flowSegment: SEGMENT, decision: "block_candidate_type", candidateType: "blocked_candidate", reason }
}

export function classifyCandidateOnlyMockBoundaryResult(
  mockBoundary: CandidateOnlyMockBoundaryHarnessResult,
): CandidateOnlyDecompositionClassifierResult {
  if (mockBoundary.provider.blocked) return createBlockedCandidateOnlyDecompositionClassifierResult("mock_boundary_blocked")
  if (mockBoundary.routing.decision !== "route_to_dry_run_adapter") return createBlockedCandidateOnlyDecompositionClassifierResult("mock_boundary_blocked")
  if (mockBoundary.candidateOnly !== true) return createBlockedCandidateOnlyDecompositionClassifierResult("default_blocked")
  if (mockBoundary.provider.candidateOnly !== true) return createBlockedCandidateOnlyDecompositionClassifierResult("default_blocked")

  const text = mockBoundary.provider.textCandidate.trim()
  if (!text) {
    return { ...FALSE, phase: PHASE, flowSegment: SEGMENT, decision: "classify_candidate_type", candidateType: "clarification_needed", reason: "missing_mock_boundary_text" }
  }

  if (text.includes("[DRY_RUN_CANDIDATE_ONLY]") && text.includes("No live provider was called")) {
    return { ...FALSE, phase: PHASE, flowSegment: SEGMENT, decision: "classify_candidate_type", candidateType: "workunit_candidate", reason: "dry_run_workunit_candidate_detected" }
  }

  return { ...FALSE, phase: PHASE, flowSegment: SEGMENT, decision: "classify_candidate_type", candidateType: "clarification_needed", reason: "unknown_candidate_shape" }
}
