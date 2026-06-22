import { containsExternalExecutionPayload, containsForbiddenContextField, evaluateDoneConditionDraft, isAiVerifier } from "./doneConditionGate.ts"
import type { ForbiddenPromotionReason, PromotionCheckInput } from "./types.ts"

export function detectForbiddenPromotion(input: PromotionCheckInput): ForbiddenPromotionReason[] {
  const reasons: ForbiddenPromotionReason[] = []

  if (containsForbiddenContextField(input.context)) reasons.push("forbidden_context_field_present")
  if (containsExternalExecutionPayload(input.context)) reasons.push("external_execution_payload_present")

  if (input.from === "pending" && input.to === "formal") {
    const status = input.doneCondition ? evaluateDoneConditionDraft(input.doneCondition, input.context) : null
    if (!status?.validForFormalCandidate) reasons.push("pending_to_formal_without_done_condition_gate")
  }
  if (input.from === "evidence" && input.to === "formal" && !input.hasIndependentDoneCondition) {
    reasons.push("evidence_to_formal_without_independent_done_condition")
  }
  if (input.from === "subtask" && input.to === "formal" && !(input.hasSeparateDeliverable || input.hasDifferentVerifier || input.hasSeparateApprovalBoundary)) {
    reasons.push("subtask_to_formal_without_separate_boundary")
  }
  if (input.from === "noise" && input.to === "formal") reasons.push("noise_to_formal")
  if (input.from === "merge_candidate" && input.to === "merged") reasons.push("merge_candidate_to_merged")
  if (input.from === "split_candidate" && input.to === "finalized_split") reasons.push("split_candidate_to_finalized_split")
  if (input.from === "done_condition" && input.to === "done") reasons.push("done_condition_complete_to_done")
  if (input.from === "draft" && input.to === "approved") reasons.push("draft_to_approved")
  if (input.from === "preview" && input.to === "approval") reasons.push("preview_to_approval")
  if (input.from === "approval" && input.to === "execution") reasons.push("approval_to_execution")

  if (input.doneCondition) {
    if (!input.doneCondition.sourceRef && !input.doneCondition.humanInputRef) reasons.push("source_ref_required")
    if (isAiVerifier(input.doneCondition.verifier)) reasons.push("ai_verifier_forbidden")
  }

  return [...new Set(reasons)]
}

export function requiresHumanReview(input: {
  readonly highResponsibility?: boolean
  readonly highImpact?: boolean
  readonly externalConsequence?: boolean
  readonly approvalNeeded?: boolean
  readonly unclearOwner?: boolean
  readonly conflictingEvidence?: boolean
  readonly highRiskMerge?: boolean
  readonly highRiskSplit?: boolean
  readonly sensitiveActor?: boolean
  readonly lowConfidence?: boolean
  readonly missingHumanOnlyIntent?: boolean
}): boolean {
  return Boolean(
    input.highResponsibility ||
    input.highImpact ||
    input.externalConsequence ||
    input.approvalNeeded ||
    input.unclearOwner ||
    input.conflictingEvidence ||
    input.highRiskMerge ||
    input.highRiskSplit ||
    input.sensitiveActor ||
    (input.lowConfidence && input.highImpact) ||
    input.missingHumanOnlyIntent,
  )
}

export function canSilentlyProcess(input: {
  readonly lowRisk?: boolean
  readonly exactSourceMatch?: boolean
  readonly evidenceOnly?: boolean
  readonly noiseOnly?: boolean
  readonly minorSubtask?: boolean
  readonly highImpact?: boolean
  readonly externalConsequence?: boolean
  readonly conflictingEvidence?: boolean
}): boolean {
  if (input.highImpact || input.externalConsequence || input.conflictingEvidence) return false
  return Boolean(input.lowRisk || input.exactSourceMatch || input.evidenceOnly || input.noiseOnly || input.minorSubtask)
}
