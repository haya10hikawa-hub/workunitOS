import test from "node:test"
import assert from "node:assert/strict"
import { fetchFakeCalendarNormalizedEvents } from "../app/lib/workunitInbox/sources/calendar/fakeCalendarSource.ts"
import {
  calendarEventToNormalizedToolSignal,
  calendarEventsToNormalizedToolSignals,
} from "../app/lib/workunitInbox/sources/calendar/toNormalizedToolSignal.ts"

const tenantId = "dev-tenant"

// ─── Fake Source ────────────────────────────────────────────────

test("fake Calendar source returns 2 events", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  assert.equal(events.length, 2)
})

test("fake Calendar source has deadline and meeting events", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const types = events.map((e) => e.eventType)
  assert.ok(types.includes("deadline_approaching"))
  assert.ok(types.includes("meeting_preparation_needed"))
})

// ─── To NormalizedToolSignal ────────────────────────────────────

test("deadline approaching maps to calendar_deadline with high priority", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "deadline_approaching")!
  const signal = calendarEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "calendar_deadline")
  assert.equal(signal.provider, "calendar")
  assert.equal(signal.priorityHint, "high")
})

test("meeting preparation maps to calendar_deadline", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "meeting_preparation_needed")!
  const signal = calendarEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "calendar_deadline")
})

test("dueAt is preserved", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const signal = calendarEventToNormalizedToolSignal(events[0])
  assert.ok(signal.dueAt)
  // Should be a valid ISO date
  assert.ok(new Date(signal.dueAt!).getTime() > 0)
})

test("priority is high for event within 2 days", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const signal = calendarEventToNormalizedToolSignal(events[0])
  assert.equal(signal.priorityHint, "high")
})

test("no raw payload fields leak", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const signal = calendarEventToNormalizedToolSignal(events[0])
  assert.equal("eventType" in signal, false)
  assert.equal("calendarName" in signal, false)
})

test("batch transforms all events", async () => {
  const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
  const signals = calendarEventsToNormalizedToolSignals(events)
  assert.equal(signals.length, 2)
})
