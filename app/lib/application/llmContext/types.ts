import type { ForbiddenContextFinding } from "./exclusionScanner.ts"

export type LlmContextRoute = "fast_extraction" | "draft_generation" | "critic_verification" | "deep_reasoning"

export type LLMContextPack = {
  readonly route: LlmContextRoute
  readonly nodeSummary: string
  readonly sourceSummary?: string
  readonly doneConditionSummary?: string
  readonly missingFields?: readonly string[]
  readonly evidenceSummaries?: readonly string[]
  readonly relatedCandidateSummaries?: readonly string[]
  readonly constraints: {
    readonly externalExecutionBlocked: true
    readonly approvalRequired: true
    readonly humanReviewRequired: true
    readonly forbiddenActions: readonly string[]
  }
}

export type LLMContextPackInput = Omit<LLMContextPack, "constraints"> & {
  readonly rawContext?: unknown
}

export type LLMContextPackResult =
  | { readonly ok: true; readonly pack: LLMContextPack }
  | { readonly ok: false; readonly reason: "forbidden_llm_context"; readonly findings: readonly ForbiddenContextFinding[] }
