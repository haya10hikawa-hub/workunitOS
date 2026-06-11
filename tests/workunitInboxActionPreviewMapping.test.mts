import test from "node:test"
import assert from "node:assert/strict"
import { buildActionPreviewFromInboxWorkUnit } from "../app/lib/workunitInbox/actionPreviewMapping.ts"
import { transformSignalToInboxWorkUnit } from "../app/lib/workunitInbox/transform.ts"
import { MOCK_SIGNALS } from "../app/lib/workunitInbox/mockSignals.ts"

// ─── Mapper ────────────────────────────────────────────────────

test("review_waiting maps to github_issue with review intent", () => {
  const signal = MOCK_SIGNALS[0] // PR review
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal(result.actionType, "github_issue")
  assert.equal(result.targetPreview["provider"], "github")
  assert.equal(result.targetPreview["repository"], "acme/api")
  assert.ok(result.targetPreview["sourceUrl"])
  assert.equal(result.payloadPreview["intent"], "review_pr")
})

test("blocker maps to github_issue with unblock intent", () => {
  const signal = MOCK_SIGNALS[1] // blocked
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal(result.actionType, "github_issue")
  assert.equal(result.payloadPreview["intent"], "unblock_request")
})

test("assigned_issue maps to github_issue with triage intent", () => {
  const signal = MOCK_SIGNALS[2] // assigned
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal(result.actionType, "github_issue")
  assert.equal(result.payloadPreview["intent"], "triage_or_implement")
})

test("missed_response maps to slack_reply", () => {
  const signal = MOCK_SIGNALS[3] // slack
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal(result.actionType, "slack_reply")
  assert.equal(result.targetPreview["provider"], "slack")
  assert.equal(result.payloadPreview["intent"], "reply_or_clarify")
})

test("deadline maps to calendar_event", () => {
  const signal = MOCK_SIGNALS[4] // calendar
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal(result.actionType, "calendar_event")
  assert.equal(result.targetPreview["provider"], "calendar")
  assert.equal(result.payloadPreview["intent"], "prepare_before_deadline")
})

test("no client hashes are included", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal("targetHash" in result, false)
  assert.equal("payloadHash" in result, false)
  assert.equal("targetHash" in result.targetPreview, false)
})

test("no tenantId is included", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.equal("tenantId" in result, false)
})

test("payloadPreview includes nextAction", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.ok(result.payloadPreview["nextAction"])
})

test("sourceUrl and repository preserved when present", () => {
  const signal = MOCK_SIGNALS[0] // has both
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.ok(result.targetPreview["sourceUrl"])
  assert.equal(result.targetPreview["repository"], "acme/api")
})

test("dueAt preserved for calendar events", () => {
  const signal = MOCK_SIGNALS[4]
  const wu = transformSignalToInboxWorkUnit(signal)
  const result = buildActionPreviewFromInboxWorkUnit(wu)

  assert.ok(result.targetPreview["dueAt"])
})
