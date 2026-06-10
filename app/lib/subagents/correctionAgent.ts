import { applyWorkUnitJudgment } from "../workUnitDrafts.ts"
import type { WorkUnitDraft, WorkUnitJudgmentAction, WorkUnitJudgmentLog } from "../../types/sourceHopper.ts"

type CorrectionPatch = Pick<
  WorkUnitDraft,
  "title" | "situation" | "actors" | "problem" | "deadline" | "impact" | "urgency" | "actorWeight" | "effort" | "nextAction" | "tasks" | "sources"
>

export type CorrectionAgentResult = {
  draft: WorkUnitDraft
  changed: boolean
  errors: string[]
}

export function runCorrectionAgent(draft: WorkUnitDraft, log: WorkUnitJudgmentLog): CorrectionAgentResult {
  const errors = validateLog(draft, log)
  const correction = sanitizeCorrection(log.correction)
  if (log.action === "correct" && Object.keys(correction).length === 0) errors.push("correction_missing")
  if (errors.length > 0) return { draft, changed: false, errors }
  const corrected = applyWorkUnitJudgment(draft, { ...log, correction })
  return { draft: corrected, changed: JSON.stringify(corrected) !== JSON.stringify(draft), errors }
}

const ACTIONS: readonly WorkUnitJudgmentAction[] = ["accept", "reject", "defer", "correct"]

function validateLog(draft: WorkUnitDraft, log: WorkUnitJudgmentLog): string[] {
  const errors: string[] = []
  if (log.draftId !== draft.id) errors.push("draft_mismatch")
  if (!ACTIONS.includes(log.action)) errors.push("invalid_action")
  if (!log.createdAt || Number.isNaN(Date.parse(log.createdAt))) errors.push("invalid_created_at")
  return errors
}

function sanitizeCorrection(correction: Partial<WorkUnitDraft> | undefined): Partial<CorrectionPatch> {
  if (!correction) return {}
  const patch: Partial<CorrectionPatch> = {}
  for (const key of ["title", "situation", "problem", "deadline", "nextAction"] as const) {
    if (typeof correction[key] === "string") patch[key] = correction[key].trim()
  }
  for (const key of ["impact", "urgency", "actorWeight", "effort"] as const) {
    if (Number.isFinite(correction[key])) patch[key] = Math.min(10, Math.max(1, correction[key] as number))
  }
  if (Array.isArray(correction.actors)) patch.actors = correction.actors.filter((item) => typeof item === "string" && item.trim())
  if (Array.isArray(correction.tasks)) patch.tasks = correction.tasks.filter((item) => typeof item === "string" && item.trim())
  if (Array.isArray(correction.sources)) patch.sources = correction.sources.filter((item) => typeof item === "string" && item.trim())
  return patch
}
