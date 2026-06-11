/**
 * Deterministic Priority Scoring
 *
 * priorityScore = (impact * urgency * actorWeight) / effort
 *
 * LLM may suggest score inputs, but application logic ALWAYS
 * calculates the final priorityScore deterministically.
 */

import type { ScoreInput, ScoreResult } from "./types.ts"

/**
 * Clamp a score to the 1-5 range. Falls back to the given default.
 */
export function clampScore(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return clamp(fallback)
  return clamp(Math.round(value))
}

function clamp(value: number): number {
  return Math.min(5, Math.max(1, value))
}

/**
 * Calculate the deterministic priority score.
 *
 * Formula: (impact * urgency * actorWeight) / effort
 *
 * - impact: 1-5
 * - urgency: 1-5
 * - actorWeight: 1-5
 * - effort: 1-5 (minimum 1 to avoid division by zero)
 */
export function calculatePriorityScore(input: ScoreInput): ScoreResult {
  const impact = clamp(input.impact)
  const urgency = clamp(input.urgency)
  const actorWeight = clamp(input.actorWeight)
  const effort = Math.max(1, clamp(input.effort))

  const priorityScore = Math.round((impact * urgency * actorWeight) / effort)

  return {
    priorityScore,
    impact,
    urgency,
    actorWeight,
    effort,
    formula: `(${impact} * ${urgency} * ${actorWeight}) / ${effort} = ${priorityScore}`,
  }
}
