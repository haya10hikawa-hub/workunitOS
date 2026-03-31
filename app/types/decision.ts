export type DecisionReason =
  | "impact"
  | "urgency"
  | "actor"
  | "effort"
  | "intuition"

export type DecisionLog = {
  workUnitId: string
  maxROI: number
  selectedROI: number
  gap: number
  reason: DecisionReason
  customReason?: string
  timestamp: number
  timeToDecision: number
}

