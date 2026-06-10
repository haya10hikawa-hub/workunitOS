import { sanitizeSourceEvent } from "../sourceHoppers.ts"
import type { SanitizedWorkUnitCandidate, SourceHopperEvent } from "../../types/sourceHopper.ts"

export type GoogleDriveHopperAgentInput = SourceHopperEvent

export type GoogleDriveHopperAgentResult = {
  ok: boolean
  candidate: SanitizedWorkUnitCandidate | null
  error: string | null
}

export function runGoogleDriveHopperAgent(input: GoogleDriveHopperAgentInput): GoogleDriveHopperAgentResult {
  if (!input || input.source !== "google_drive") return { ok: false, candidate: null, error: "invalid_source" }
  const candidate = sanitizeSourceEvent(input)
  if (!candidate) return { ok: false, candidate: null, error: "invalid_event" }
  return { ok: true, candidate, error: null }
}
