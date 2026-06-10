import { createReplyDrafts } from "../workUnitExecution.ts"
import type { ReplyDraft } from "../workUnitExecution.ts"
import type { WorkUnitDraft } from "../../types/sourceHopper.ts"

export type ReplyDraftAgentResult = {
  replies: ReplyDraft[]
}

export function runReplyDraftAgent(draft: WorkUnitDraft): ReplyDraftAgentResult {
  return { replies: createReplyDrafts(draft) }
}
