export type WorkUnitStatus =
  | "New"
  | "Active"
  | "Waiting"
  | "Done"
  | "Archived"

export type WorkUnitPriority = "Critical" | "High" | "Normal"

export interface Task {
  id: string
  label: string
  done: boolean
}

export interface WorkUnit {
  id: string
  rank: number
  title: string
  situation: string
  actors: string[]
  problem: string
  deadline: string
  inboxSource?: string
  receivedAt?: string
  priority?: WorkUnitPriority
  impact: number
  urgency: number
  actorWeight: number
  effort: number
  sources: string[]
  tasks: Task[]
  status: WorkUnitStatus
}
