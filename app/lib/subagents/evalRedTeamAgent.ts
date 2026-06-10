import { WORKUNIT_RED_TEAM_CHECKLIST, WORKUNIT_SAFETY_EVAL_DATASET } from "../workUnitSafety.ts"

export type EvalRedTeamChecklistItem = (typeof WORKUNIT_RED_TEAM_CHECKLIST)[number]
export type EvalRedTeamDatasetId = (typeof WORKUNIT_SAFETY_EVAL_DATASET)[number]["id"]

export type EvalRedTeamAgentResult = {
  checklist: readonly EvalRedTeamChecklistItem[]
  datasetIds: readonly EvalRedTeamDatasetId[]
}

export function runEvalRedTeamAgent(): EvalRedTeamAgentResult {
  const datasetIds = WORKUNIT_SAFETY_EVAL_DATASET.map((item) => item.id)
  if (!WORKUNIT_RED_TEAM_CHECKLIST.length || !datasetIds.length) throw new Error("Eval red team safety assets are missing.")
  return { checklist: WORKUNIT_RED_TEAM_CHECKLIST, datasetIds }
}
