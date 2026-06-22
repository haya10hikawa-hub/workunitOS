/**
 * Node decomposition pure model types.
 *
 * This layer only creates candidates. It does not create reviewed WorkUnits,
 * approval records, execution commands, or external payloads.
 */

import type { SourceRef } from "../../domain/types.ts"
import type { RiskFlag } from "../../llm/types.ts"

export type DecompositionTarget =
  | "formal_node_candidate"
  | "pending_node_candidate"
  | "evidence_candidate"
  | "subtask_candidate"
  | "noise_candidate"
  | "merge_candidate"
  | "split_candidate"
  | "human_review_required"
  | "ai_silent_processing_event_candidate"

export type PendingType =
  | "missing_field"
  | "branching"
  | "boundary"
  | "split"
  | "low_trust"

export type HumanReviewSeverity = "low" | "medium" | "high" | "p0"

export type DoneConditionDraft = {
  readonly outcome: string
  readonly verifier: string
  readonly acceptanceCriteria: readonly string[]
  readonly sourceRef?: SourceRef
  readonly humanInputRef?: string
  readonly missingFields: readonly string[]
  readonly status: "complete" | "partial" | "invalid"
  readonly invalidReasons: readonly string[]
  readonly riskFlags: readonly RiskFlag[]
  readonly candidateOnly: true
}

export type DoneConditionStatus = {
  readonly status: DoneConditionDraft["status"]
  readonly validForFormalCandidate: boolean
  readonly missingFields: readonly string[]
  readonly invalidReasons: readonly string[]
}

export type HumanReviewFlag = {
  readonly reason: string
  readonly severity: HumanReviewSeverity
  readonly requiredBefore: "formalization" | "merge" | "split" | "approval" | "execution" | "external_consequence"
}

export type FormalNodeCandidate = {
  readonly target: "formal_node_candidate"
  readonly sourceRef?: SourceRef
  readonly humanInputRef?: string
  readonly intent: string
  readonly outcome: string
  readonly verifier: string
  readonly acceptanceCriteria: readonly string[]
  readonly missingFields: readonly string[]
  readonly riskFlags: readonly RiskFlag[]
  readonly humanReviewRequired: boolean
  readonly doneCondition: DoneConditionDraft
  readonly candidateOnly: true
}

export type PendingNodeCandidate = {
  readonly target: "pending_node_candidate"
  readonly pendingType: PendingType
  readonly missingFields: readonly string[]
  readonly clarificationQuestion: string
  readonly humanVisibleAllowed: boolean
  readonly blockedReasons: readonly string[]
  readonly candidateOnly: true
}

export type EvidenceCandidate = {
  readonly target: "evidence_candidate"
  readonly sourceRef?: SourceRef
  readonly sanitizedSummary: string
  readonly relatedNodeCandidateIds: readonly string[]
  readonly contradictionFlags: readonly string[]
  readonly candidateOnly: true
}

export type SubtaskCandidate = {
  readonly target: "subtask_candidate"
  readonly parentNodeCandidateId: string
  readonly stepSummary: string
  readonly noIndependentDoneCondition: true
  readonly noSeparateApprovalBoundary: true
  readonly candidateOnly: true
}

export type NoiseCandidate = {
  readonly target: "noise_candidate"
  readonly sourceRef?: SourceRef
  readonly rejectReason: string
  readonly classifierVersion: string
  readonly rejectedAt: string
  readonly candidateOnly: true
}

export type MergeCandidate = {
  readonly target: "merge_candidate"
  readonly targetNodeCandidateId: string
  readonly sameDoneConditionReason: string
  readonly riskFlags: readonly string[]
  readonly humanReviewRequired: boolean
  readonly candidateOnly: true
}

export type SplitPartCandidate = {
  readonly title: string
  readonly reason: string
}

export type SplitCandidate = {
  readonly target: "split_candidate"
  readonly proposedParts: readonly SplitPartCandidate[]
  readonly splitReasons: readonly string[]
  readonly humanReviewRequired: boolean
  readonly candidateOnly: true
}

export type AISilentProcessingEventCandidate = {
  readonly target: "ai_silent_processing_event_candidate"
  readonly actionType: "evidence_attach" | "noise_compress" | "subtask_group" | "missing_fields_extract" | "similar_node_search" | "low_risk_summary"
  readonly reason: string
  readonly safeBecause: string
  readonly candidateOnly: true
}

export type DecompositionInput = {
  readonly id?: string
  readonly text: string
  readonly sourceRef?: SourceRef
  readonly humanInputRef?: string
  readonly relatedNodeCandidateIds?: readonly string[]
  readonly parentNodeCandidateId?: string
  readonly targetNodeCandidateId?: string
  readonly classifierVersion?: string
  readonly now?: string
  readonly intent?: string
  readonly outcome?: string
  readonly verifier?: string
  readonly acceptanceCriteria?: readonly string[]
  readonly riskFlags?: readonly RiskFlag[]
  readonly context?: Record<string, unknown>
}

export type DecompositionResult = {
  readonly target: DecompositionTarget
  readonly doneCondition: DoneConditionDraft
  readonly formalNodeCandidate?: FormalNodeCandidate
  readonly pendingNodeCandidate?: PendingNodeCandidate
  readonly evidenceCandidate?: EvidenceCandidate
  readonly subtaskCandidate?: SubtaskCandidate
  readonly noiseCandidate?: NoiseCandidate
  readonly mergeCandidate?: MergeCandidate
  readonly splitCandidate?: SplitCandidate
  readonly humanReview?: HumanReviewFlag
  readonly aiSilentProcessingEventCandidate?: AISilentProcessingEventCandidate
  readonly forbiddenPromotionReasons: readonly ForbiddenPromotionReason[]
  readonly candidateOnly: true
}

export type ForbiddenPromotionReason =
  | "pending_to_formal_without_done_condition_gate"
  | "evidence_to_formal_without_independent_done_condition"
  | "subtask_to_formal_without_separate_boundary"
  | "noise_to_formal"
  | "merge_candidate_to_merged"
  | "split_candidate_to_finalized_split"
  | "done_condition_complete_to_done"
  | "draft_to_approved"
  | "preview_to_approval"
  | "approval_to_execution"
  | "forbidden_context_field_present"
  | "ai_verifier_forbidden"
  | "source_ref_required"
  | "external_execution_payload_present"

export type PromotionCheckInput = {
  readonly from: "pending" | "evidence" | "subtask" | "noise" | "merge_candidate" | "split_candidate" | "done_condition" | "draft" | "preview" | "approval"
  readonly to: "formal" | "merged" | "finalized_split" | "done" | "approved" | "approval" | "execution"
  readonly doneCondition?: DoneConditionDraft
  readonly hasIndependentDoneCondition?: boolean
  readonly hasSeparateDeliverable?: boolean
  readonly hasDifferentVerifier?: boolean
  readonly hasSeparateApprovalBoundary?: boolean
  readonly context?: Record<string, unknown>
}

export type PMCorrectionType =
  | "wrong_formal_node"
  | "wrong_pending"
  | "wrong_evidence"
  | "wrong_subtask"
  | "wrong_noise"
  | "wrong_merge_candidate"
  | "wrong_split_candidate"
  | "unnecessary_human_review"
  | "missed_human_review"
  | "p0_failure"
  | "unknown"

export type PMCorrectionInput = {
  readonly expected: DecompositionTarget
  readonly actual: DecompositionTarget
  readonly p0?: boolean
  readonly humanReviewExpected?: boolean
  readonly humanReviewActual?: boolean
}
