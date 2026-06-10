import { createTaskDraft } from "../workUnitExecution.ts"
import type { TaskDraft } from "../workUnitExecution.ts"
import type { WorkUnitDraft } from "../../types/sourceHopper.ts"

export type TaskAgentResult = {
  task: TaskDraft | null
  error?: string
}

export function runTaskAgent(draft: WorkUnitDraft): TaskAgentResult {
  const task = createTaskDraft(draft)
  return task ? { task } : { task: null, error: "Draft is not executable." }
}
