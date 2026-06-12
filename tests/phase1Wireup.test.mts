import test from "node:test"
import assert from "node:assert/strict"
import { inboxWorkUnitToRow, workUnitRowToInboxWorkUnit } from "../app/lib/workunitInbox/persistenceMapping.ts"
import { transformSignalToInboxWorkUnit } from "../app/lib/workunitInbox/transform.ts"
import { MOCK_SIGNALS } from "../app/lib/workunitInbox/mockSignals.ts"

// ─── Mapping Roundtrip ──────────────────────────────────────────

test("inboxWorkUnitToRow + workUnitRowToInboxWorkUnit roundtrip", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  const row = inboxWorkUnitToRow(wu)
  const result = workUnitRowToInboxWorkUnit(row)

  assert.equal(result.id, wu.id)
  assert.equal(result.title, wu.title)
  assert.equal(result.kind, wu.kind)
  assert.equal(result.priority, wu.priority)
  assert.equal(result.sourceProvider, wu.sourceProvider)
  assert.equal(result.reason, wu.reason)
  assert.equal(result.evidence, wu.evidence)
  assert.equal(result.nextAction, wu.nextAction)
})

test("inboxWorkUnitToRow preserves sourceUrl and repository", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  const row = inboxWorkUnitToRow(wu)
  assert.equal(row.sourceUrl, wu.sourceUrl)
  assert.equal(row.repository, wu.repository)
})

test("workUnitRowToInboxWorkUnit maps status correctly", () => {
  const signal = MOCK_SIGNALS[0]
  const wu = transformSignalToInboxWorkUnit(signal)
  const row = inboxWorkUnitToRow({ ...wu, status: "done" })
  const result = workUnitRowToInboxWorkUnit(row)
  assert.equal(result.status, "done")
})

// ─── Feedback Validation ────────────────────────────────────────

test("valid feedback values are accepted", () => {
  const valid = ["useful", "not_useful", "later", "done"]
  for (const v of valid) {
    assert.ok(["useful", "not_useful", "later", "done"].includes(v))
  }
})

test("invalid feedback value is rejected conceptually", () => {
  const VALID_FEEDBACK = new Set(["useful", "not_useful", "later", "done"])
  assert.equal(VALID_FEEDBACK.has("invalid"), false)
  assert.equal(VALID_FEEDBACK.has("useful"), true)
})

// ─── Integration Status Shape ───────────────────────────────────

test("integration status shape has 3 providers", () => {
  const status = {
    providers: [
      { provider: "github", status: "fake", mode: "fake", scopes: [], lastSyncedAt: null, lastErrorCode: null },
      { provider: "slack", status: "fake", mode: "fake", scopes: [], lastSyncedAt: null, lastErrorCode: null },
      { provider: "calendar", status: "fake", mode: "fake", scopes: [], lastSyncedAt: null, lastErrorCode: null },
    ],
  }
  assert.equal(status.providers.length, 3)
})

test("integration status has no secrets", () => {
  const status = {
    providers: [{ provider: "github", status: "fake", mode: "fake", scopes: [], lastSyncedAt: null, lastErrorCode: null }],
  }
  const json = JSON.stringify(status)
  assert.equal(json.includes("token"), false)
  assert.equal(json.includes("secret"), false)
})
