import { scanLlmContextExclusions } from "../llmContext/exclusionScanner.ts"
import { P0_FORBIDDEN_ACTIONS } from "../safety/p0Policy.ts"
import { detectForbiddenPromotion } from "./promotionRules.ts"
import type { DoneConditionDraft, ForbiddenPromotionReason, PromotionCheckInput } from "./types.ts"

export type RuleGateInput = {
  readonly boundary: "formal_candidate" | "preview" | "approval" | "execution" | "merge_finalization" | "split_finalization"
  readonly doneCondition?: DoneConditionDraft
  readonly context?: unknown
  readonly source?: PromotionCheckInput["from"]
  readonly vectorFinalizesMerge?: boolean
  readonly cacheAuthorizesApproval?: boolean
  readonly toolPinExecutable?: boolean
}

export type RuleGateResult = {
  readonly ok: boolean
  readonly blockedReasons: readonly (ForbiddenPromotionReason | typeof P0_FORBIDDEN_ACTIONS[number])[]
  readonly humanReviewRequired: true
}

export function runRuleGate(input: RuleGateInput): RuleGateResult {
  const blockedReasons = new Set<RuleGateResult["blockedReasons"][number]>()
  const scan = scanLlmContextExclusions(input.context)
  if (!scan.ok) blockedReasons.add("forbidden_context_field_present")
  if (input.vectorFinalizesMerge) blockedReasons.add("vector_merge_finalization")
  if (input.cacheAuthorizesApproval) blockedReasons.add("cache_based_approval")
  if (input.toolPinExecutable) blockedReasons.add("tool_pin_execution")

  for (const reason of detectPromotionReasons(input)) blockedReasons.add(reason)
  return { ok: blockedReasons.size === 0, blockedReasons: [...blockedReasons], humanReviewRequired: true }
}

function detectPromotionReasons(input: RuleGateInput): readonly ForbiddenPromotionReason[] {
  if (input.boundary === "formal_candidate") {
    return detectForbiddenPromotion({
      from: input.source ?? "pending",
      to: "formal",
      doneCondition: input.doneCondition,
      context: recordContext(input.context),
    })
  }
  if (input.boundary === "approval") return detectForbiddenPromotion({ from: "preview", to: "approval", context: recordContext(input.context) })
  if (input.boundary === "execution") return detectForbiddenPromotion({ from: "approval", to: "execution", context: recordContext(input.context) })
  if (input.boundary === "merge_finalization") return detectForbiddenPromotion({ from: "merge_candidate", to: "merged", context: recordContext(input.context) })
  if (input.boundary === "split_finalization") return detectForbiddenPromotion({ from: "split_candidate", to: "finalized_split", context: recordContext(input.context) })
  return []
}

function recordContext(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}
