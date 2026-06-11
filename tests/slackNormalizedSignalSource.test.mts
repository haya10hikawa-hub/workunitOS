import test from "node:test"
import assert from "node:assert/strict"
import { fetchFakeSlackNormalizedEvents } from "../app/lib/workunitInbox/sources/slack/fakeSlackSource.ts"
import {
  slackEventToNormalizedToolSignal,
  slackEventsToNormalizedToolSignals,
} from "../app/lib/workunitInbox/sources/slack/toNormalizedToolSignal.ts"

const tenantId = "dev-tenant"

// ─── Fake Source ────────────────────────────────────────────────

test("fake Slack source returns 2 events", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  assert.equal(events.length, 2)
})

test("fake Slack source has mention and decision events", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const types = events.map((e) => e.eventType)
  assert.ok(types.includes("mention_request"))
  assert.ok(types.includes("decision_request"))
})

// ─── To NormalizedToolSignal ────────────────────────────────────

test("mention request maps to slack_mention_request", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "mention_request")!
  const signal = slackEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "slack_mention_request")
  assert.equal(signal.provider, "slack")
  assert.ok(signal.title.includes("deployment"))
})

test("decision request maps to slack_mention_request with high priority", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "decision_request")!
  const signal = slackEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "slack_mention_request")
  assert.equal(signal.priorityHint, "high")
})

test("actor is preserved", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "mention_request")!
  const signal = slackEventToNormalizedToolSignal(event)
  assert.equal(signal.actor, "charlie")
})

test("sourceUrl is preserved", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const signal = slackEventToNormalizedToolSignal(events[0])
  assert.ok(signal.sourceUrl?.includes("slack.com"))
})

test("no raw payload fields leak", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const signal = slackEventToNormalizedToolSignal(events[0])
  assert.equal("eventType" in signal, false)
  assert.equal("channel" in signal, false)
})

test("batch transforms all events", async () => {
  const events = await fetchFakeSlackNormalizedEvents({ tenantId })
  const signals = slackEventsToNormalizedToolSignals(events)
  assert.equal(signals.length, 2)
})
