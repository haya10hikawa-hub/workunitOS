import test from "node:test"
import assert from "node:assert/strict"
import { runFixtureGate, runOfflineFixtureGate } from "../app/lib/application/llmProvider/offlineProviderFixtureGate.ts"
import { OFFLINE_PROVIDER_FIXTURES } from "../app/lib/application/llmProvider/offlineProviderFixtures.ts"

test("offline fixtures are deterministic", () => {
  const a = runOfflineFixtureGate()
  const b = runOfflineFixtureGate()
  assert.deepEqual(a.passed, b.passed)
  assert.deepEqual(a.total, b.total)
})

test("offline fixture gate does not call network or import SDKs", () => {
  const src = runFixtureGate.toString() + runOfflineFixtureGate.toString()
  assert.equal(src.includes("fetch("), false)
  assert.equal(src.includes("openai"), false)
  assert.equal(src.includes("anthropic"), false)
  assert.equal(src.includes("process.env"), false)
})

test("all fixtures blocked", () => {
  const r = runOfflineFixtureGate()
  assert.equal(r.allBlocked, true)
})

test("all fixtures pass expected block conditions", () => {
  const r = runOfflineFixtureGate()
  assert.equal(r.failed, 0)
  assert.equal(r.passed, r.total)
})

test("fixture 'all-controls-pass' blocked with provider_implementation_missing", () => {
  const f = OFFLINE_PROVIDER_FIXTURES.find((x) => x.name === "all-controls-pass")!
  const r = runFixtureGate(f)
  assert.equal(r.pass, true)
  assert.equal(r.blocked, true)
  assert.equal(r.blockedReasons.includes("provider_implementation_missing"), true)
})

test("fixture 'readiness-no-go' blocked", () => {
  const f = OFFLINE_PROVIDER_FIXTURES.find((x) => x.name === "readiness-no-go")!
  const r = runFixtureGate(f)
  assert.equal(r.pass, true)
  assert.equal(r.blocked, true)
})

test("fixture 'kill-switch-closed' blocked", () => {
  const f = OFFLINE_PROVIDER_FIXTURES.find((x) => x.name === "kill-switch-closed")!
  const r = runFixtureGate(f)
  assert.equal(r.pass, true)
  assert.equal(r.blocked, true)
})

test("fixture 'raw-provider-payload' blocked", () => {
  const f = OFFLINE_PROVIDER_FIXTURES.find((x) => x.name === "raw-provider-payload")!
  const r = runFixtureGate(f)
  assert.equal(r.pass, true)
  assert.equal(r.blocked, true)
})

test("fixture gate diagnostics are safe", () => {
  const r = runOfflineFixtureGate()
  for (const g of r.results) {
    for (const d of g.diagnostics) {
      assert.equal(typeof d.key === "string", true)
      assert.equal(typeof d.reason === "string", true)
      assert.equal("valuePreview" in d, false)
    }
  }
})

test("fixture gate result contains no execution-ready payload", () => {
  const r = runOfflineFixtureGate()
  const s = JSON.stringify(r)
  assert.equal(s.includes('"execute"'), false)
  assert.equal(s.includes('"execution"'), false)
  assert.equal(s.includes('"approvalId"'), false)
})
