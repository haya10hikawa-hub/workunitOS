import { createGitHubIssueDraft } from "../workUnitExecution.ts"
import type { GitHubIssueDraft } from "../workUnitExecution.ts"
import type { WorkUnitDraft } from "../../types/sourceHopper.ts"

export type GitHubIssueAgentResult = {
  issue: GitHubIssueDraft | null
  error?: string
}

export function runGitHubIssueAgent(draft: WorkUnitDraft): GitHubIssueAgentResult {
  const issue = createGitHubIssueDraft(draft)
  return issue ? { issue } : { issue: null, error: "Draft is not executable." }
}
