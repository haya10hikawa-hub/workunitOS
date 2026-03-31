import { useState } from "react"
import type { WorkUnit, WorkUnitStatus } from "@/types/workunit"

export function useWorkUnits(initial: WorkUnit[]) {
  const [workUnits, setWorkUnits] = useState(initial)

  const toggleTask = (wuId: string, taskId: string) => {
    setWorkUnits((prev) =>
      prev.map((wu) =>
        wu.id === wuId
          ? {
              ...wu,
              tasks: wu.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task
              ),
            }
          : wu
      )
    )
  }

  const updateStatus = (wuId: string, status: WorkUnitStatus) => {
    setWorkUnits((prev) =>
      prev.map((wu) => (wu.id === wuId ? { ...wu, status } : wu))
    )
  }

  return {
    workUnits,
    setWorkUnits,
    toggleTask,
    updateStatus,
  }
}
