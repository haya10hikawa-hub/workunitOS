import { createCalendarScheduleCandidate } from "../workUnitExecution.ts"
import type { CalendarScheduleCandidate } from "../workUnitExecution.ts"
import type { WorkUnitDraft } from "../../types/sourceHopper.ts"

export type CalendarScheduleAgentResult = {
  schedule: CalendarScheduleCandidate | null
  error?: string
}

export function runCalendarScheduleAgent(draft: WorkUnitDraft | null | undefined): CalendarScheduleAgentResult {
  if (!draft) return { schedule: null, error: "Draft is required." }

  const schedule = createCalendarScheduleCandidate(draft)
  if (schedule?.requiresApproval !== true) return { schedule: null, error: "Schedule candidate requires PM approval." }

  return schedule ? { schedule } : { schedule: null, error: "Draft is not schedulable." }
}
