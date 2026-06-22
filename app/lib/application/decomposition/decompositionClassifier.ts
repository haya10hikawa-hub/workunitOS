import { buildDoneConditionDraft, containsForbiddenContextField } from "./doneConditionGate.ts"
import { detectForbiddenPromotion } from "./promotionRules.ts"
import type {
  AISilentProcessingEventCandidate,
  DecompositionInput,
  DecompositionResult,
  EvidenceCandidate,
  FormalNodeCandidate,
  HumanReviewFlag,
  MergeCandidate,
  NoiseCandidate,
  PendingNodeCandidate,
  SplitCandidate,
  SubtaskCandidate,
} from "./types.ts"

const DEFAULT_CLASSIFIER_VERSION = "node-decomposition-v1"
const DEFAULT_REJECTED_AT = "1970-01-01T00:00:00.000Z"

export function classifyDecompositionCandidate(input: DecompositionInput): DecompositionResult {
  const doneCondition = buildDoneConditionDraft(input)
  const p0 = containsForbiddenContextField(input.context) || /approvalId|targetHash|payloadHash|tenantId|userId|role/i.test(input.text)
  const text = input.text.trim()
  const lower = text.toLowerCase()

  if (p0) {
    const noiseCandidate = buildNoise(input, "p0_forbidden_context_or_payload")
    return baseResult(input, "noise_candidate", { noiseCandidate, doneCondition, humanReview: buildHumanReview("P0 safety boundary", "p0", "formalization") })
  }

  if (isLowValueNoise(text)) {
    const noiseCandidate = buildNoise(input, "low_value_signal")
    return baseResult(input, "noise_candidate", { noiseCandidate, doneCondition })
  }

  if (isAiSilentEvidenceAttach(text)) {
    const evidenceCandidate = buildEvidence(input)
    const aiSilentProcessingEventCandidate = buildSilent("evidence_attach", "Exact source appears to extend an existing issue.", "Candidate-only evidence attach, no merge or approval.")
    return baseResult(input, "ai_silent_processing_event_candidate", { evidenceCandidate, aiSilentProcessingEventCandidate, doneCondition })
  }

  if (isMergeCandidate(text)) {
    const mergeCandidate = buildMerge(input)
    return baseResult(input, "merge_candidate", { mergeCandidate, doneCondition })
  }

  if (isSplitCandidate(text)) {
    const splitCandidate = buildSplit()
    return baseResult(input, "split_candidate", { splitCandidate, doneCondition, humanReview: buildHumanReview("Split changes work structure.", "high", "split") })
  }

  if (isHumanReviewRequired(text)) {
    const formalNodeCandidate = doneCondition.status === "complete" ? buildFormal(input) : undefined
    return baseResult(input, "human_review_required", { formalNodeCandidate, doneCondition, humanReview: buildHumanReview("External or responsible human decision required.", "high", "formalization") })
  }

  if (isSubtask(text)) {
    const subtaskCandidate = buildSubtask(input)
    return baseResult(input, "subtask_candidate", { subtaskCandidate, doneCondition })
  }

  if (isEvidence(text, lower)) {
    const evidenceCandidate = buildEvidence(input)
    return baseResult(input, "evidence_candidate", { evidenceCandidate, doneCondition })
  }

  if (doneCondition.status === "complete") {
    const formalNodeCandidate = buildFormal(input)
    return baseResult(input, "formal_node_candidate", { formalNodeCandidate, doneCondition, humanReview: buildHumanReview("Human review is required before formalization.", "medium", "formalization") })
  }

  const pendingNodeCandidate = buildPending(input, doneCondition.missingFields)
  return baseResult(input, "pending_node_candidate", { pendingNodeCandidate, doneCondition })
}

function baseResult(
  input: DecompositionInput,
  target: DecompositionResult["target"],
  parts: Omit<Partial<DecompositionResult>, "target" | "candidateOnly" | "forbiddenPromotionReasons">,
): DecompositionResult {
  return {
    target,
    doneCondition: parts.doneCondition ?? buildDoneConditionDraft(input),
    formalNodeCandidate: parts.formalNodeCandidate,
    pendingNodeCandidate: parts.pendingNodeCandidate,
    evidenceCandidate: parts.evidenceCandidate,
    subtaskCandidate: parts.subtaskCandidate,
    noiseCandidate: parts.noiseCandidate,
    mergeCandidate: parts.mergeCandidate,
    splitCandidate: parts.splitCandidate,
    humanReview: parts.humanReview,
    aiSilentProcessingEventCandidate: parts.aiSilentProcessingEventCandidate,
    forbiddenPromotionReasons: detectForbiddenPromotion({
      from: "done_condition",
      to: "done",
      doneCondition: parts.doneCondition,
      context: input.context,
    }),
    candidateOnly: true,
  }
}

function buildFormal(input: DecompositionInput): FormalNodeCandidate {
  const doneCondition = buildDoneConditionDraft(input)
  return {
    target: "formal_node_candidate",
    sourceRef: input.sourceRef,
    humanInputRef: input.humanInputRef,
    intent: input.intent?.trim() || inferIntent(input.text),
    outcome: doneCondition.outcome,
    verifier: doneCondition.verifier,
    acceptanceCriteria: doneCondition.acceptanceCriteria,
    missingFields: doneCondition.missingFields,
    riskFlags: doneCondition.riskFlags,
    humanReviewRequired: true,
    doneCondition,
    candidateOnly: true,
  }
}

