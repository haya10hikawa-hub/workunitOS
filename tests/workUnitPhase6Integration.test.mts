import assert from "node:assert/strict"
import test from "node:test"

import { mockSourceHopperEvents } from "../app/data/mockSourceHopperResults.ts"
import { sanitizeSourceEvents } from "../app/lib/sourceHoppers.ts"
import { applyWorkUnitJudgment, candidateToWorkUnitDraft } from "../app/lib/workUnitDrafts.ts"
import {
  createExecutionApproval,
  createGitHubIssueDraft,
  decideExecutionApproval,
  recordExecutionResult,
} from "../app/lib/workUnitExecution.ts"
import { evaluateVoicePush, parseVoiceIntent } from "../app/lib/workUnitVoicePush.ts"
import {
  checkExternalSendApproval,
  evaluatePrivacyRegression,
} from "../app/lib/workUnitSafety.ts"

test("Phase 4-6 connects sandboxed candidate to approved execution", () => {
  const [candidate] = sanitizeSourceEvents(mockSourceHopperEvents)
  const initialDraft = candidateToWorkUnitDraft(candidate, "2026-06-08T10:30:00+09:00")
  const draft = applyWorkUnitJudgment(initialDraft, {
    draftId: initialDraft.id,
    action: "accept",
    createdAt: "2026-06-08T10:31:00+09:00",
  })

  assert.equal(evaluatePrivacyRegression([candidate]).passed, true)

  const voice = evaluateVoicePush(draft, {
    now: "2026-06-08T10:32:00+09:00",
    threshold: 40,
    state: { inMeeting: false, inFocus: false, isNight: false },
  })
  assert.equal(voice.shouldSpeak, true)
  assert.equal(parseVoiceIntent("はい"), "accept")

  const issue = createGitHubIssueDraft(draft)
  assert.ok(issue)

  const blocked = checkExternalSendApproval({
    action: "post_github_issue",
    source: candidate.sourceRef.source,
    payload: { title: issue.title, generatedMarkdown: issue.body },
  })
  assert.equal(blocked.passed, false)

  const approval = decideExecutionApproval(
    createExecutionApproval(draft, "github_issue", "2026-06-08T10:33:00+09:00"),
    true,
    "PM approved",
    "2026-06-08T10:34:00+09:00",
  )
  const allowed = checkExternalSendApproval({
    action: "post_github_issue",
    source: candidate.sourceRef.source,
    payload: { title: issue.title, generatedMarkdown: issue.body },
    approvedByPm: true,
    approvalId: approval.id,
  })
  const result = recordExecutionResult(
    draft,
    "github_issue",
    approval,
    "https://github.com/example/repo/issues/1",
    "2026-06-08T10:35:00+09:00",
  )

  assert.equal(allowed.passed, true)
  assert.equal(result.status, "succeeded")
})
