import type { StudioMode } from "@/types/studio"
import type { WorkUnitStatus } from "@/types/workunit"

export const workflowSteps = ["Inbox", "WorkUnit", "Studio", "Tasks"] as const

export const statusOrder: WorkUnitStatus[] = [
  "New",
  "Active",
  "Waiting",
  "Done",
  "Archived",
]

export const statusColors: Record<WorkUnitStatus, string> = {
  New: "#8EC5FF",
  Active: "#69FF47",
  Waiting: "#FFB454",
  Done: "#A1A1AA",
  Archived: "#5A5A5A",
}

export const studioModeColors: Record<StudioMode, string> = {
  Plan: "#69FF47",
  Draft: "#8EC5FF",
  Review: "#FFB454",
}
