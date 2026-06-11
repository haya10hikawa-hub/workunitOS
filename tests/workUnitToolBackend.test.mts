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

// Enable external actions for tests that need to exercise the backend path
const externalEnv = { ...process.env, EXTERNAL_ACTIONS_ENABLED: "true" }

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

test("tool backend blocks external actions when kill switch is off", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  // No env override — EXTERNAL_ACTIONS_ENABLED not set, so external actions blocked
  const response = await runToolBackendRequest({ id: "req-2", source: "github", operation: "create_issue", draft })
  assert.equal(response.ok, false)
  assert.match(response.errors.join(" "), /external_actions_disabled/)
})

test("tool backend blocks external actions when server-side approval not granted", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  // Kill switch enabled, but server-side approval defaults to deny
  const response = await runToolBackendRequest(
    { id: "req-3", source: "github", operation: "create_issue", draft },
    { clients: fakeClients, env: externalEnv },
  )
  assert.equal(response.ok, false)
  assert.match(response.errors.join(" "), /approval_required/)
})

test("tool backend rejects client-provided approvedByPm (stripped by validation)", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  const response = await runToolBackendRequest(
    {
      id: "req-4",
      source: "github",
      operation: "create_issue",
      draft,
    },
    { clients: fakeClients, env: externalEnv },
  )
  assert.equal(response.ok, false)
  assert.match(response.errors.join(" "), /approval_required/)
})

test("tool backend blocks external execution when client is missing even with kill switch on", async () => {
  const candidate = sanitizeSourceEvent(slackEvent)
  assert.ok(candidate)
  const draft = { ...candidateToWorkUnitDraft(candidate), status: "accepted" as const, missingFields: [] }
  const response = await runToolBackendRequest(
    { id: "req-5", source: "github", operation: "create_issue", draft },
    { clients: {}, env: externalEnv },
  )
  assert.equal(response.ok, false)
  assert.match(response.errors.join(" "), /approval_required/)
})
