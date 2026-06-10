import { sanitizeSourceEvent } from "../sourceHoppers.ts"
import type { SanitizedWorkUnitCandidate, SourceHopperEvent } from "../../types/sourceHopper.ts"

export type GmailHopperAgentInput = SourceHopperEvent

export type GmailHopperAgentResult = {
  ok: boolean
  candidate: SanitizedWorkUnitCandidate | null
  error: string | null
}

export function runGmailHopperAgent(input: GmailHopperAgentInput): GmailHopperAgentResult {
  if (!input || input.source !== "gmail") return { ok: false, candidate: null, error: "source must be gmail" }
  const candidate = sanitizeSourceEvent(input)
  if (!candidate) return { ok: false, candidate: null, error: "invalid SourceHopperEvent" }
  return { ok: true, candidate, error: null }
}
