/**
 * LLM Output Validation
 *
 * Runtime validation for LLM-generated outputs.
 * Invalid output returns typed failures, never raw parse errors.
 */

import type { LlmProcessingResult } from "./types.ts"

/**
 * Assert that a field exists and is a non-empty string.
 */
export function assertStringField(
  value: unknown,
  fieldName: string,
  warnings: LlmProcessingResult<unknown>["warnings"],
): value is string {
  if (typeof value !== "string" || !value.trim()) {
    warnings.push({ code: `missing_${fieldName}`, message: `LLM output missing required field: ${fieldName}` })
    return false
  }
  return true
}

/**
 * Assert that a field is a string array with at least one entry.
 */
export function assertStringArrayField(
  value: unknown,
  fieldName: string,
  warnings: LlmProcessingResult<unknown>["warnings"],
): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === "string")) {
    warnings.push({ code: `invalid_${fieldName}`, message: `LLM output has invalid ${fieldName}` })
    return false
  }
  return true
}

/**
 * Validate that a WorkUnit draft has the minimum required fields.
 */
export function validateWorkUnitDraftMinimum(
  draft: Record<string, unknown>,
  warnings: LlmProcessingResult<unknown>["warnings"],
): boolean {
  if (!assertStringField(draft.title, "title", warnings)) return false
  if (!assertStringField(draft.situation, "situation", warnings)) return false
  if (!assertStringField(draft.problem, "problem", warnings)) return false
  if (!assertStringField(draft.nextAction, "nextAction", warnings)) return false
  if (!assertStringArrayField(draft.actors, "actors", warnings)) return false
  if (!assertStringArrayField(draft.tasks, "tasks", warnings)) return false
  return true
}

/**
 * Check if LLM output contains evidence of hallucination.
 * This is a heuristic — not definitive.
 */
export function detectHallucinationSignals(
  draft: Record<string, unknown>,
  sourceFields: string[],
): string[] {
  const warnings: string[] = []

  for (const field of sourceFields) {
    const value = draft[field]
    if (typeof value === "string" && value.length > 0) {
      // Check if the field contains generic/placeholder text
      if (/^(todo|tbd|n\/a|none|unknown|placeholder|test)$/i.test(value.trim())) {
        warnings.push(`Field "${field}" appears to be a placeholder`)
      }
    }
  }

  return warnings
}