function buildPending(input: DecompositionInput, missingFields: readonly string[]): PendingNodeCandidate {
  const humanVisibleAllowed = /金曜|期限|顧客|PM|重要|契約/.test(input.text) && missingFields.length > 0
  return {
    target: "pending_node_candidate",
    pendingType: missingFields.length > 0 ? "missing_field" : "branching",
    missingFields,
    clarificationQuestion: missingFields.length > 0 ? `Clarify ${missingFields[0]}.` : "Clarify the intended work outcome.",
    humanVisibleAllowed,
    blockedReasons: missingFields.length > 0 ? missingFields.map((field) => `missing_${field}`) : ["decomposition_unclear"],
    candidateOnly: true,
  }
}

function buildEvidence(input: DecompositionInput): EvidenceCandidate {
  return {
    target: "evidence_candidate",
    sourceRef: input.sourceRef,
    sanitizedSummary: input.text.trim(),
    relatedNodeCandidateIds: input.relatedNodeCandidateIds ?? [],
    contradictionFlags: [],
    candidateOnly: true,
  }
}

function buildSubtask(input: DecompositionInput): SubtaskCandidate {
  return {
    target: "subtask_candidate",
    parentNodeCandidateId: input.parentNodeCandidateId ?? "parent:unknown",
    stepSummary: input.text.trim(),
    noIndependentDoneCondition: true,
    noSeparateApprovalBoundary: true,
    candidateOnly: true,
  }
}

function buildNoise(input: DecompositionInput, rejectReason: string): NoiseCandidate {
  return {
    target: "noise_candidate",
    sourceRef: input.sourceRef,
    rejectReason,
    classifierVersion: input.classifierVersion ?? DEFAULT_CLASSIFIER_VERSION,
    rejectedAt: input.now ?? DEFAULT_REJECTED_AT,
    candidateOnly: true,
  }
}

function buildMerge(input: DecompositionInput): MergeCandidate {
  return {
    target: "merge_candidate",
    targetNodeCandidateId: input.targetNodeCandidateId ?? "node:similar",
    sameDoneConditionReason: "Same requester/thread/deliverable appears likely, candidate only.",
    riskFlags: input.targetNodeCandidateId ? [] : ["target_node_unconfirmed"],
    humanReviewRequired: true,
    candidateOnly: true,
  }
}

function buildSplit(): SplitCandidate {
  return {
    target: "split_candidate",
    proposedParts: [
      { title: "Investigation", reason: "Research or verification has its own outcome." },
      { title: "Execution preparation", reason: "Implementation or external consequence is separate." },
      { title: "Reply or coordination", reason: "Human-facing response requires review." },
    ],
    splitReasons: ["multiple_done_conditions", "mixed_research_implementation_reply"],
    humanReviewRequired: true,
    candidateOnly: true,
  }
}

function buildHumanReview(reason: string, severity: HumanReviewFlag["severity"], requiredBefore: HumanReviewFlag["requiredBefore"]): HumanReviewFlag {
  return { reason, severity, requiredBefore }
}

function buildSilent(actionType: AISilentProcessingEventCandidate["actionType"], reason: string, safeBecause: string): AISilentProcessingEventCandidate {
  return { target: "ai_silent_processing_event_candidate", actionType, reason, safeBecause, candidateOnly: true }
}

function isLowValueNoise(text: string): boolean {
  return /^(ありがとう|了解|thanks|thank you|見ました|ok|okay)$/i.test(text.trim())
}

function isMergeCandidate(text: string): boolean {
  return /同じ/.test(text) && /(Slack|Email|メール|GitHub|issue|契約確認)/i.test(text)
}

function isSplitCandidate(text: string): boolean {
  const verbs = ["調査", "修正", "返信", "通知", "比較", "決め", "依頼"]
  return verbs.filter((verb) => text.includes(verb)).length >= 3
}

function isHumanReviewRequired(text: string): boolean {
  return /正式回答|法務|顧客に|承認|契約/.test(text) && /回答|返信|判断|送信/.test(text)
}

function isAiSilentEvidenceAttach(text: string): boolean {
  return /同じGitHub issue|追加ログ|same github issue/i.test(text)
}

function isEvidence(text: string, lower: string): boolean {
  return /log|ci failure|failure log/.test(lower) || /ログ|PDF|URL|契約書PDF/.test(text)
}

function isSubtask(text: string): boolean {
  return /読む|見る|確認する|敬語を直す/.test(text) && !/メモ|一覧|返信案/.test(text)
}

function inferIntent(text: string): string {
  if (/返信|回答/.test(text)) return "reply_draft"
  if (/調査|分析/.test(text)) return "investigation"
  if (/メモ|判断/.test(text)) return "decision_preparation"
  return "workunit_candidate"
}

export { buildDoneConditionDraft, evaluateDoneConditionDraft } from "./doneConditionGate.ts"
export { canSilentlyProcess, detectForbiddenPromotion, requiresHumanReview } from "./promotionRules.ts"
export { classifyPMCorrection } from "./pmCorrectionTaxonomy.ts"
