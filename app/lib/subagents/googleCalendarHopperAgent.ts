import { sanitizeSourceEvent } from "../sourceHoppers.ts"
import type { SanitizedWorkUnitCandidate, SourceHopperEvent } from "../../types/sourceHopper.ts"

export type GoogleCalendarHopperAgentInput = SourceHopperEvent

export type GoogleCalendarHopperAgentResult = {
  ok: boolean
  candidate: SanitizedWorkUnitCandidate | null
  error: string | null
}

export function runGoogleCalendarHopperAgent(
  input: GoogleCalendarHopperAgentInput,
): GoogleCalendarHopperAgentResult {
  if (!input) return { ok: false, candidate: null, error: "Missing SourceHopperEvent." }
  if (input.source !== "google_calendar") {
    return { ok: false, candidate: null, error: "Source must be google_calendar." }
  }

  const safeEvent = { ...input, rawContent: undefined }
  const candidate = sanitizeSourceEvent(safeEvent)
  if (!candidate) return { ok: false, candidate: null, error: "Invalid SourceHopperEvent." }

  return { ok: true, candidate, error: null }
}
