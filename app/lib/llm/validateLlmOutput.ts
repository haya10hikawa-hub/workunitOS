/**
 * LLM Output Validation
 *
 * Runtime validation for LLM-generated outputs.
 * Invalid output returns typed failures, never raw parse errors.
 */

import type { LlmProcessingResult } from "./types.ts"

// Upper bounds on LLM-produced output (red-team C-07/C-08). The model is an
// untrusted output channel: an injected/oversized response could otherwise
// store unbounded strings or huge arrays downstream.
export const MAX_STRING_FIELD_LENGTH = 8_000
export const MAX_ARRAY_FIELD_ENTRIES = 100

/**
 * Assert that a field exists, is a non-empty string, and is within bounds.
 */
export function assertStringField(
  value: unknown,
  fieldName: string,
  warnings: LlmProcessingResult<unknown>["warnings"],
  maxLength: number = MAX_STRING_FIELD_LENGTH,
): value is string {
  if (typeof value !== "string" || !value.trim()) {
    warnings.push({ code: `missing_${fieldName}`, message: `LLM output missing required field: ${fieldName}` })
    return false
  }
  if (value.length > maxLength) {
    warnings.push({ code: `oversized_${fieldName}`, message: `LLM output field exceeds max length: ${fieldName}` })
    return false
  }
  return true
}

/**
 * Assert that a field is a string array with at least one entry, bounded in
 * both entry count and per-entry length.
 */
export function assertStringArrayField(
  value: unknown,
  fieldName: string,
  warnings: LlmProcessingResult<unknown>["warnings"],
  maxEntries: number = MAX_ARRAY_FIELD_ENTRIES,
  maxLength: number = MAX_STRING_FIELD_LENGTH,
): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === "string")) {
    warnings.push({ code: `invalid_${fieldName}`, message: `LLM output has invalid ${fieldName}` })
    return false
  }
  if (value.length > maxEntries || value.some((v) => v.length > maxLength)) {
    warnings.push({ code: `oversized_${fieldName}`, message: `LLM output ${fieldName} exceeds bounds` })
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
