import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createCurrentKnownPassingProposalInput,
  evaluateLiveProviderProposalGate,
  type LiveProviderProposalGateId,
  type LiveProviderProposalGateInput,
} from "../app/lib/application/llmProvider/liveProviderProposalGate.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/liveProviderProposalGate.ts"), "utf-8")

function withGateStatus(
  id: LiveProviderProposalGateId,
  status: "pass" | "fail" | "warning",
): LiveProviderProposalGateInput {
  const base = createCurrentKnownPassingProposalInput()
  return { gates: base.gates.map((g) => g.id === id ? { ...g, status } : g) }
}

// ─── Default known state ──────────────────────────────────────

test("default complete input returns Go", () => {
  const r = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(r.decision, "go_to_open_separate_future_live_provider_adapter_pr")
  assert.equal(r.mayOpenFutureProviderAdapterPr, true)
})

// ─── P0 gate failures ─────────────────────────────────────────

test("missing P0 gate returns No-Go", () => {
  const base = createCurrentKnownPassingProposalInput()
  const r = evaluateLiveProviderProposalGate({ gates: base.gates.slice(0, base.gates.length - 1) })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderAdapterPr, false)
})

test("failed P0 gate returns No-Go", () => {
  const r = evaluateLiveProviderProposalGate(withGateStatus("no_sdk_current_phase", "fail"))
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderAdapterPr, false)
  assert.equal(r.liveIntegrationAllowed, false)
  assert.equal(r.liveProviderAdapterImplemented, false)
  assert.equal(r.externalExecutionAllowed, false)
})

// ─── Required gate failures ───────────────────────────────────

test("missing required gate returns No-Go", () => {
  const base = createCurrentKnownPassingProposalInput()
  const r = evaluateLiveProviderProposalGate({
    gates: base.gates.filter((g) => g.id !== "budget_cap"),
  })
  assert.equal(r.decision, "no_go")
})

test("failed required gate returns No-Go", () => {
  const r = evaluateLiveProviderProposalGate(withGateStatus("budget_cap", "fail"))
  assert.equal(r.decision, "no_go")
})

// ─── Warning → Conditional Go ─────────────────────────────────

test("warning gate returns Conditional Go", () => {
  const r = evaluateLiveProviderProposalGate(withGateStatus("budget_cap", "warning"))
  assert.equal(r.decision, "conditional_go")
  assert.equal(r.mayOpenFutureProviderAdapterPr, false)
})

test("incomplete warning input returns No-Go", () => {
  const r = evaluateLiveProviderProposalGate({
    gates: [{ id: "budget_cap", status: "warning" }],
  })
  assert.equal(r.decision, "no_go")
})

// ─── False invariants across all decisions ────────────────────

test("false invariants hold for Go, Conditional Go, and No-Go", () => {
  const go = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  const conditional = evaluateLiveProviderProposalGate(withGateStatus("budget_cap", "warning"))
  const noGo = evaluateLiveProviderProposalGate(withGateStatus("no_sdk_current_phase", "fail"))

  for (const r of [go, conditional, noGo]) {
    assert.equal(r.liveIntegrationAllowed, false)
    assert.equal(r.liveProviderAdapterImplemented, false)
    assert.equal(r.externalExecutionAllowed, false)
  }
})

// ─── mayOpenFutureProviderAdapterPr semantics ─────────────────

test("mayOpenFutureProviderAdapterPr true only for Go", () => {
  const go = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(go.mayOpenFutureProviderAdapterPr, true)
})

// ─── No SDK/network/env surface ──────────────────────────────

test("source has no provider SDK", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false)
  }
})

test("source has no fetch", () => {
  assert.equal(SRC.includes("fetch("), false)
})

test("source has no process.env", () => {
  assert.equal(SRC.includes("process.env"), false)
})

test("serialized result has no token/key/secret", () => {
  const s = JSON.stringify(evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput()))
  for (const forbidden of ["sk-", "TOKEN", "API_KEY", "Bearer", "password", "SECRET"]) {
    assert.equal(s.includes(forbidden), false)
  }
})

test("serialized result has no execution payload", () => {
  const s = JSON.stringify(evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput()))
  assert.equal(s.includes("executionPayload"), false)
  assert.equal(s.includes("createApproval"), false)
  assert.equal(s.includes("createExecution"), false)
})

test("deterministic", () => {
  const a = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  const b = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.deepEqual(a, b)
})
