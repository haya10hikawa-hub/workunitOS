import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { BLOCKED_TRANSPORT_POLICY, MOCK_TRANSPORT } from "../app/lib/application/llmProvider/providerTransportPolicy.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/providerTransportPolicy.ts"), "utf-8")

// ─── Constant shape checks ────────────────────────────────────

test("BLOCKED_TRANSPORT_POLICY is blocked and networkAllowed false", () => {
  assert.equal(BLOCKED_TRANSPORT_POLICY.transportType, "blocked")
  assert.equal(BLOCKED_TRANSPORT_POLICY.networkAllowed, false)
  assert.equal(BLOCKED_TRANSPORT_POLICY.maxRetries, 0)
  assert.equal(BLOCKED_TRANSPORT_POLICY.timeoutMs, 0)
})

// ─── Mock transport behavior ──────────────────────────────────

test("MOCK_TRANSPORT.execute always returns blocked", () => {
  const r = MOCK_TRANSPORT.execute()
  assert.equal(r.status, "blocked")
  assert.equal(r.reason, "provider_implementation_missing")
})

test("MOCK_TRANSPORT.execute is deterministic", () => {
  const a = MOCK_TRANSPORT.execute()
  const b = MOCK_TRANSPORT.execute()
  assert.deepEqual(a, b)
})

test("MOCK_TRANSPORT policy matches blocked", () => {
  assert.equal(MOCK_TRANSPORT.policy.transportType, "blocked")
  assert.equal(MOCK_TRANSPORT.policy.networkAllowed, false)
})

// ─── No execution surface ─────────────────────────────────────

test("serialized transport result has no execution payload", () => {
  const s = JSON.stringify(MOCK_TRANSPORT.execute())
  assert.equal(s.includes("executionPayload"), false)
  assert.equal(s.includes("createApproval"), false)
  assert.equal(s.includes("createExecution"), false)
})

test("serialized transport policy has no endpoint URL", () => {
  const s = JSON.stringify(BLOCKED_TRANSPORT_POLICY)
  assert.equal(s.includes("https://"), false)
  assert.equal(s.includes("http://"), false)
  assert.equal(s.includes("api."), false)
})

test("serialized transport policy has no token or key", () => {
  const s = JSON.stringify(BLOCKED_TRANSPORT_POLICY)
  assert.equal(s.includes("sk-"), false)
  assert.equal(s.includes("SECRET"), false)
  assert.equal(s.includes("TOKEN"), false)
  assert.equal(s.includes("API_KEY"), false)
})

// ─── Source file safety scan ──────────────────────────────────

test("source file has no provider SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false, `source should not contain ${sdk}`)
  }
})

test("source file has no fetch calls", () => {
  assert.equal(SRC.includes("fetch("), false)
})

test("source file has no process.env", () => {
  assert.equal(SRC.includes("process.env"), false)
})

