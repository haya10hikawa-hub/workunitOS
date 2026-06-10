import { candidateToWorkUnitDraft } from "../workUnitDrafts.ts"
import type { SanitizedWorkUnitCandidate, WorkUnitDraft } from "../../types/sourceHopper.ts"

export type WorkUnitDraftAgentError = {
  candidateId: string
  draftId?: string
  field?: string
  message: string
}

export type WorkUnitDraftAgentResult = {
  drafts: WorkUnitDraft[]
  errors: WorkUnitDraftAgentError[]
}

export function runWorkUnitDraftAgent(candidates: readonly SanitizedWorkUnitCandidate[], now = new Date().toISOString()): WorkUnitDraftAgentResult {
  if (!Array.isArray(candidates)) return { drafts: [], errors: [{ candidateId: "unknown", message: "candidates must be an array." }] }
  const drafts: WorkUnitDraft[] = []
  const errors: WorkUnitDraftAgentError[] = []
  for (const candidate of candidates) {
    try {
      const draft = candidateToWorkUnitDraft(candidate, now)
      drafts.push(draft)
      for (const field of draft.missingFields) errors.push({ candidateId: candidate.id, draftId: draft.id, field, message: `Missing required WorkUnit field: ${field}.` })
    } catch (error) {
      errors.push({ candidateId: candidate?.id ?? "unknown", message: error instanceof Error ? error.message : "Failed to create WorkUnitDraft." })
    }
  }
  return { drafts, errors }
}
