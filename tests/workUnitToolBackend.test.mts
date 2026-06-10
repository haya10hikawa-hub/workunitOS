import test from "node:test"
import assert from "node:assert/strict"
import { listToolBackendAdapters, runToolBackendRequest } from "../app/lib/toolBackend.ts"
import { candidateToWorkUnitDraft } from "../app/lib/workUnitDrafts.ts"
import { sanitizeSourceEvent } from "../app/lib/sourceHoppers.ts"
import type { ExternalToolClients } from "../app/lib/externalToolClients.ts"
import type { SourceHopperEvent } from "../app/types/sourceHopper.ts"

const slackEvent: SourceHopperEvent = {
  id: "slack:urgent-review",
  source: "slack",
  title: "本日中にスポンサー資料を確認",
  actor: "PM",
  container: "growth",
  timestamp: "2026-06-08T09:00:00.000Z",
  deadline: "2026-06-08",
  labels: ["urgent"],
  rawContent: "never pass raw slack body",
}

const fakeClients: ExternalToolClients = {
  github: {
    async createIssue(input) {
      return { externalRef: `https://github.test/${input.owner}/${input.repo}/issues/1` }
    },
  },
  slack: {
    async postMessage(input) {
      return { externalRef: `${input.channel}:1717820000.000000` }
    },
  },
  gmail: {
    async sendMessage(input) {
      return { externalRef: `gmail:${input.to}` }
    },
  },
  googleCalendar: {
    async createEvent(input) {
      return { externalRef: `calendar:${input.calendarId}` }
    },
  },
}

test("tool backend exposes source adapters", () => {
  assert.deepEqual(
    listToolBackendAdapters().map((adapter) => adapter.source),
    ["slack", "notion", "gmail", "google_drive", "google_calendar", "github"],
  )
})

test("tool backend ingests without raw content", async () => {
  const response = await runToolBackendRequest({ id: "req-1", source: "slack", operation: "ingest", event: slackEvent })
  assert.equal(response.ok, true)
  assert.equal(JSON.stringify(response.result).includes("raw slack body"), false)
})

test("tool backend blocks unapproved external issue creation", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  const response = await runToolBackendRequest({ id: "req-2", source: "github", operation: "create_issue", draft })
  assert.equal(response.ok, false)
  assert.match(response.errors.join(" "), /PM approval/)
})

test("tool backend executes approved issue creation through GitHub client", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  const response = await runToolBackendRequest({
    id: "req-3",
    source: "github",
    operation: "create_issue",
    draft,
    approvedByPm: true,
    approvalId: "approval-1",
    externalConfig: { github: { owner: "acme", repo: "ops" } },
  }, { clients: fakeClients })
  assert.equal(response.ok, true)
  assert.equal(response.externalRef, "https://github.test/acme/ops/issues/1")
})

test("tool backend blocks approved external execution when client is missing", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  const response = await runToolBackendRequest({
    id: "req-4",
    source: "github",
    operation: "create_issue",
    draft,
    approvedByPm: true,
    approvalId: "approval-1",
    externalConfig: { github: { owner: "acme", repo: "ops" } },
  }, { clients: {} })
  assert.equal(response.ok, false)
  assert.match(response.errors.join(" "), /external_tool_not_configured:github/)
})

test("tool backend executes approved Slack, Gmail, and Calendar tools", async () => {
  const slackCandidate = sanitizeSourceEvent(slackEvent)
  const gmailCandidate = sanitizeSourceEvent({ ...slackEvent, id: "gmail:contract", source: "gmail", actor: "pm@example.com" })
  const calendarCandidate = sanitizeSourceEvent({ ...slackEvent, id: "google_calendar:review", source: "google_calendar", actor: "pm@example.com" })
  assert.ok(slackCandidate)
  assert.ok(gmailCandidate)
  assert.ok(calendarCandidate)

  const slackDraft = { ...candidateToWorkUnitDraft(slackCandidate), status: "accepted" as const, missingFields: [] }
  const gmailDraft = { ...candidateToWorkUnitDraft(gmailCandidate), status: "accepted" as const, missingFields: [] }
  const calendarDraft = { ...candidateToWorkUnitDraft(calendarCandidate), status: "accepted" as const, missingFields: [] }

  const slackResponse = await runToolBackendRequest({
    id: "req-5",
    source: "slack",
    operation: "reply",
    draft: slackDraft,
    approvedByPm: true,
    approvalId: "approval-2",
    externalConfig: { slack: { channel: "C123" } },
  }, { clients: fakeClients })
  const gmailResponse = await runToolBackendRequest({
    id: "req-6",
    source: "gmail",
    operation: "reply",
    draft: gmailDraft,
    approvedByPm: true,
    approvalId: "approval-3",
    externalConfig: { gmail: { to: "pm@example.com", subject: "Re: contract" } },
  }, { clients: fakeClients })
  const calendarResponse = await runToolBackendRequest({
    id: "req-7",
    source: "google_calendar",
    operation: "schedule",
    draft: calendarDraft,
    approvedByPm: true,
    approvalId: "approval-4",
    externalConfig: { googleCalendar: { calendarId: "primary" } },
  }, { clients: fakeClients })

  assert.equal(slackResponse.externalRef, "C123:1717820000.000000")
  assert.equal(gmailResponse.externalRef, "gmail:pm@example.com")
  assert.equal(calendarResponse.externalRef, "calendar:primary")
})
