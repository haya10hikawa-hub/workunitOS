import test from "node:test"
import assert from "node:assert/strict"
import { MOCK_SIGNALS } from "../app/lib/workunitInbox/mockSignals.ts"
import {
  transformSignalToInboxWorkUnit,
  transformSignalsToInboxWorkUnits,
} from "../app/lib/workunitInbox/transform.ts"
import type { NormalizedToolSignal } from "../app/lib/workunitInbox/types.ts"

// ─── Single Signal Transform ────────────────────────────────────

test("github PR review requested → review_waiting", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.kind, "review_waiting")
  assert.equal(wu.priority, "high")
  assert.ok(wu.nextAction.includes("Review"))
})

test("github issue blocked → blocker", () => {
  const signal = MOCK_SIGNALS[1]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.kind, "blocker")
  assert.equal(wu.priority, "high")
  assert.ok(wu.nextAction.includes("Unblock"))
})

test("github issue assigned → assigned_issue", () => {
  const signal = MOCK_SIGNALS[2]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.kind, "assigned_issue")
  assert.equal(wu.priority, "medium")
  assert.ok(wu.nextAction.includes("Start working"))
})

test("slack mention → missed_response", () => {
  const signal = MOCK_SIGNALS[3]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.kind, "missed_response")
  assert.equal(wu.priority, "high")
  assert.ok(wu.nextAction.includes("Respond"))
})

test("calendar deadline → deadline", () => {
  const signal = MOCK_SIGNALS[4]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.kind, "deadline")
  assert.equal(wu.priority, "high")
  assert.ok(wu.nextAction.includes("Prepare"))
})

test("priorityHint is respected", () => {
  const signal = MOCK_SIGNALS[0] // has priorityHint: "high"
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.priority, "high")
})

test("default priority when no priorityHint", () => {
  const signal: NormalizedToolSignal = {
    id: "test", tenantId: "t1", provider: "github",
    signalType: "github_issue_assigned", title: "Test", summary: ".",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.priority, "medium")
})

test("blocker defaults to high", () => {
  const signal: NormalizedToolSignal = {
    id: "test", tenantId: "t1", provider: "github",
    signalType: "github_issue_blocked", title: "Test", summary: ".",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.priority, "high")
})

test("preserves sourceUrl, actor, repository", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.sourceUrl, signal.sourceUrl)
  assert.equal(wu.actor, signal.actor)
  assert.equal(wu.repository, signal.repository)
})

test("includes reason, evidence, nextAction", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.ok(wu.reason.length > 0)
  assert.ok(wu.evidence.length > 0)
  assert.ok(wu.nextAction.length > 0)
})

test("status defaults to open", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  assert.equal(wu.status, "open")
})

// ─── Batch Transform ────────────────────────────────────────────

test("transformSignalsToInboxWorkUnits sorts high before medium", () => {
  const signals: NormalizedToolSignal[] = [
    { ...MOCK_SIGNALS[2], id: "m1", priorityHint: "medium" }, // assigned_issue
    { ...MOCK_SIGNALS[1], id: "h1", priorityHint: "high" },    // blocker
  ]
  const result = transformSignalsToInboxWorkUnits(signals)
  assert.equal(result[0].priority, "high")
  assert.equal(result[1].priority, "medium")
})

test("transformSignalsToInboxWorkUnits returns all items", () => {
  const result = transformSignalsToInboxWorkUnits(MOCK_SIGNALS)
  assert.equal(result.length, 5)
})

test("all mock signals transform without error", () => {
  for (const signal of MOCK_SIGNALS) {
    const wu = transformSignalToInboxWorkUnit(signal)
    assert.ok(wu.id)
    assert.ok(wu.title)
    assert.ok(wu.kind)
  }
})
