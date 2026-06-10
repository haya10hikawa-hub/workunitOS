import { mergeCandidatesToWorkUnitDraft } from "../workUnitDrafts.ts"
import type { SanitizedWorkUnitCandidate, WorkUnitDraft } from "../../types/sourceHopper.ts"

export type ContextMergeAgentResult = {
  draft: WorkUnitDraft | null
  mergedCount: number
  skippedCandidateIds: string[]
  errors: string[]
}

export function runContextMergeAgent(candidates: readonly SanitizedWorkUnitCandidate[], now = new Date().toISOString()): ContextMergeAgentResult {
  if (candidates.length === 0) return { draft: null, mergedCount: 0, skippedCandidateIds: [], errors: [] }

  const [seed, ...rest] = candidates
  const related = [seed, ...rest.filter((candidate) => isRelatedCandidate(seed, candidate))]
  const relatedIds = new Set(related.map((candidate) => candidate.id))
  const draft = mergeCandidatesToWorkUnitDraft(related, now)
  return {
    draft,
    mergedCount: related.length,
    skippedCandidateIds: candidates.filter((candidate) => !relatedIds.has(candidate.id)).map((candidate) => candidate.id),
    errors: draft ? [] : ["Failed to merge related WorkUnit candidates."],
  }
}

function isRelatedCandidate(base: SanitizedWorkUnitCandidate, candidate: SanitizedWorkUnitCandidate): boolean {
  if (base.id === candidate.id) return true
  if (base.sourceRef.container && base.sourceRef.container === candidate.sourceRef.container) return true
  if (base.actors.some((actor) => candidate.actors.includes(actor))) return true
  return base.tags.some((tag) => candidate.tags.includes(tag))
}
