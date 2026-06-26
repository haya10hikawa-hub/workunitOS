/**
 * Phase 4J: Candidate-only Decomposition Rule Gate Boundary
 *
 * Pure rule gate covering only:
 *   classifier result -> rule gate -> gated candidate decision
 *
 * Does NOT call: Phase 4I runtime classifier, Phase 4H chain,
 * Phase 4G guard, Phase 4F harness, adapters, routing, production pipeline.
 *
 * Live Real LLM integration: No-Go
 */

import type { CandidateOnlyDecompositionClassifierResult } from "./candidateOnlyDecompositionClassifier.ts"

export type CandidateOnlyDecompositionRuleGateDecision =
  | "allow_candidate_only_decomposition"
  | "request_candidate_clarification"
  | "block_candidate_only_decomposition"

export type CandidateOnlyDecompositionRuleGateReason =
  | "workunit_candidate_allowed_by_rule_gate"
  | "classifier_requires_clarification"
  | "classifier_blocked_by_rule_gate"
  | "classifier_contract_invalid"
  | "classifier_shape_invalid"
  | "default_blocked"

export type CandidateOnlyDecompositionRuleGateResult = {
  readonly phase: "phase_4j_candidate_only_decomposition_rule_gate"
  readonly flowSegment: "decomposition_classifier_result_to_rule_gate_decision"
  readonly decision: CandidateOnlyDecompositionRuleGateDecision
  readonly reason: CandidateOnlyDecompositionRuleGateReason
  readonly classifierDecision: CandidateOnlyDecompositionClassifierResult["decision"]
  readonly classifierCandidateType: CandidateOnlyDecompositionClassifierResult["candidateType"]
  readonly candidateOnly: true
  readonly rawCandidateTextIncluded: false
  readonly ruleGateEvaluated: true
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
  readonly classifierRuntimeConnected: false
  readonly decompositionOrchestratorConnected: false
  readonly actionFieldConnected: false
  readonly humanReviewConnected: false
}

const FALSE = {
  candidateOnly: true,
  rawCandidateTextIncluded: false,
  ruleGateEvaluated: true,
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
  classifierRuntimeConnected: false,
  decompositionOrchestratorConnected: false,
  actionFieldConnected: false,
  humanReviewConnected: false,
} as const

const PHASE = "phase_4j_candidate_only_decomposition_rule_gate" as const
const SEGMENT = "decomposition_classifier_result_to_rule_gate_decision" as const

export function createBlockedCandidateOnlyDecompositionRuleGateResult(
  classification: CandidateOnlyDecompositionClassifierResult,
  reason: CandidateOnlyDecompositionRuleGateReason,
): CandidateOnlyDecompositionRuleGateResult {
  return {
    ...FALSE,
    phase: PHASE, flowSegment: SEGMENT,
    decision: "block_candidate_only_decomposition", reason,
    classifierDecision: classification.decision,
    classifierCandidateType: classification.candidateType,
  }
}

export function evaluateCandidateOnlyDecompositionRuleGate(
  classification: CandidateOnlyDecompositionClassifierResult,
): CandidateOnlyDecompositionRuleGateResult {
  // Contract validation
  if (classification.candidateOnly !== true) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.rawCandidateTextIncluded !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")

  // Safety flag inheritance
  if (classification.liveIntegrationAllowed !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.externalExecutionAllowed !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.approvalCreationAllowed !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.executionCreationAllowed !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.productionPipelineConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.uiConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.apiConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.sourceSignalConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.realContextPackBuilderConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.realExclusionScannerConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.mockBoundaryHarnessConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.guardedChainConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.decompositionOrchestratorConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.actionFieldConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")
  if (classification.humanReviewConnected !== false) return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_contract_invalid")

  // Classification routing
  if (classification.decision === "block_candidate_type") return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_blocked_by_rule_gate")
  if (classification.candidateType === "blocked_candidate") return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_blocked_by_rule_gate")
  if (classification.candidateType === "clarification_needed") {
    return {
      ...FALSE, phase: PHASE, flowSegment: SEGMENT,
      decision: "request_candidate_clarification", reason: "classifier_requires_clarification",
      classifierDecision: classification.decision, classifierCandidateType: classification.candidateType,
    }
  }

  // workunit_candidate: allowed only with exact contract match
  if (classification.candidateType === "workunit_candidate" &&
      classification.decision === "classify_candidate_type" &&
      classification.reason === "dry_run_workunit_candidate_detected") {
    return {
      ...FALSE, phase: PHASE, flowSegment: SEGMENT,
      decision: "allow_candidate_only_decomposition", reason: "workunit_candidate_allowed_by_rule_gate",
      classifierDecision: classification.decision, classifierCandidateType: classification.candidateType,
    }
  }

  // Inconsistent shapes
  return createBlockedCandidateOnlyDecompositionRuleGateResult(classification, "classifier_shape_invalid")
}
