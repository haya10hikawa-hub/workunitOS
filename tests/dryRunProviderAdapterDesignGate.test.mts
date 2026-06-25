import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  createCurrentKnownPassingDryRunProviderDesignInput,
  evaluateDryRunProviderDesignGate,
  type DryRunProviderDesignGateId,
  type DryRunProviderDesignGateInput,
} from "../app/lib/application/llmProvider/dryRunProviderAdapterDesignGate.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/dryRunProviderAdapterDesignGate.ts"), "utf-8")

function withGateStatus(id: DryRunProviderDesignGateId, status: "pass" | "fail" | "warning"): DryRunProviderDesignGateInput {
  const base = createCurrentKnownPassingDryRunProviderDesignInput()
  return { gates: base.gates.map((g) => g.id === id ? { ...g, status } : g) }
}

// ─── Default ──────────────────────────────────────────────────

test("current-known passing input returns Go", () => {
  const r = evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput())
  assert.equal(r.decision, "go_to_open_dry_run_adapter_pr")
  assert.equal(r.mayOpenDryRunAdapterPr, true)
})

// ─── P0 failures ──────────────────────────────────────────────

test("missing P0 gate returns No-Go", () => {
  const base = createCurrentKnownPassingDryRunProviderDesignInput()
  const r = evaluateDryRunProviderDesignGate({ gates: base.gates.slice(0, base.gates.length - 1) })
  assert.equal(r.decision, "no_go")
  assert.equal(r.mayOpenDryRunAdapterPr, false)
})

test("failed P0 gate returns No-Go", () => {
  const r = evaluateDryRunProviderDesignGate(withGateStatus("no_provider_sdk", "fail"))
  assert.equal(r.decision, "no_go")
})

// ─── Required failures ────────────────────────────────────────

test("missing required gate returns No-Go", () => {
  const base = createCurrentKnownPassingDryRunProviderDesignInput()
  const r = evaluateDryRunProviderDesignGate({ gates: base.gates.filter((g) => g.id !== "budget_cap_defined") })
  assert.equal(r.decision, "no_go")
})

test("failed required gate returns No-Go", () => {
  const r = evaluateDryRunProviderDesignGate(withGateStatus("budget_cap_defined", "fail"))
  assert.equal(r.decision, "no_go")
})

// ─── Warning → Conditional Go ─────────────────────────────────

test("warning gate returns Conditional Go", () => {
  const r = evaluateDryRunProviderDesignGate(withGateStatus("budget_cap_defined", "warning"))
  assert.equal(r.decision, "conditional_go")
  assert.equal(r.mayOpenDryRunAdapterPr, false)
})

test("incomplete warning input returns No-Go", () => {
  const r = evaluateDryRunProviderDesignGate({ gates: [{ id: "budget_cap_defined", status: "warning" }] })
  assert.equal(r.decision, "no_go")
})

// ─── False invariants across all decisions ────────────────────

test("false invariants hold for Go, Conditional Go, and No-Go", () => {
  const go = evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput())
  const cond = evaluateDryRunProviderDesignGate(withGateStatus("budget_cap_defined", "warning"))
  const noGo = evaluateDryRunProviderDesignGate(withGateStatus("no_provider_sdk", "fail"))
  for (const r of [go, cond, noGo]) {
    assert.equal(r.liveIntegrationAllowed, false)
    assert.equal(r.providerAdapterImplemented, false)
    assert.equal(r.externalExecutionAllowed, false)
    assert.equal(r.approvalCreationAllowed, false)
    assert.equal(r.executionCreationAllowed, false)
    assert.equal(r.candidateOnly, true)
  }
})

test("mayOpenDryRunAdapterPr is true only for Go", () => {
  const go = evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput())
  const conditional = evaluateDryRunProviderDesignGate(withGateStatus("budget_cap_defined", "warning"))
  const noGo = evaluateDryRunProviderDesignGate(withGateStatus("no_provider_sdk", "fail"))
  assert.equal(go.mayOpenDryRunAdapterPr, true)
  assert.equal(conditional.mayOpenDryRunAdapterPr, false)
  assert.equal(noGo.mayOpenDryRunAdapterPr, false)
})

test("gate catalog exposes expected severity counts", () => {
  const r = evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput())
  assert.equal(r.findings.length, 21)
  assert.equal(r.findings.filter((f) => f.severity === "p0").length, 14)
  assert.equal(r.findings.filter((f) => f.severity === "required").length, 7)
})

// ─── Serialized safety ────────────────────────────────────────

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput()))
  for (const forbidden of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) {
    assert.equal(s.includes(forbidden), false, `should not contain ${forbidden}`)
  }
  for (const forbidden of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) {
    assert.equal(s.includes(forbidden), false, `should not contain ${forbidden}`)
  }
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no provider SDK", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false)
  }
})

test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("deterministic", () => {
  const a = evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput())
  const b = evaluateDryRunProviderDesignGate(createCurrentKnownPassingDryRunProviderDesignInput())
  assert.deepEqual(a, b)
})
