/**
 * LLM Pipeline Orchestrator
 *
 * Orchestrates the full LLM processing pipeline:
 *   ExternalSignal → SanitizedSignal → SourceCandidate → WorkUnitDraft → Evaluation
 *
 * Handles:
 *   - Budget prechecks
 *   - Per-stage model routing via modelRouter
 *   - Stage-by-stage execution
 *   - Risk flag and warning accumulation
 *   - Typed failure returns (never raw errors)
 */

import type { TenantId } from "../tenant/types.ts"
import type { ExternalSignal, SourceCandidate, WorkUnitDraft } from "../domain/types.ts"
import type {
  LlmProvider,
  LlmProcessingStage,
  LlmWarning,
  RiskFlag,
  SanitizedSignal,
  WorkUnitEvaluationResult,
} from "./types.ts"
import { sanitizeForLlm } from "./sanitize.ts"
import { extractSourceCandidate } from "./extractCandidate.ts"
import { generateWorkUnitDraftFromCandidate } from "./generateWorkUnitDraft.ts"
import { evaluateWorkUnit } from "./evaluateWorkUnit.ts"
import { checkStageBudget, checkCharBudget, estimateInputChars, type LlmBudgetConfig } from "./budget.ts"
import { getModelRoute, type LlmModelRoute } from "./modelRouter.ts"

// ─── Result Type ─────────────────────────────────────────────────

export type ProcessWorkSignalResult =
  | {
      ok: true
      sanitizedSignal: SanitizedSignal
      candidate: SourceCandidate
      draft: WorkUnitDraft
      evaluation: WorkUnitEvaluationResult
      warnings: LlmWarning[]
      riskFlags: RiskFlag[]
    }
  | {
      ok: false
      error: "unsafe_input" | "invalid_llm_output" | "token_budget_exceeded"
      stage: LlmProcessingStage
      warnings: LlmWarning[]
      riskFlags: RiskFlag[]
    }

// ─── Orchestrator ────────────────────────────────────────────────

export async function processWorkSignal(
  provider: LlmProvider,
  signal: ExternalSignal,
  tenantId: TenantId,
  options: {
    budget?: LlmBudgetConfig
    createdBy?: "system" | "ai"
    /** Custom model routes per stage. Falls back to modelRouter defaults. */
    modelRoutes?: Partial<Record<LlmProcessingStage, LlmModelRoute>>
  } = {},
): Promise<ProcessWorkSignalResult> {
  const allWarnings: LlmWarning[] = []
  const allRiskFlags: RiskFlag[] = []

  // ── Stage 1: Budget Precheck ──────────────────────────────────
  const inputChars = estimateInputChars(signal)
  const budgetCheck = checkCharBudget("sanitize_signal", inputChars, options.budget)
  if (!budgetCheck.ok) {
    return { ok: false, error: "token_budget_exceeded", stage: "sanitize_signal", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  // ── Stage 2: Sanitization ─────────────────────────────────────
  const sanitized = sanitizeForLlm(signal)
  allRiskFlags.push(...sanitized.riskFlags)

  if (sanitized.riskFlags.includes("prompt_injection_detected")) {
    allWarnings.push({ code: "unsafe_input", message: "Prompt injection detected", riskFlag: "prompt_injection_detected" })
    return { ok: false, error: "unsafe_input", stage: "sanitize_signal", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  // Budget check for extract stage
  const extractBudget = checkStageBudget("extract_candidate", sanitized.sanitizedContent, options.budget)
  if (!extractBudget.ok) {
    return { ok: false, error: "token_budget_exceeded", stage: "extract_candidate", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  // ── Stage 3: Candidate Extraction ─────────────────────────────
  const extractRoute = options.modelRoutes?.extract_candidate ?? getModelRoute("extract_candidate")
  const candidateResult = await extractSourceCandidate(provider, sanitized, tenantId, { modelRoute: extractRoute })
  if (!candidateResult.ok) {
    allWarnings.push(...candidateResult.warnings)
    return { ok: false, error: candidateResult.error, stage: "extract_candidate", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  const candidate = candidateResult.data
  allWarnings.push(...candidateResult.warnings)

  // Budget check for draft stage
  const draftInput = JSON.stringify(candidate)
  const draftBudget = checkStageBudget("generate_workunit_draft", draftInput, options.budget)
  if (!draftBudget.ok) {
    return { ok: false, error: "token_budget_exceeded", stage: "generate_workunit_draft", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  // ── Stage 4: WorkUnit Draft Generation ────────────────────────
  const draftRoute = options.modelRoutes?.generate_workunit_draft ?? getModelRoute("generate_workunit_draft")
  const draftResult = await generateWorkUnitDraftFromCandidate(provider, candidate, tenantId, {
    createdBy: options.createdBy,
    modelRoute: draftRoute,
  })
  if (!draftResult.ok) {
    allWarnings.push(...draftResult.warnings)
    return { ok: false, error: draftResult.error, stage: "generate_workunit_draft", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  const draft = draftResult.data
  allWarnings.push(...draftResult.warnings)

  // Budget check for eval stage
  const evalInput = JSON.stringify({ title: draft.title, situation: draft.situation, problem: draft.problem, nextAction: draft.nextAction })
  const evalBudget = checkStageBudget("evaluate_workunit", evalInput, options.budget)
  if (!evalBudget.ok) {
    return { ok: false, error: "token_budget_exceeded", stage: "evaluate_workunit", warnings: allWarnings, riskFlags: allRiskFlags }
  }

  // ── Stage 5: Evaluation ───────────────────────────────────────
  const evalRoute = options.modelRoutes?.evaluate_workunit ?? getModelRoute("evaluate_workunit")
  const evalResult = await evaluateWorkUnit(provider, draft, { modelRoute: evalRoute })
  if (!evalResult.ok) {
    allWarnings.push(...evalResult.warnings)
    return {
      ok: true,
      sanitizedSignal: sanitized,
      candidate,
      draft,
      evaluation: { isExecutable: false, isComplete: false, missingFields: draft.missingFields, warnings: [], hallucinationRisk: "medium", suggestedNextStep: "Manual review required" },
      warnings: allWarnings,
      riskFlags: allRiskFlags,
    }
  }

  return {
    ok: true,
    sanitizedSignal: sanitized,
    candidate,
    draft,
    evaluation: evalResult.data,
    warnings: allWarnings,
    riskFlags: allRiskFlags,
  }
}
