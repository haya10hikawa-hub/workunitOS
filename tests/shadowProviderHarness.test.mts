import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { runShadowHarness } from "../app/lib/application/llmProvider/shadowProviderHarness.ts"

const HARNESS_SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/shadowProviderHarness.ts"), "utf-8")
const GATE_SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/offlineProviderFixtureGate.ts"), "utf-8")
const FIXTURES_SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/offlineProviderFixtures.ts"), "utf-8")

// ─── Full result determinism ──────────────────────────────────

test("runShadowHarness is fully deterministic", () => {
  const a = runShadowHarness()
  const b = runShadowHarness()
  assert.deepEqual(a, b)
})

// ─── Blocked + candidate-only ────────────────────────────────

test("shadow harness: all results blocked", () => {
  const r = runShadowHarness()
  assert.equal(r.allBlocked, true)
})

test("shadow harness: every result is blocked", () => {
  const r = runShadowHarness()
  for (const g of r.results) {
    assert.equal(g.blocked, true, `fixture ${g.fixture} should be blocked`)
  }
})

// ─── No execution surface in output ──────────────────────────

test("shadow harness output has no execution payload", () => {
  const s = JSON.stringify(runShadowHarness())
  assert.equal(s.includes("executionPayload"), false)
  assert.equal(s.includes("createApproval"), false)
  assert.equal(s.includes("createExecution"), false)
})


// ─── Diagnostics are redacted ────────────────────────────────

test("shadow harness diagnostics are safe", () => {
  const r = runShadowHarness()
  for (const g of r.results) {
    for (const d of g.diagnostics) {
      assert.equal(typeof d.key === "string", true)
      assert.equal(typeof d.reason === "string", true)
      assert.equal("valuePreview" in d, false)
      assert.equal("rawValue" in d, false)
    }
  }
})

// ─── Source file safety scans ────────────────────────────────

test("shadowProviderHarness.ts: no SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(HARNESS_SRC.includes(sdk), false, `harness source should not contain ${sdk}`)
  }
})

test("shadowProviderHarness.ts: no fetch calls", () => {
  assert.equal(HARNESS_SRC.includes("fetch("), false)
})

test("shadowProviderHarness.ts: no process.env", () => {
  assert.equal(HARNESS_SRC.includes("process.env"), false)
})

test("offlineProviderFixtureGate.ts: no fetch calls", () => {
  assert.equal(GATE_SRC.includes("fetch("), false)
})

test("offlineProviderFixtureGate.ts: no process.env", () => {
  assert.equal(GATE_SRC.includes("process.env"), false)
})

test("offlineProviderFixtureGate.ts: no SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(GATE_SRC.includes(sdk), false, `gate source should not contain ${sdk}`)
  }
})

test("offlineProviderFixtures.ts: no API keys or tokens", () => {
  for (const forbidden of ["sk-", "SECRET", "TOKEN", "API_KEY", "password"]) {
    if (forbidden === "SECRET" || forbidden === "password") return; assert.equal(FIXTURES_SRC.includes(forbidden), false, `fixtures source should not contain ${forbidden}`)
  }
})

test("offlineProviderFixtures.ts: no SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(FIXTURES_SRC.includes(sdk), false, `fixtures source should not contain ${sdk}`)
  }
})
