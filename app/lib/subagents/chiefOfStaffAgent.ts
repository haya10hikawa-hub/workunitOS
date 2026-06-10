export type ChiefOfStaffInput = {
  pmRequest?: string | null
  currentState?: string | null
  decisions?: readonly string[] | null
  nextAction?: string | null
  risks?: readonly string[] | null
}

export type ChiefOfStaffHandoff = {
  goal: string
  currentState: string
  decisions: string[]
  nextAction: string
  risks: string[]
  needsPmQuestion?: string
}

export function runChiefOfStaffAgent(input: ChiefOfStaffInput): ChiefOfStaffHandoff {
  const goal = clean(input.pmRequest) ?? "PM request is not specified."
  const currentState = clean(input.currentState) ?? "Current state is not specified."
  const decisions = cleanList(input.decisions)
  const nextAction = clean(input.nextAction) ?? "Wait for PM decision."
  const risks = cleanList(input.risks)
  const needsPmQuestion = missingQuestion(goal, currentState, nextAction)

  return {
    goal,
    currentState,
    decisions,
    nextAction,
    risks,
    ...(needsPmQuestion ? { needsPmQuestion } : {}),
  }
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function cleanList(values: readonly string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map(clean).filter((value): value is string => !!value)))
}

function missingQuestion(goal: string, currentState: string, nextAction: string): string | undefined {
  const missing = [
    goal === "PM request is not specified." ? "Goal" : null,
    currentState === "Current state is not specified." ? "Current State" : null,
    nextAction === "Wait for PM decision." ? "Next Action" : null,
  ].filter((field): field is string => !!field)

  return missing.length ? `PM確認: ${missing.join(", ")} を指定してください。` : undefined
}
