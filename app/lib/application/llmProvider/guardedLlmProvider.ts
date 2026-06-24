import { DISABLED_LLM_PROVIDER } from "./disabledLlmProvider.ts"
import { evaluateLlmProviderBoundary, type LlmProviderBoundaryInput, type LlmProviderBoundaryResult } from "./llmProviderBoundary.ts"

export type GuardedLlmProviderResult = LlmProviderBoundaryResult & {
  readonly provider: typeof DISABLED_LLM_PROVIDER
}

export function runGuardedLlmProvider(input: LlmProviderBoundaryInput): GuardedLlmProviderResult {
  return { ...evaluateLlmProviderBoundary(input), provider: DISABLED_LLM_PROVIDER }
}
