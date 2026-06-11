import test from "node:test"
import assert from "node:assert/strict"
import { transformSignalsToInboxWorkUnits } from "../app/lib/workunitInbox/transform.ts"
import { fetchFakeGitHubNormalizedEvents } from "../app/lib/workunitInbox/sources/github/fakeGitHubSource.ts"
import { githubEventsToNormalizedToolSignals } from "../app/lib/workunitInbox/sources/github/toNormalizedToolSignal.ts"
import { fetchFakeSlackNormalizedEvents } from "../app/lib/workunitInbox/sources/slack/fakeSlackSource.ts"
import { slackEventsToNormalizedToolSignals } from "../app/lib/workunitInbox/sources/slack/toNormalizedToolSignal.ts"
import { fetchFakeCalendarNormalizedEvents } from "../app/lib/workunitInbox/sources/calendar/fakeCalendarSource.ts"
import { calendarEventsToNormalizedToolSignals } from "../app/lib/workunitInbox/sources/calendar/toNormalizedToolSignal.ts"

const tenantId = "dev-tenant"

// ─── All Source Integration ─────────────────────────────────────

test("?source=all returns WorkUnits from all 3 providers", async () => {
  const [github, slack, cal] = await Promise.all([
    fetchFakeGitHubNormalizedEvents({ tenantId }),
    fetchFakeSlackNormalizedEvents({ tenantId }),
    fetchFakeCalendarNormalizedEvents({ tenantId }),
  ])

  const signals = [
    ...githubEventsToNormalizedToolSignals(github),
    ...slackEventsToNormalizedToolSignals(slack),
    ...calendarEventsToNormalizedToolSignals(cal),
  ]

  const workUnits = transformSignalsToInboxWorkUnits(signals)

  // 3 + 2 + 2 = 7 total
  assert.equal(workUnits.length, 7)

  const providers = new Set(workUnits.map((wu) => wu.sourceProvider))
  assert.ok(providers.has("github"))
  assert.ok(providers.has("slack"))
  assert.ok(providers.has("calendar"))
})

test("?source=all includes all expected kinds", async () => {
  const [github, slack, cal] = await Promise.all([
    fetchFakeGitHubNormalizedEvents({ tenantId }),
    fetchFakeSlackNormalizedEvents({ tenantId }),
    fetchFakeCalendarNormalizedEvents({ tenantId }),
  ])

  const signals = [
    ...githubEventsToNormalizedToolSignals(github),
    ...slackEventsToNormalizedToolSignals(slack),
    ...calendarEventsToNormalizedToolSignals(cal),
  ]

  const workUnits = transformSignalsToInboxWorkUnits(signals)
  const kinds = new Set(workUnits.map((wu) => wu.kind))

  assert.ok(kinds.has("review_waiting"))
  assert.ok(kinds.has("blocker"))
  assert.ok(kinds.has("assigned_issue"))
  assert.ok(kinds.has("missed_response"))
  assert.ok(kinds.has("deadline"))
})

test("?source=all sorts high priority first", async () => {
  const [github, slack, cal] = await Promise.all([
    fetchFakeGitHubNormalizedEvents({ tenantId }),
    fetchFakeSlackNormalizedEvents({ tenantId }),
    fetchFakeCalendarNormalizedEvents({ tenantId }),
  ])

  const signals = [
    ...githubEventsToNormalizedToolSignals(github),
    ...slackEventsToNormalizedToolSignals(slack),
    ...calendarEventsToNormalizedToolSignals(cal),
  ]

  const workUnits = transformSignalsToInboxWorkUnits(signals)
  assert.equal(workUnits[0].priority, "high")
})

test("?source=all filters by tenantId", async () => {
  const [github, slack, cal] = await Promise.all([
    fetchFakeGitHubNormalizedEvents({ tenantId }),
    fetchFakeSlackNormalizedEvents({ tenantId }),
    fetchFakeCalendarNormalizedEvents({ tenantId }),
  ])

  const signals = [
    ...githubEventsToNormalizedToolSignals(github),
    ...slackEventsToNormalizedToolSignals(slack),
    ...calendarEventsToNormalizedToolSignals(cal),
  ]

  // All should be from our tenant
  for (const s of signals) {
    assert.equal(s.tenantId, tenantId)
  }
})
