import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { evaluateLiveProviderReadiness } from "../app/lib/application/llmProvider/liveProviderReadinessScorecard.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/liveProviderReadinessScorecard.ts"), "utf-8")

test("default scorecard: liveIntegrationAllowed is always false", () => {
  const r = evaluateLiveProviderReadiness()
  assert.equal(r.liveIntegrationAllowed, false)
})

test("default scorecard: all gates pass, returns Go", () => {
  const r = evaluateLiveProviderReadiness()
  assert.equal(r.decision, "go_to_propose_future_live_provider_pr")
  assert.equal(r.mayOpenFutureProviderPr, true)
})

test("Go result does not equal live integration", () => {
  const r = evaluateLiveProviderReadiness()
  assert.equal(r.liveIntegrationAllowed, false)
  assert.equal(r.mayOpenFutureProviderPr, true) // only future PR, not live now
})

test("scorecard: human approval is P0 gate", () => {
  const r = evaluateLiveProviderReadiness()
  const f = r.findings.find((x) => x.id === "human_approval")
  assert.ok(f)
  assert.equal(f.severity, "p0")
  assert.equal(f.status, "pass")
})

test("scorecard: external execution disabled is P0 gate", () => {
  const r = evaluateLiveProviderReadiness()
  const f = r.findings.find((x) => x.id === "external_execution_disabled")
  assert.ok(f)
  assert.equal(f.severity, "p0")
})

test("scorecard: candidate-only output is P0 gate", () => {
  const r = evaluateLiveProviderReadiness()
  const f = r.findings.find((x) => x.id === "candidate_only_output")
  assert.ok(f)
  assert.equal(f.severity, "p0")
})

test("scorecard: no provider SDK gate", () => {
  const r = evaluateLiveProviderReadiness()
  assert.ok(r.findings.find((x) => x.id === "no_provider_sdk"))
})

test("scorecard: no provider network gate", () => {
  const r = evaluateLiveProviderReadiness()
  assert.ok(r.findings.find((x) => x.id === "no_provider_network"))
})

test("scorecard: no provider env secret gate", () => {
  const r = evaluateLiveProviderReadiness()
  assert.ok(r.findings.find((x) => x.id === "no_provider_env_secret"))
})

test("serialized result contains no API key or token", () => {
  const s = JSON.stringify(evaluateLiveProviderReadiness())
  for (const forbidden of ["sk-", "TOKEN", "API_KEY", "Bearer", "password", "SECRET"]) {
    assert.equal(s.includes(forbidden), false, `serialized result should not contain ${forbidden}`)
  }
})

test("scorecard source has no provider SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false, `source should not contain ${sdk}`)
  }
})

test("scorecard source has no fetch calls", () => {
  assert.equal(SRC.includes("fetch("), false)
})

test("scorecard source has no process.env", () => {
  assert.equal(SRC.includes("process.env"), false)
})

test("scorecard result has no execution payload", () => {
  const s = JSON.stringify(evaluateLiveProviderReadiness())
  assert.equal(s.includes("executionPayload"), false)
  assert.equal(s.includes("createApproval"), false)
  assert.equal(s.includes("createExecution"), false)
})

test("scorecard is deterministic", () => {
  const a = evaluateLiveProviderReadiness()
  const b = evaluateLiveProviderReadiness()
  assert.deepEqual(a, b)
})
