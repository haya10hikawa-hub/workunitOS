import { evaluateVoicePush } from "../workUnitVoicePush.ts"
import type { WorkUnitDraft } from "../../types/sourceHopper.ts"

export type VoicePromptAgentResult = {
  decision: ReturnType<typeof evaluateVoicePush>["decision"]
  prompt: string | null
}

export function runVoicePromptAgent(draft: WorkUnitDraft): VoicePromptAgentResult {
  const result = evaluateVoicePush(draft)
  return { decision: result.decision, prompt: result.shouldSpeak ? result.prompt : null }
}
