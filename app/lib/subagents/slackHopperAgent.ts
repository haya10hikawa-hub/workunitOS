import { sanitizeSourceEvent } from "../sourceHoppers.ts"
import type { SanitizedWorkUnitCandidate, SourceHopperEvent } from "../../types/sourceHopper.ts"

export type SlackHopperAgentResult = {
  candidate: SanitizedWorkUnitCandidate | null
  safetyNotes: string[]
}

export function runSlackHopperAgent(event: SourceHopperEvent): SlackHopperAgentResult {
  const safetyNotes = [
    "Slack Hopper emits only SanitizedWorkUnitCandidate fields.",
    "Raw Slack text, thread bodies, and DM content must not enter Core.",
  ]
  if (event.source !== "slack") return { candidate: null, safetyNotes }

  return { candidate: sanitizeSourceEvent(event), safetyNotes }
}
