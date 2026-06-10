import { sanitizeSourceEvent } from "../sourceHoppers.ts"
import type { SanitizedWorkUnitCandidate, SourceHopperEvent } from "../../types/sourceHopper.ts"

export type NotionHopperAgentResult = {
  candidate: SanitizedWorkUnitCandidate | null
  boundaryNotes: string[]
}

const NOTION_BOUNDARY_NOTES = [
  "title only",
  "status only",
  "owner only",
  "due date only",
]

export function runNotionHopperAgent(event: SourceHopperEvent | null | undefined): NotionHopperAgentResult {
  if (!event || event.source !== "notion") return { candidate: null, boundaryNotes: NOTION_BOUNDARY_NOTES }
  const candidate = sanitizeSourceEvent(event)
  return { candidate, boundaryNotes: NOTION_BOUNDARY_NOTES }
}
