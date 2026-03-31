export type InboxSeverity = "critical" | "high" | "medium"

export interface InboxEvent {
  id: string
  signal: string
  source: string
  time: string
  icon: string
  severity: InboxSeverity
  workUnitId: string
}
