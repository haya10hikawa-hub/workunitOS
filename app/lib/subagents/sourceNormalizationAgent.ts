import { sanitizeSourceEvent } from "../sourceHoppers.ts"
import { evaluatePrivacyRegression } from "../workUnitSafety.ts"
import type { SanitizedWorkUnitCandidate, SourceHopperEvent } from "../../types/sourceHopper.ts"

export type SourceNormalizationResult = {
  candidates: SanitizedWorkUnitCandidate[]
  blocked: string[]
}

export function runSourceNormalizationAgent(events: readonly SourceHopperEvent[]): SourceNormalizationResult {
  const candidates = events.map(sanitizeSourceEvent).filter((item): item is SanitizedWorkUnitCandidate => !!item)
  const safety = evaluatePrivacyRegression(candidates)
  return { candidates: safety.passed ? candidates : [], blocked: safety.findings.map((finding) => finding.message) }
}
