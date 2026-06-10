import { evaluatePrivacyRegression, type SafetyFinding } from "../workUnitSafety.ts"
import type { SanitizedWorkUnitCandidate } from "../../types/sourceHopper.ts"

export type PrivacySandboxBlockingFinding = Pick<SafetyFinding, "id" | "message" | "path">

export type PrivacySandboxAgentResult = {
  passed: boolean
  score: number
  blocked: string[]
  blockingFindings: PrivacySandboxBlockingFinding[]
}

export function runPrivacySandboxAgent(candidates: readonly SanitizedWorkUnitCandidate[]): PrivacySandboxAgentResult {
  try {
    const result = evaluatePrivacyRegression(candidates)
    const blockingFindings = result.findings
      .filter((finding) => finding.severity === "block")
      .map(({ id, message, path }) => ({ id, message, path }))
    return { passed: result.passed, score: result.score, blocked: blockingFindings.map((finding) => finding.message), blockingFindings }
  } catch {
    const fallback = { id: "privacy_evaluation_failed", message: "Privacy evaluation failed." }
    return { passed: false, score: 0, blocked: [fallback.message], blockingFindings: [fallback] }
  }
}
