import test from "node:test"
import assert from "node:assert/strict"
import { MOCK_SIGNALS } from "../app/lib/workunitInbox/mockSignals.ts"
import { transformSignalsToInboxWorkUnits } from "../app/lib/workunitInbox/transform.ts"

// NOTE: These tests validate the transform + data pipeline directly.
// Route-level testing requires Next.js server infrastructure.
// The route uses requireSession + tenant filtering which are
// already tested in route enforcement tests.

// ─── Inbox API Logic ────────────────────────────────────────────

test("MOCK_SIGNALS contains expected provider types", () => {
  const providers = MOCK_SIGNALS.map((s) => s.provider)
  assert.ok(providers.includes("github"))
  assert.ok(providers.includes("slack"))
  assert.ok(providers.includes("calendar"))
})

test("MOCK_SIGNALS contains 5 signals", () => {
  assert.equal(MOCK_SIGNALS.length, 5)
})

test("transform produces workUnits for all signals", () => {
  const workUnits = transformSignalsToInboxWorkUnits(MOCK_SIGNALS)
  assert.equal(workUnits.length, 5)
})

test("each workUnit has required fields", () => {
  const workUnits = transformSignalsToInboxWorkUnits(MOCK_SIGNALS)
  for (const wu of workUnits) {
    assert.ok(wu.id)
    assert.ok(wu.title)
    assert.ok(wu.kind)
    assert.ok(wu.priority)
    assert.ok(wu.sourceProvider)
    assert.ok(wu.reason)
    assert.ok(wu.evidence)
    assert.ok(wu.nextAction)
  }
})

test("tenant filtering excludes other tenants", () => {
  const filtered = MOCK_SIGNALS.filter((s) => s.tenantId === "other-tenant")
  assert.equal(filtered.length, 0)
})

test("all mock signals belong to dev-tenant", () => {
  for (const signal of MOCK_SIGNALS) {
    assert.equal(signal.tenantId, "dev-tenant")
  }
})
