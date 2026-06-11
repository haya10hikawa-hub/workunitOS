/**
 * WorkUnit Evaluation
 *
 * Evaluates a WorkUnitDraft for readiness without executing anything.
 * Checks completeness, hallucination risk, and suggests next steps.
 */

import type { WorkUnitDraft } from "../domain/types.ts"
import type { LlmProvider, WorkUnitEvaluationResult, LlmProcessingResult } from "./types.ts"
import { buildWorkUnitEvaluationPrompt } from "./prompts.ts"
import type { LlmModelRoute } from "./modelRouter.ts"

/**
 * Evaluate a WorkUnitDraft for readiness.
 *
 * Checks:
 *   - Required fields present
 *   - Next action is defined
 *   - Tasks are concrete
 *   - Hallucination risk assessment
 *
 * NEVER triggers external execution.
 */
export async function evaluateWorkUnit(
  provider: LlmProvider,
  draft: WorkUnitDraft,
  options: { modelRoute?: LlmModelRoute } = {},
): Promise<LlmProcessingResult<WorkUnitEvaluationResult>> {
  const warnings: { code: string; message: string }[] = []

  // Deterministic checks first (no LLM needed for basic validation)
  const deterministicResult = evaluateDeterministic(draft)
  if (deterministicResult.hallucinationRisk === "high") {
    return {
      ok: true,
      data: deterministicResult,
      warnings,
      stage: "evaluate_workunit",
    }
  }

  // LLM-based evaluation
  const messages = buildWorkUnitEvaluationPrompt(
    draft.title,
    draft.situation,
    draft.problem,
    draft.nextAction,
    draft.tasks,
    draft.missingFields,
  )

  try {
    const response = await provider.generateJson({
      messages,
      model: options.modelRoute?.model,
      temperature: options.modelRoute?.temperature,
      maxTokens: options.modelRoute?.maxOutputTokens,
      stage: "evaluate_workunit",
    })
    const raw = JSON.parse(response.content) as Record<string, unknown>

    const result: WorkUnitEvaluationResult = {
      isExecutable: raw.isExecutable === true,
      isComplete: raw.isComplete === true && draft.missingFields.length === 0,
      missingFields: Array.isArray(raw.missingFields) ? raw.missingFields.filter((f): f is string => typeof f === "string") : draft.missingFields,
      warnings: Array.isArray(raw.warnings) ? raw.warnings.filter((w): w is string => typeof w === "string") : [],
      hallucinationRisk: isValidHallucinationRisk(raw.hallucinationRisk) ? raw.hallucinationRisk : deterministicResult.hallucinationRisk,
      suggestedNextStep: typeof raw.suggestedNextStep === "string" ? raw.suggestedNextStep : deterministicResult.suggestedNextStep,
    }

    return { ok: true, data: result, warnings, stage: "evaluate_workunit" }
  } catch {
    return { ok: true, data: deterministicResult, warnings, stage: "evaluate_workunit" }
  }
}

function evaluateDeterministic(draft: WorkUnitDraft): WorkUnitEvaluationResult {
  const missingFields = [...draft.missingFields]
  const warnings: string[] = []

  if (!draft.nextAction || draft.nextAction.startsWith("Clarify")) {
    warnings.push("Next action is vague")
  }
  if (draft.tasks.length === 0) {
    warnings.push("No tasks defined")
    missingFields.push("Tasks")
  }
  if (!draft.actors.length || draft.actors.includes("Unknown")) {
    warnings.push("Actors are unknown")
    missingFields.push("Actors")
  }

  const hallucinationRisk: WorkUnitEvaluationResult["hallucinationRisk"] =
    missingFields.length >= 3 ? "high" :
    missingFields.length >= 1 ? "medium" :
    "low"

  const isComplete = missingFields.length === 0
  const isExecutable = isComplete && warnings.length === 0

  return {
    isExecutable,
    isComplete,
    missingFields,
    warnings,
    hallucinationRisk,
    suggestedNextStep: isExecutable
      ? "Create action preview for external execution"
      : "Fill missing fields before proceeding",
  }
}

function isValidHallucinationRisk(value: unknown): value is WorkUnitEvaluationResult["hallucinationRisk"] {
  return value === "none" || value === "low" || value === "medium" || value === "high"
}
