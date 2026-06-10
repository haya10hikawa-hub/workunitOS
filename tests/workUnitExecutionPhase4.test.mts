import assert from "node:assert/strict"
import test from "node:test"

import { mockSourceHopperEvents } from "../app/data/mockSourceHopperResults.ts"
import {
  createCalendarScheduleCandidate,
  createCompletionCriteria,
  createExecutionApproval,
  createGitHubIssueDraft,
  createReplyDrafts,
  createTaskDraft,
  decideExecutionApproval,
  recordExecutionResult,
} from "../app/lib/workUnitExecution.ts"
import { applyWorkUnitJudgment, candidateToWorkUnitDraft } from "../app/lib/workUnitDrafts.ts"
import { sanitizeSourceEvent } from "../app/lib/sourceHoppers.ts"

function acceptedDraft(eventIndex = 0) {
  const candidate = sanitizeSourceEvent(mockSourceHopperEvents[eventIndex])
  assert.ok(candidate)
  const draft = candidateToWorkUnitDraft(candidate, "2026-06-08T10:30:00+09:00")
  return applyWorkUnitJudgment(draft, {
    draftId: draft.id,
    action: "accept",
    createdAt: "2026-06-08T10:31:00+09:00",
  })
}

test("Phase 4 converts accepted WorkUnitDraft into GitHub issue and task drafts", () => {
  const draft = acceptedDraft()
  const issue = createGitHubIssueDraft(draft)
  const task = createTaskDraft(draft)

  assert.ok(issue)
  assert.ok(task)
  assert.equal(issue.requiresApproval, true)
  assert.equal(issue.body.includes(draft.problem), true)
  assert.equal(task.due, "today")
  assert.equal(task.owner, "Security Lead")
})

test("Phase 4 creates calendar and reply candidates only from eligible sources", () => {
  const slackDraft = acceptedDraft(0)
  const gmailDraft = acceptedDraft(2)
  const calendar = createCalendarScheduleCandidate(gmailDraft)

  assert.equal(createReplyDrafts(slackDraft)[0]?.target, "slack_reply")
  assert.equal(createReplyDrafts(gmailDraft)[0]?.target, "gmail_reply")
  assert.ok(calendar)
  assert.equal(calendar.requiresApproval, true)
  assert.equal(calendar.timeHint, "tomorrow")
})

test("Phase 4 blocks execution result until PM approval exists", () => {
  const draft = acceptedDraft()
  const approval = createExecutionApproval(draft, "github_issue", "2026-06-08T10:35:00+09:00")
  const blocked = recordExecutionResult(draft, "github_issue", approval, "https://github.test/issues/1")
  const approved = decideExecutionApproval(approval, true, "go", "2026-06-08T10:36:00+09:00")
  const logged = recordExecutionResult(draft, "github_issue", approved, "https://github.test/issues/1")

  assert.equal(blocked.status, "pending_approval")
  assert.equal(blocked.externalRef, null)
  assert.equal(logged.status, "succeeded")
  assert.equal(logged.externalRef, "https://github.test/issues/1")
})

test("Phase 4 stores WorkUnit completion criteria from execution logs", () => {
  const draft = acceptedDraft()
  const approval = decideExecutionApproval(createExecutionApproval(draft, "task"), true, "done")
  const log = recordExecutionResult(draft, "task", approval, "task:phase4")
  const criteria = createCompletionCriteria(draft, [log])

  assert.equal(criteria.blockers.length, 0)
  assert.equal(criteria.isComplete, true)
  assert.ok(criteria.doneWhen.includes("External execution result is logged"))
})
