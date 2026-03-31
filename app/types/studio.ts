export type StudioMode = "Plan" | "Draft" | "Review"

export interface StudioDocument {
  id: string
  workUnitId: string
  title: string
  mode: StudioMode
  content: string
}
