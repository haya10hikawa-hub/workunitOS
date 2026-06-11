/**
 * LLM Budget Guard
 *
 * Character-based token budget estimation for LLM pipeline stages.
 * Prevents oversized inputs from reaching the provider.
 *
 * CURRENT: uses character counting as a token proxy.
 *   In production, use a proper tokenizer (tiktoken, etc.) for accurate
 *   token counting and cost estimation.
 */

import type { LlmProcessingStage } from "./types.ts"

// ─── Stage Budget ────────────────────────────────────────────────

export type LlmStageBudget = {
  stage: LlmProcessingStage
  /** Maximum input characters allowed for this stage. */
  maxInputChars: number
  /** Estimated max output tokens (for cost estimation, not enforced here). */
  maxOutputTokens: number
}

export type LlmBudgetConfig = {
  sanitizeSignal: LlmStageBudget
  extractCandidate: LlmStageBudget
  generateWorkUnitDraft: LlmStageBudget
  evaluateWorkUnit: LlmStageBudget
}

export const DEFAULT_LLM_BUDGET: LlmBudgetConfig = {
  sanitizeSignal: {
    stage: "sanitize_signal",
    maxInputChars: 8_000,
    maxOutputTokens: 0, // no LLM call
  },
  extractCandidate: {
    stage: "extract_candidate",
    maxInputChars: 4_000,
    maxOutputTokens: 500,
  },
  generateWorkUnitDraft: {
    stage: "generate_workunit_draft",
    maxInputChars: 3_000,
    maxOutputTokens: 800,
  },
  evaluateWorkUnit: {
    stage: "evaluate_workunit",
    maxInputChars: 2_000,
    maxOutputTokens: 400,
  },
}

// ─── Budget Check ───────────────────────────────────────────────

export type BudgetCheckResult =
  | { ok: true }
  | { ok: false; error: "token_budget_exceeded"; stage: LlmProcessingStage; inputChars: number; maxChars: number }

/**
 * Check if the input exceeds the stage budget.
 */
export function checkStageBudget(
  stage: LlmProcessingStage,
  input: string,
  budget: LlmBudgetConfig = DEFAULT_LLM_BUDGET,
): BudgetCheckResult {
  return checkCharBudget(stage, input.length, budget)
}

/**
 * Check if a known character count exceeds the stage budget.
 * Use this for pre-sanitization checks where the exact content
 * string is not yet available.
 */
export function checkCharBudget(
  stage: LlmProcessingStage,
  charCount: number,
  budget: LlmBudgetConfig = DEFAULT_LLM_BUDGET,
): BudgetCheckResult {
  const stageBudget = stageBudgetForConfig(stage, budget)

  if (charCount > stageBudget.maxInputChars) {
    return {
      ok: false,
      error: "token_budget_exceeded",
      stage,
      inputChars: charCount,
      maxChars: stageBudget.maxInputChars,
    }
  }

  return { ok: true }
}

// ─── Estimation ──────────────────────────────────────────────────

/**
 * Estimate input characters from any value.
 * For strings, returns length. For objects, returns JSON string length.
 */
export function estimateInputChars(input: unknown): number {
  if (typeof input === "string") return input.length
  try {
    return JSON.stringify(input).length
  } catch {
    return 0
  }
}

// ─── Stage Budget Resolution ────────────────────────────────────

function stageBudgetForConfig(stage: LlmProcessingStage, config: LlmBudgetConfig): LlmStageBudget {
  switch (stage) {
    case "sanitize_signal": return config.sanitizeSignal
    case "extract_candidate": return config.extractCandidate
    case "generate_workunit_draft": return config.generateWorkUnitDraft
    case "evaluate_workunit": return config.evaluateWorkUnit
    case "generate_action_preview": return config.extractCandidate // reuse
  }
}
