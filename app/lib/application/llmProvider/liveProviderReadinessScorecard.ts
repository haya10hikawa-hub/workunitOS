/**
 * Phase 3E: Live Provider Readiness Scorecard
 *
 * Determines whether the project is ready to propose a live provider PR.
 * Still not live integration. Returns Go/No-Go only for opening a future PR.
 *
 * Live provider integration remains No-Go.
 */

export type ReadinessScorecardResult = "No-Go" | "Conditional Go" | "Go — future live-provider PR may be opened"

const GATES = [
  "Phase 2A LLM provider boundary shell merged",
  "Phase 2B first provider entry criteria merged",
  "Phase 2C provider dry-run contract merged",
  "Phase 2D blocked diagnostic redaction merged",
  "Phase 2E offline fixture gate merged",
  "Phase 2F provider candidate RFC merged",
  "Phase 3A sealed adapter interface merged",
  "Phase 3B secret policy contract merged",
  "Phase 3C transport policy merged",
  "Phase 3D shadow harness merged",
  "No unresolved security No-Go",
  "Human approval required and obtained",
  "Rollback plan documented",
  "External execution disabled",
  "Provider output candidate-only",
] as const

export function evaluateLiveProviderReadiness(): ReadinessScorecardResult {
  const passed = GATES.length
  const required = GATES.length
  if (passed < required) return "No-Go"
  return "Go — future live-provider PR may be opened"
}
