import test from "node:test"
import assert from "node:assert/strict"
import { listWorkUnitSubAgents } from "../app/lib/subagents/registry.ts"
import { runChiefOfStaffAgent } from "../app/lib/subagents/chiefOfStaffAgent.ts"
import { runSlackHopperAgent } from "../app/lib/subagents/slackHopperAgent.ts"
import { runNotionHopperAgent } from "../app/lib/subagents/notionHopperAgent.ts"
import { runGmailHopperAgent } from "../app/lib/subagents/gmailHopperAgent.ts"
import { runGoogleDriveHopperAgent } from "../app/lib/subagents/googleDriveHopperAgent.ts"
import { runGoogleCalendarHopperAgent } from "../app/lib/subagents/googleCalendarHopperAgent.ts"
import { runSourceNormalizationAgent } from "../app/lib/subagents/sourceNormalizationAgent.ts"
import { runWorkUnitDraftAgent } from "../app/lib/subagents/workUnitDraftAgent.ts"
import { runContextMergeAgent } from "../app/lib/subagents/contextMergeAgent.ts"
import { runGitHubIssueAgent } from "../app/lib/subagents/githubIssueAgent.ts"
import { runTaskAgent } from "../app/lib/subagents/taskAgent.ts"
import { runCalendarScheduleAgent } from "../app/lib/subagents/calendarScheduleAgent.ts"
import { runReplyDraftAgent } from "../app/lib/subagents/replyDraftAgent.ts"
import { runVoicePromptAgent } from "../app/lib/subagents/voicePromptAgent.ts"
import { runInterruptibilityAgent } from "../app/lib/subagents/interruptibilityAgent.ts"
import { runPrivacySandboxAgent } from "../app/lib/subagents/privacySandboxAgent.ts"
import { runEvalRedTeamAgent } from "../app/lib/subagents/evalRedTeamAgent.ts"
import { runCorrectionAgent } from "../app/lib/subagents/correctionAgent.ts"
import { candidateToWorkUnitDraft } from "../app/lib/workUnitDrafts.ts"
import { sanitizeSourceEvent } from "../app/lib/sourceHoppers.ts"
import type { SourceHopperEvent } from "../app/types/sourceHopper.ts"

const event: SourceHopperEvent = {
  id: "slack:subagent-test",
  source: "slack",
  title: "本日中に契約レビュー",
  actor: "PM",
  container: "legal",
  timestamp: "2026-06-08T10:00:00.000Z",
  deadline: "2026-06-08",
  labels: ["urgent"],
}

test("registry contains all 18 WorkUnit subagents", () => {
  assert.equal(listWorkUnitSubAgents().length, 18)
  assert.equal(new Set(listWorkUnitSubAgents().map((agent) => agent.id)).size, 18)
})

test("all subagent entrypoints are callable", () => {
  const candidate = sanitizeSourceEvent(event)
  assert.ok(candidate)
  const acceptedDraft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  const correctionLog = { draftId: acceptedDraft.id, action: "defer" as const, createdAt: "2026-06-08T11:00:00.000Z" }

  assert.equal(runChiefOfStaffAgent({ pmRequest: "review" }).goal, "review")
  assert.equal(runSlackHopperAgent(event).candidate?.sourceRef.source, "slack")
  assert.equal(runNotionHopperAgent({ ...event, source: "notion" }).candidate?.sourceRef.source, "notion")
  assert.equal(runGmailHopperAgent({ ...event, source: "gmail" }).ok, true)
  assert.equal(runGoogleDriveHopperAgent({ ...event, source: "google_drive" }).ok, true)
  assert.equal(runGoogleCalendarHopperAgent({ ...event, source: "google_calendar" }).ok, true)
  assert.equal(runSourceNormalizationAgent([event]).candidates.length, 1)
  assert.equal(runWorkUnitDraftAgent([candidate]).drafts.length, 1)
  assert.equal(runCorrectionAgent(acceptedDraft, correctionLog).draft.status, "deferred")
  assert.equal(runContextMergeAgent([candidate]).mergedCount, 1)
  assert.ok(runGitHubIssueAgent(acceptedDraft).issue)
  assert.ok(runTaskAgent(acceptedDraft).task)
  assert.ok(runCalendarScheduleAgent(acceptedDraft).schedule)
  assert.equal(runReplyDraftAgent(acceptedDraft).replies.length, 1)
  assert.equal(typeof runVoicePromptAgent(acceptedDraft).decision.roi, "number")
  assert.equal(runInterruptibilityAgent({ inMeeting: true }).blocked, false)
  assert.equal(runPrivacySandboxAgent([candidate]).passed, true)
  assert.equal(runEvalRedTeamAgent().datasetIds.length > 0, true)
})
