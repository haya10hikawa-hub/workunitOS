import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createCurrentKnownPassingReadinessInput,
  evaluateLiveProviderReadiness,
  type LiveProviderReadinessGateId,
  type LiveProviderReadinessGateInput,
  type LiveProviderReadinessScorecardInput,
} from "../app/lib/application/llmProvider/liveProviderReadinessScorecard.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/liveProviderReadinessScorecard.ts"), "utf-8")

function gates(status: "pass" | "fail" | "warning", ...ids: LiveProviderReadinessGateId[]): readonly LiveProviderReadinessGateInput[] {
  return ids.map((id) => ({ id, status }))
}

function input(status: "pass" | "fail" | "warning", ...ids: LiveProviderReadinessGateId[]): LiveProviderReadinessScorecardInput {
  return { gates: gates(status, ...ids) }
}

// ─── Default known state ──────────────────────────────────────

test("current-known passing input returns Go", () => {
  const r = evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput())
  assert.equal(r.decision, "go_to_propose_future_live_provider_pr")
  assert.equal(r.mayOpenFutureProviderPr, true)
})

test("liveIntegrationAllowed is always false", () => {
  const r = evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput())
  assert.equal(r.liveIntegrationAllowed, false)
})

test("Go does not equal live integration", () => {
  const r = evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput())
  assert.equal(r.liveIntegrationAllowed, false)
  assert.equal(r.mayOpenFutureProviderPr, true)
})

// ─── P0 gate failures ─────────────────────────────────────────

test("missing P0 gate returns No-Go", () => {
  const partial = input("pass",
    "phase_2a", "phase_2b", "phase_2c", "phase_2d", "phase_2e",
    "phase_2f", "phase_3a", "phase_3b", "phase_3c", "phase_3d",
    "phase_3cd_audit", "rollback_plan", "budget_policy",
    "explicit_owner", "human_approval", "external_execution_disabled",
    "candidate_only_output", "no_provider_sdk", "no_provider_network",
    "no_provider_env_secret", "no_security_no_go",
  )
  const r = evaluateLiveProviderReadiness({ gates: partial.gates.slice(0, partial.gates.length - 1) })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderPr, false)
})

test("P0 gate as fail returns No-Go", () => {
  const g = gates("pass",
    "phase_2a", "phase_2b", "phase_2c", "phase_2d", "phase_2e",
    "phase_2f", "phase_3a", "phase_3b", "phase_3c", "phase_3d",
    "phase_3cd_audit", "rollback_plan", "budget_policy",
    "explicit_owner", "human_approval", "external_execution_disabled",
    "candidate_only_output", "no_provider_sdk", "no_provider_network",
    "no_provider_env_secret",
  )
  const r = evaluateLiveProviderReadiness({
    gates: [...g, { id: "no_security_no_go", status: "fail" }],
  })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderPr, false)
})

// ─── Required gate failures ───────────────────────────────────

test("missing required gate returns No-Go", () => {
  const g = gates("pass",
    "phase_2a", "phase_2b", "phase_2c", "phase_2d", "phase_2e",
    "phase_2f", "phase_3a", "phase_3b", "phase_3c", "phase_3d",
    "phase_3cd_audit", "no_security_no_go", "budget_policy",
    "explicit_owner", "human_approval", "external_execution_disabled",
    "candidate_only_output", "no_provider_sdk", "no_provider_network",
    "no_provider_env_secret",
  )
  const r = evaluateLiveProviderReadiness({ gates: g })
  assert.equal(r.decision, "no_go")
})

test("required gate as fail returns No-Go", () => {
  const g = gates("pass",
    "phase_2a", "phase_2b", "phase_2c", "phase_2d", "phase_2e",
    "phase_2f", "phase_3a", "phase_3b", "phase_3c", "phase_3d",
    "phase_3cd_audit", "no_security_no_go", "budget_policy",
    "explicit_owner", "human_approval", "external_execution_disabled",
    "candidate_only_output", "no_provider_sdk", "no_provider_network",
    "no_provider_env_secret",
  )
  const r = evaluateLiveProviderReadiness({
    gates: [...g, { id: "rollback_plan", status: "fail" }],
  })
  assert.equal(r.decision, "no_go")
})

// ─── Warning / Conditional Go ─────────────────────────────────

test("advisory warning returns Conditional Go", () => {
  const g = gates("pass",
    "phase_2a", "phase_2b", "phase_2c", "phase_2d", "phase_2e",
    "phase_2f", "phase_3a", "phase_3b", "phase_3c", "phase_3d",
    "phase_3cd_audit", "no_security_no_go", "rollback_plan",
    "budget_policy", "explicit_owner", "human_approval",
    "external_execution_disabled", "candidate_only_output",
    "no_provider_sdk", "no_provider_network", "no_provider_env_secret",
  )
  const r = evaluateLiveProviderReadiness({
    gates: g.map((x) => x.id === "rollback_plan" ? { ...x, status: "warning" } : x),
  })
  assert.equal(r.decision, "conditional_go")
  assert.equal(r.mayOpenFutureProviderPr, false)
})

test("mayOpenFutureProviderPr is false for No-Go", () => {
  const r = evaluateLiveProviderReadiness({ gates: [{ id: "phase_2a", status: "fail" }] })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderPr, false)
})

test("mayOpenFutureProviderPr is false for Conditional Go", () => {
  const base = createCurrentKnownPassingReadinessInput()
  const r = evaluateLiveProviderReadiness({
    gates: base.gates.map((g) => g.id === "rollback_plan" ? { ...g, status: "warning" } : g),
  })
  assert.equal(r.decision, "conditional_go")
  assert.equal(r.mayOpenFutureProviderPr, false)
  assert.equal(r.liveIntegrationAllowed, false)
})

test("incomplete warning-only input returns No-Go", () => {
  // Passing only 1 gate as warning with all others missing → No-Go, not Conditional Go
  const r = evaluateLiveProviderReadiness({
    gates: [{ id: "rollback_plan", status: "warning" }],
  })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderPr, false)
})

test("mayOpenFutureProviderPr is true only for Go", () => {
  const r = evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput())
  assert.equal(r.decision, "go_to_propose_future_live_provider_pr")
  assert.equal(r.mayOpenFutureProviderPr, true)
})

// ─── Catalog completeness ─────────────────────────────────────

test("all 21 gate IDs are in current-known passing input", () => {
  const inp = createCurrentKnownPassingReadinessInput()
  assert.equal(inp.gates.length, 21)
})

// ─── No secret/token/execution surface ───────────────────────

test("serialized result contains no API key or token", () => {
  const s = JSON.stringify(evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput()))
  for (const forbidden of ["sk-", "TOKEN", "API_KEY", "Bearer", "password", "SECRET"]) {
    assert.equal(s.includes(forbidden), false)
  }
})

test("scorecard source has no provider SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false)
  }
})

test("scorecard source has no fetch calls", () => {
  assert.equal(SRC.includes("fetch("), false)
})

test("scorecard source has no process.env", () => {
  assert.equal(SRC.includes("process.env"), false)
})

test("scorecard result has no execution payload", () => {
  const s = JSON.stringify(evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput()))
  assert.equal(s.includes("executionPayload"), false)
  assert.equal(s.includes("createApproval"), false)
  assert.equal(s.includes("createExecution"), false)
})

// ─── Determinism ──────────────────────────────────────────────

test("scorecard is deterministic", () => {
  const a = evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput())
  const b = evaluateLiveProviderReadiness(createCurrentKnownPassingReadinessInput())
  assert.deepEqual(a, b)
})
