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

  const createWorkUnit = (title: string) => {
    const newId = `wu-${Date.now()}`

    setWorkUnits((prev) => {
      const maxRank = prev.reduce((max, wu) => Math.max(max, wu.rank), 0)

      const nextWorkUnit: WorkUnit = {
        id: newId,
        rank: maxRank + 1,
        title,
        situation: "New intake captured from signal board.",
        actors: ["Product"],
        problem: "Scope and execution path are not defined yet.",
        deadline: "To be scheduled",
        impact: 5,
        urgency: 5,
        actorWeight: 5,
        effort: 5,
        sources: ["Manual intake"],
        tasks: [
          { id: `${newId}-task-1`, label: "Clarify expected outcome", done: false },
          { id: `${newId}-task-2`, label: "Draft first action plan", done: false },
        ],
        status: "New",
      }

      return [...prev, nextWorkUnit]
    })

    return newId
  }

  return {
    workUnits,
    setWorkUnits,
    toggleTask,
    updateStatus,
    createWorkUnit,
  }
}
