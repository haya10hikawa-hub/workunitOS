import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createCurrentKnownPassingProposalInput,
  evaluateLiveProviderProposalGate,
} from "../app/lib/application/llmProvider/liveProviderProposalGate.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/liveProviderProposalGate.ts"), "utf-8")

// ─── Default known state ──────────────────────────────────────

test("default complete input returns Go", () => {
  const r = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(r.decision, "go_to_open_separate_future_live_provider_adapter_pr")
  assert.equal(r.mayOpenFutureProviderAdapterPr, true)
})

test("Go keeps liveIntegrationAllowed false", () => {
  const r = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(r.liveIntegrationAllowed, false)
})

test("Go keeps liveProviderAdapterImplemented false", () => {
  const r = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(r.liveProviderAdapterImplemented, false)
})

test("Go keeps externalExecutionAllowed false", () => {
  const r = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(r.externalExecutionAllowed, false)
})

// ─── P0 gate failures ─────────────────────────────────────────

test("missing P0 gate returns No-Go", () => {
  const base = createCurrentKnownPassingProposalInput()
  const r = evaluateLiveProviderProposalGate({ gates: base.gates.slice(0, base.gates.length - 1) })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenFutureProviderAdapterPr, false)
})

test("failed P0 gate returns No-Go", () => {
  const r = evaluateLiveProviderProposalGate({
    gates: [{ id: "no_sdk_current_phase", status: "fail" }],
  })
  assert.equal(r.decision, "no_go")
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
  const base = createCurrentKnownPassingProposalInput()
  const r = evaluateLiveProviderProposalGate({
    gates: base.gates.map((g) => g.id === "budget_cap" ? { ...g, status: "fail" as const } : g),
  })
  assert.equal(r.decision, "no_go")
})

// ─── Warning → Conditional Go ─────────────────────────────────

test("warning gate returns Conditional Go", () => {
  const base = createCurrentKnownPassingProposalInput()
  const r = evaluateLiveProviderProposalGate({
    gates: base.gates.map((g) => g.id === "budget_cap" ? { ...g, status: "warning" as const } : g),
  })
  assert.equal(r.decision, "conditional_go")
  assert.equal(r.mayOpenFutureProviderAdapterPr, false)
})

test("incomplete warning input returns No-Go", () => {
  const r = evaluateLiveProviderProposalGate({
    gates: [{ id: "budget_cap", status: "warning" }],
  })
  assert.equal(r.decision, "no_go")
})

// ─── mayOpenFutureProviderAdapterPr semantics ─────────────────

test("mayOpenFutureProviderAdapterPr true only for Go", () => {
  const go = evaluateLiveProviderProposalGate(createCurrentKnownPassingProposalInput())
  assert.equal(go.mayOpenFutureProviderAdapterPr, true)
  const noGo = evaluateLiveProviderProposalGate({ gates: [{ id: "no_sdk_current_phase", status: "fail" }] })
  assert.equal(noGo.mayOpenFutureProviderAdapterPr, false)
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
