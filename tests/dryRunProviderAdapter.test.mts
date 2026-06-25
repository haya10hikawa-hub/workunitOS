import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DRY_RUN_PROVIDER_ADAPTER } from "../app/lib/application/llmProvider/dryRunProviderAdapter.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/dryRunProviderAdapter.ts"), "utf-8")
const BOUNDARY_SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/providerAdapterBoundary.ts"), "utf-8")
const ctx = { tenantId: "t1", userId: "u1", nodeId: "n1", requestId: "r1" }
const res = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "some prompt", maxOutputChars: 500 })

// ─── Identity ──────────────────────────────────────────────────

test("adapter id is dry_run_provider_adapter", () => {
  assert.equal(DRY_RUN_PROVIDER_ADAPTER.id, "dry_run_provider_adapter")
  assert.equal(DRY_RUN_PROVIDER_ADAPTER.mode, "dry_run")
  assert.equal(res.adapterId, "dry_run_provider_adapter")
  assert.equal(res.mode, "dry_run")
})

// ─── Status ────────────────────────────────────────────────────

test("blocked is false", () => { assert.equal(res.blocked, false) })
test("candidateOnly is true", () => { assert.equal(res.candidateOnly, true) })
test("liveIntegrationAllowed is false", () => { assert.equal(res.liveIntegrationAllowed, false) })
test("externalExecutionAllowed is false", () => { assert.equal(res.externalExecutionAllowed, false) })
test("approvalCreationAllowed is false", () => { assert.equal(res.approvalCreationAllowed, false) })
test("executionCreationAllowed is false", () => { assert.equal(res.executionCreationAllowed, false) })

// ─── Text candidate ────────────────────────────────────────────

test("textCandidate says DRY_RUN_CANDIDATE_ONLY", () => {
  assert.ok(res.textCandidate.includes("[DRY_RUN_CANDIDATE_ONLY]"))
})

test("textCandidate says no live provider was called", () => {
  assert.ok(res.textCandidate.includes("No live provider was called"))
})

test("raw prompt is not echoed in textCandidate", () => {
  assert.equal(res.textCandidate.includes("some prompt"), false)
})

test("raw prompt is not echoed in serialized result", () => {
  const s = JSON.stringify(res)
  assert.equal(s.includes("some prompt"), false)
})

// ─── maxOutputChars ────────────────────────────────────────────

test("output respects maxOutputChars (truncated)", () => {
  const r = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 20 })
  assert.ok(r.textCandidate.length <= 20)
  assert.ok(r.textCandidate.startsWith("[DRY_RUN_CANDIDATE"))
})

test("output is not truncated when maxOutputChars is large", () => {
  const r = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 5000 })
  assert.equal(r.textCandidate.length, DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "different", maxOutputChars: 5000 }).textCandidate.length)
})

// ─── Determinism + freshness ───────────────────────────────────

test("output is deterministic", () => {
  const a = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 500 })
  const b = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 500 })
  assert.deepEqual(a, b)
})

test("result object is fresh per call", () => {
  const a = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 500 })
  ;(a as unknown as { liveIntegrationAllowed: boolean }).liveIntegrationAllowed = true
  const b = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 500 })
  assert.equal(b.liveIntegrationAllowed, false)
})

// ─── Serialized safety ─────────────────────────────────────────

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(res)
  for (const forbidden of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) {
    assert.equal(s.includes(forbidden), false, `should not contain ${forbidden}`)
  }
  for (const forbidden of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) {
    assert.equal(s.includes(forbidden), false, `should not contain ${forbidden}`)
  }
})

// ─── Source scans ──────────────────────────────────────────────

test("source has no provider SDK", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false)
  }
})

test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

// ─── Boundary context ──────────────────────────────────────────

test("providerAdapterBoundary contains dry_run_provider_adapter", () => {
  assert.ok(BOUNDARY_SRC.includes("dry_run_provider_adapter"))
})

test("providerAdapterBoundary still keeps all false invariants", () => {
  for (const invariant of ["liveIntegrationAllowed: false", "externalExecutionAllowed: false", "approvalCreationAllowed: false", "executionCreationAllowed: false", "candidateOnly: true"]) {
    assert.ok(BOUNDARY_SRC.includes(invariant), `boundary should contain ${invariant}`)
  }
})

// ─── maxOutputChars edge cases ───────────────────────────────

test("negative maxOutputChars returns empty candidate without throwing", () => {
  const r = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: -1 })
  assert.equal(r.textCandidate, "")
  assert.equal(r.candidateOnly, true)
  assert.equal(r.liveIntegrationAllowed, false)
})

test("zero maxOutputChars returns empty candidate without throwing", () => {
  const r = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 0 })
  assert.equal(r.textCandidate, "")
})

test("fractional maxOutputChars is floored", () => {
  const r = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: 10.9 })
  assert.equal(r.textCandidate.length, 10)
})

test("non-finite maxOutputChars returns empty candidate without throwing", () => {
  for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const r = DRY_RUN_PROVIDER_ADAPTER.executeCandidate(ctx, { prompt: "p", maxOutputChars: n })
    assert.equal(r.textCandidate, "")
  }
})
