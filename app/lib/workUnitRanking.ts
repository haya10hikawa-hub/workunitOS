import { HopperEngine, type HopperEngineSnapshot } from "./hopperEngine.ts"
import type { SanitizedWorkUnitCandidate, WorkUnitDraft, WorkUnitJudgmentLog } from "../types/sourceHopper"

export type PushDecision = {
  roi: number
  pushScore: number
  shouldPush: boolean
  reasons: string[]
}

export function calculateDraftRoi(draft: Pick<WorkUnitDraft, "impact" | "urgency" | "actorWeight" | "effort">): number {
  if (!Number.isFinite(draft.effort) || draft.effort <= 0) return 0
  return Math.round((draft.impact * draft.urgency * draft.actorWeight) / draft.effort)
}

export function evaluatePushDecision(
  draft: WorkUnitDraft,
  options: { threshold?: number; confidence?: number; interruptibility?: number; annoyancePenalty?: number; riskPenalty?: number } = {},
): PushDecision {
  const roi = calculateDraftRoi(draft)
  const confidence = clamp01(options.confidence ?? (draft.missingFields.length === 0 ? 0.82 : 0.55))
  const interruptibility = clamp01(options.interruptibility ?? 0.7)
  const pushScore = roi * confidence * interruptibility - (options.annoyancePenalty ?? 0) - (options.riskPenalty ?? 0)
  const threshold = Math.max(1, options.threshold ?? 50)
  return {
    roi,
    pushScore,
    shouldPush: pushScore >= threshold,
    reasons: [draft.missingFields.length ? "draft_missing_fields" : "workunit_complete", "source_project_scoped_stats"],
  }
}

export function recordDraftJudgment(
  candidate: SanitizedWorkUnitCandidate,
  log: WorkUnitJudgmentLog,
  snapshot?: HopperEngineSnapshot,
): HopperEngineSnapshot {
  const engine = new HopperEngine({}, snapshot)
  engine.recordJudgment({
    itemId: candidate.id,
    action: log.action === "accept" ? "keep" : log.action === "defer" ? "open" : "discard",
    sourceType: candidate.sourceRef.source,
    projectId: "workunit-os",
    embedding: candidateEmbedding(candidate),
    decidedAt: Date.parse(log.createdAt),
    downstreamAction: log.action === "accept" ? "task" : "none",
  })
  return engine.snapshot()
}

export function candidateEmbedding(candidate: SanitizedWorkUnitCandidate): number[] {
  return [
    candidate.impactHint / 10,
    candidate.urgencyHint / 10,
    candidate.actorWeightHint / 10,
    candidate.confidence,
  ]
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
