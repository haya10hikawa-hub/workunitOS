import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { BLOCKED_PROVIDER_ADAPTER } from "../app/lib/application/llmProvider/blockedProviderAdapter.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/blockedProviderAdapter.ts"), "utf-8")
const ctx = { tenantId: "t1", userId: "u1", nodeId: "n1", requestId: "r1" }

// ─── Blocked invariants ───────────────────────────────────────

test("blocked adapter always returns blocked: true", () => {
  const r = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.equal(r.blocked, true)
})

test("candidateOnly is always true", () => {
  const r = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.equal(r.candidateOnly, true)
})

test("liveIntegrationAllowed is always false", () => {
  const r = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.equal(r.liveIntegrationAllowed, false)
})

test("externalExecutionAllowed is always false", () => {
  const r = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.equal(r.externalExecutionAllowed, false)
})

test("approvalCreationAllowed is always false", () => {
  const r = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.equal(r.approvalCreationAllowed, false)
})

test("executionCreationAllowed is always false", () => {
  const r = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.equal(r.executionCreationAllowed, false)
})

test("serialized result has no approvalId", () => {
  const s = JSON.stringify(BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 }))
  assert.equal(s.includes("approvalId"), false)
})

test("serialized result has no executionPayload", () => {
  const s = JSON.stringify(BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 }))
  assert.equal(s.includes("executionPayload"), false)
})

test("serialized result has no token/key/secret", () => {
  const s = JSON.stringify(BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 }))
  for (const forbidden of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET", "password"]) {
    assert.equal(s.includes(forbidden), false, `should not contain ${forbidden}`)
  }
})

test("adapter output is deterministic", () => {
  const a = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  const b = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  assert.deepEqual(a, b)
})

test("source has no fetch calls", () => {
  assert.equal(SRC.includes("fetch("), false)
})

test("source has no process.env", () => {
  assert.equal(SRC.includes("process.env"), false)
})

test("source has no provider SDK", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false, `should not contain ${sdk}`)
  }
})

test("serialized result has no executionId", () => {
  const s = JSON.stringify(BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 }))
  assert.equal(s.includes("executionId"), false)
})

test("blocked adapter returns a fresh result object per call", () => {
  const a = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })
  ;(a as unknown as { liveIntegrationAllowed: boolean }).liveIntegrationAllowed = true

  const b = BLOCKED_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "test", maxOutputChars: 100 })

  assert.equal(b.liveIntegrationAllowed, false)
  assert.equal(b.externalExecutionAllowed, false)
  assert.equal(b.approvalCreationAllowed, false)
  assert.equal(b.executionCreationAllowed, false)
})
