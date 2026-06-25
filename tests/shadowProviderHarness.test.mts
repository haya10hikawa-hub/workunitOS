import test from "node:test"
import assert from "node:assert/strict"
import { runShadowHarness } from "../app/lib/application/llmProvider/shadowProviderHarness.ts"

test("shadow harness is deterministic", () => {
  const a = runShadowHarness()
  const b = runShadowHarness()
  assert.deepEqual(a.total, b.total)
  assert.deepEqual(a.passed, b.passed)
  assert.deepEqual(a.allBlocked, b.allBlocked)
})

test("shadow harness: all results blocked", () => {
  const r = runShadowHarness()
  assert.equal(r.allBlocked, true)
})

test("shadow harness source has no SDK or network", () => {
  const src = runShadowHarness.toString()
  assert.equal(src.includes("openai"), false)
  assert.equal(src.includes("anthropic"), false)
  assert.equal(src.includes("fetch("), false)
  assert.equal(src.includes("process.env"), false)
})

test("shadow harness output has no execution-ready payload", () => {
  const r = runShadowHarness()
  const s = JSON.stringify(r)
  assert.equal(s.includes('"executionPayload"'), false)
  assert.equal(s.includes('"createApproval"'), false)
  assert.equal(s.includes('"createExecution"'), false)
})
