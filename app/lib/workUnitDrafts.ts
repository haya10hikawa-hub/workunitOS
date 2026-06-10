import type { WorkUnit } from "../types/workunit"
import type {
  SanitizedWorkUnitCandidate,
  WorkUnitDraft,
  WorkUnitJudgmentLog,
} from "../types/sourceHopper"

export function candidateToWorkUnitDraft(
  candidate: SanitizedWorkUnitCandidate,
  now = new Date().toISOString(),
): WorkUnitDraft {
  const draft: WorkUnitDraft = {
    id: `draft:${candidate.id}`,
    sourceCandidateIds: [candidate.id],
    status: "draft",
    title: candidate.title,
    situation: candidate.situationHint,
    actors: candidate.actors,
    problem: candidate.problemHint,
    deadline: candidate.deadlineHint,
    impact: candidate.impactHint,
    urgency: candidate.urgencyHint,
    actorWeight: candidate.actorWeightHint,
    effort: candidate.effortHint,
    nextAction: `Clarify execution path for ${candidate.title}`,
    tasks: [`Verify source ${candidate.sourceRef.externalId}`, "Confirm owner", "Decide accept / reject / defer"],
    sources: [candidate.sourceRef.externalId],
    missingFields: [],
    createdAt: now,
    updatedAt: now,
  }
  return { ...draft, missingFields: missingWorkUnitFields(draft) }
}

export function mergeCandidatesToWorkUnitDraft(
  candidates: readonly SanitizedWorkUnitCandidate[],
  now = new Date().toISOString(),
): WorkUnitDraft | null {
  if (candidates.length === 0) return null
  const first = candidateToWorkUnitDraft(candidates[0], now)
  const merged: WorkUnitDraft = {
    ...first,
    id: `draft:merged:${candidates.map((item) => item.id).join("+")}`,
    sourceCandidateIds: candidates.map((item) => item.id),
    actors: Array.from(new Set(candidates.flatMap((item) => item.actors))),
    sources: candidates.map((item) => item.sourceRef.externalId),
    impact: Math.max(...candidates.map((item) => item.impactHint)),
    urgency: Math.max(...candidates.map((item) => item.urgencyHint)),
    updatedAt: now,
  }
  return { ...merged, missingFields: missingWorkUnitFields(merged) }
}

export function applyWorkUnitJudgment(
  draft: WorkUnitDraft,
  log: WorkUnitJudgmentLog,
): WorkUnitDraft {
  if (log.draftId !== draft.id) return draft
  const status = log.action === "accept" ? "accepted" : log.action === "defer" ? "deferred" : log.action === "reject" ? "rejected" : draft.status
  const corrected = log.action === "correct" && log.correction ? { ...draft, ...log.correction } : draft
  return { ...corrected, status, updatedAt: log.createdAt, missingFields: missingWorkUnitFields(corrected) }
}

export function draftToWorkUnit(draft: WorkUnitDraft, rank: number): WorkUnit {
  return {
    id: draft.id.replace(/^draft:/, "wu:"),
    rank,
    title: draft.title,
    situation: draft.situation,
    actors: draft.actors,
    problem: draft.problem,
    deadline: draft.deadline,
    inboxSource: "Source Hopper",
    receivedAt: draft.createdAt,
    priority: draft.impact >= 8 || draft.urgency >= 8 ? "High" : "Normal",
    impact: draft.impact,
    urgency: draft.urgency,
    actorWeight: draft.actorWeight,
    effort: draft.effort,
    sources: draft.sources,
    tasks: draft.tasks.map((label, index) => ({ id: `${draft.id}:task:${index}`, label, done: false })),
    status: draft.status === "deferred" ? "Waiting" : "New",
  }
}

export function missingWorkUnitFields(draft: WorkUnitDraft): string[] {
  const missing: string[] = []
  if (!draft.situation) missing.push("Situation")
  if (draft.actors.length === 0) missing.push("Actors")
  if (!draft.problem) missing.push("Problem")
  if (!draft.deadline || draft.deadline === "unspecified") missing.push("Deadline")
  if (!draft.nextAction) missing.push("Next Action")
  return missing
}
