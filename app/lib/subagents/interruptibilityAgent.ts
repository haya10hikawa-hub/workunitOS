import { evaluateInterruptibility } from "../workUnitVoicePush.ts"
import type { InterruptibilityState } from "../workUnitVoicePush.ts"

export type InterruptibilityAgentState = InterruptibilityState
export type InterruptibilityAgentResult = ReturnType<typeof evaluateInterruptibility>

export function runInterruptibilityAgent(state: InterruptibilityAgentState = {}): InterruptibilityAgentResult {
  const { score, blocked, reasons } = evaluateInterruptibility(state)
  return { score, blocked, reasons }
}
