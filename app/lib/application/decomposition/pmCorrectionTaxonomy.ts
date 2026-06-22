import type { PMCorrectionInput, PMCorrectionType } from "./types.ts"

export function classifyPMCorrection(input: PMCorrectionInput): PMCorrectionType {
  if (input.p0) return "p0_failure"
  if (input.humanReviewExpected && !input.humanReviewActual) return "missed_human_review"
  if (!input.humanReviewExpected && input.humanReviewActual) return "unnecessary_human_review"
  if (input.expected === input.actual) return "unknown"

  switch (input.actual) {
    case "formal_node_candidate": return "wrong_formal_node"
    case "pending_node_candidate": return "wrong_pending"
    case "evidence_candidate": return "wrong_evidence"
    case "subtask_candidate": return "wrong_subtask"
    case "noise_candidate": return "wrong_noise"
    case "merge_candidate": return "wrong_merge_candidate"
    case "split_candidate": return "wrong_split_candidate"
    case "human_review_required": return "unnecessary_human_review"
    default: return "unknown"
  }
}
