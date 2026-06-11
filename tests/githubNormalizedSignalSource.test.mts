import test from "node:test"
import assert from "node:assert/strict"
import { fetchFakeGitHubNormalizedEvents } from "../app/lib/workunitInbox/sources/github/fakeGitHubSource.ts"
import {
  githubEventToNormalizedToolSignal,
  githubEventsToNormalizedToolSignals,
} from "../app/lib/workunitInbox/sources/github/toNormalizedToolSignal.ts"

const tenantId = "dev-tenant"

// ─── Fake Source ────────────────────────────────────────────────

test("fake source returns 3 events", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  assert.equal(events.length, 3)
})

test("fake source events have expected event types", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const types = events.map((e) => e.eventType)
  assert.ok(types.includes("pull_request_review_requested"))
  assert.ok(types.includes("issue_assigned"))
  assert.ok(types.includes("issue_blocked"))
})

// ─── To NormalizedToolSignal ────────────────────────────────────

test("PR review maps to github_pr_review_requested", async () => {
  const [event] = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const signal = githubEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "github_pr_review_requested")
  assert.equal(signal.provider, "github")
  assert.equal(signal.priorityHint, "high")
  assert.ok(signal.title.includes("PR #142"))
})

test("blocked issue maps to github_issue_blocked with high priority", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "issue_blocked")!
  const signal = githubEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "github_issue_blocked")
  assert.equal(signal.priorityHint, "high")
})

test("assigned issue maps to github_issue_assigned with medium priority", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "issue_assigned")!
  const signal = githubEventToNormalizedToolSignal(event)

  assert.equal(signal.signalType, "github_issue_assigned")
  assert.equal(signal.priorityHint, "medium")
})

test("repository is preserved", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const signal = githubEventToNormalizedToolSignal(events[0])
  assert.equal(signal.repository, "acme/api")
})

test("sourceUrl is preserved", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const signal = githubEventToNormalizedToolSignal(events[0])
  assert.equal(signal.sourceUrl, "https://github.com/acme/api/pull/142")
})

test("assignee is preserved when present", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const event = events.find((e) => e.eventType === "issue_assigned")!
  const signal = githubEventToNormalizedToolSignal(event)
  assert.equal(signal.assignee, "user")
})

test("summary includes repository and number", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const signal = githubEventToNormalizedToolSignal(events[0])
  assert.ok(signal.summary.includes("acme/api"))
  assert.ok(signal.summary.includes("142"))
})

test("no raw payload fields in signal", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const signal = githubEventToNormalizedToolSignal(events[0])
  // Signal should not contain the original raw event type or internal fields
  assert.equal("eventType" in signal, false)
})

test("batch transforms all events", async () => {
  const events = await fetchFakeGitHubNormalizedEvents({ tenantId })
  const signals = githubEventsToNormalizedToolSignals(events)
  assert.equal(signals.length, 3)
})
