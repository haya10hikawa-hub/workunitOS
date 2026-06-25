import test from "node:test"
import assert from "node:assert/strict"
import { BLOCKED_TRANSPORT_POLICY, MOCK_TRANSPORT } from "../app/lib/application/llmProvider/providerTransportPolicy.ts"

test("blocked transport policy: transport type is blocked", () => {
  assert.equal(BLOCKED_TRANSPORT_POLICY.transportType, "blocked")
})

test("blocked transport policy: network not allowed", () => {
  assert.equal(BLOCKED_TRANSPORT_POLICY.networkAllowed, false)
})

test("blocked transport policy: zero retries and timeout", () => {
  assert.equal(BLOCKED_TRANSPORT_POLICY.maxRetries, 0)
  assert.equal(BLOCKED_TRANSPORT_POLICY.timeoutMs, 0)
})

test("mock transport execute returns blocked status", () => {
  const r = MOCK_TRANSPORT.execute()
  assert.equal(r.status, "blocked")
  assert.equal(r.reason, "provider_implementation_missing")
})

test("mock transport policy matches blocked transport", () => {
  assert.equal(MOCK_TRANSPORT.policy.transportType, "blocked")
  assert.equal(MOCK_TRANSPORT.policy.networkAllowed, false)
})

test("transport policy source has no SDK or network", () => {
  const src = MOCK_TRANSPORT.execute.toString() + JSON.stringify(BLOCKED_TRANSPORT_POLICY)
  assert.equal(src.includes("openai"), false)
  assert.equal(src.includes("anthropic"), false)
  assert.equal(src.includes("fetch("), false)
  assert.equal(src.includes("process.env"), false)
})
