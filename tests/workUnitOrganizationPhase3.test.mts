import assert from "node:assert/strict"
import test from "node:test"

import { mockSourceHopperEvents } from "../app/data/mockSourceHopperResults.ts"
import { sanitizeSourceEvent, sanitizeSourceEvents } from "../app/lib/sourceHoppers.ts"
import {
  applyWorkUnitJudgment,
  candidateToWorkUnitDraft,
  draftToWorkUnit,
  mergeCandidatesToWorkUnitDraft,
} from "../app/lib/workUnitDrafts.ts"
import {
  calculateDraftRoi,
  evaluatePushDecision,
  recordDraftJudgment,
} from "../app/lib/workUnitRanking.ts"

test("Source Hoppers sanitize Slack, Notion, and Google Workspace without raw content", () => {
  const candidates = sanitizeSourceEvents(mockSourceHopperEvents)

  assert.equal(candidates.length, mockSourceHopperEvents.length)
  assert.ok(candidates.some((item) => item.sourceRef.source === "slack"))
  assert.ok(candidates.some((item) => item.sourceRef.source === "notion"))
  assert.ok(candidates.some((item) => item.sourceRef.source === "gmail"))
  assert.equal(JSON.stringify(candidates).includes("本文全文"), false)
})

test("Invalid Hopper events are rejected before Core", () => {
  const candidate = sanitizeSourceEvent({
    id: "",
    source: "slack",
    title: "missing id",
    timestamp: "2026-06-08T10:00:00+09:00",
  })

  assert.equal(candidate, null)
})

test("AI Editor converts sanitized candidates into editable WorkUnit drafts", () => {
  const [candidate] = sanitizeSourceEvents(mockSourceHopperEvents)
  const draft = candidateToWorkUnitDraft(candidate, "2026-06-08T10:30:00+09:00")
  const workUnit = draftToWorkUnit(draft, 1)

  assert.equal(draft.status, "draft")
  assert.equal(draft.sourceCandidateIds[0], candidate.id)
  assert.ok(draft.tasks.length >= 3)
  assert.equal(workUnit.problem, draft.problem)
  assert.equal(workUnit.sources[0], candidate.sourceRef.externalId)
})

test("AI Editor supports merge, correction, and status separation", () => {
  const candidates = sanitizeSourceEvents(mockSourceHopperEvents).slice(0, 2)
  const merged = mergeCandidatesToWorkUnitDraft(candidates, "2026-06-08T10:30:00+09:00")
  assert.ok(merged)

  const corrected = applyWorkUnitJudgment(merged, {
    draftId: merged.id,
    action: "correct",
    correction: { deadline: "today", nextAction: "Create sandbox schema first" },
    createdAt: "2026-06-08T10:45:00+09:00",
  })
  const accepted = applyWorkUnitJudgment(corrected, {
    draftId: corrected.id,
    action: "accept",
    createdAt: "2026-06-08T10:46:00+09:00",
  })

  assert.equal(corrected.status, "draft")
  assert.equal(corrected.deadline, "today")
  assert.equal(accepted.status, "accepted")
  assert.equal(accepted.sourceCandidateIds.length, 2)
})

test("Phase 3 calculates ROI, PushScore, and separated judgment memories", () => {
  const [candidate] = sanitizeSourceEvents(mockSourceHopperEvents)
  const draft = candidateToWorkUnitDraft(candidate, "2026-06-08T10:30:00+09:00")
  const push = evaluatePushDecision(draft, { threshold: 40, interruptibility: 1 })

  assert.equal(calculateDraftRoi(draft), 126)
  assert.equal(push.shouldPush, true)
  assert.ok(push.reasons.includes("workunit_complete"))

  const snapshot = recordDraftJudgment(candidate, {
    draftId: draft.id,
    action: "reject",
    reason: "うるさい",
    createdAt: "2026-06-08T10:40:00+09:00",
  })

  assert.equal(snapshot.memories.judgmentLogs.length, 1)
  assert.equal((snapshot.memories.M_reject as unknown[]).length, 1)
  assert.equal((snapshot.memories.M_open as unknown[]).length, 0)
})
