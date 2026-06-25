import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { ProviderAdapterId } from "../app/lib/application/llmProvider/providerAdapterBoundary.ts"
import { join } from "node:path"
import {
  routeProviderAdapter,
  createSafeDryRunRoutingRequest,
  type ProviderAdapterRoutingRequest,
} from "../app/lib/application/llmProvider/providerAdapterRoutingGate.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/providerAdapterRoutingGate.ts"), "utf-8")
const safe: ProviderAdapterRoutingRequest = {
  requestedAdapterId: "dry_run_provider_adapter",
  dryRunExplicitlyRequested: true,
  liveProviderRequested: false,
  externalExecutionRequested: false,
  approvalCreationRequested: false,
  executionCreationRequested: false,
  dryRunDesignDecision: "go_to_open_dry_run_adapter_pr",
}
const B: ProviderAdapterId = "blocked_provider_adapter"
const D: ProviderAdapterId = "dry_run_provider_adapter"

// ─── Default / blocked routes ─────────────────────────────────

test("absent requestedAdapterId routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, requestedAdapterId: undefined })
  assert.equal(r.decision, "route_to_blocked_adapter")
  assert.equal(r.selectedAdapterId, B)
  assert.equal(r.reason, "default_blocked")
})

test("blocked_provider_adapter routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, requestedAdapterId: B })
  assert.equal(r.decision, "route_to_blocked_adapter")
  assert.equal(r.reason, "default_blocked")
})

test("future_live_provider_adapter routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, requestedAdapterId: "future_live_provider_adapter" })
  assert.equal(r.decision, "route_to_blocked_adapter")
  assert.equal(r.reason, "future_live_provider_adapter_blocked")
})

test("unknown runtime adapter id routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, requestedAdapterId: "some_unknown_id" })
  assert.equal(r.decision, "route_to_blocked_adapter")
  assert.equal(r.reason, "unknown_requested_adapter")
})

// ─── Dry-run gate conditions ──────────────────────────────────

test("dry_run without explicit request routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, dryRunExplicitlyRequested: false })
  assert.equal(r.decision, "route_to_blocked_adapter")
  assert.equal(r.reason, "dry_run_not_explicitly_requested")
})

test("dry_run with design gate no_go routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, dryRunDesignDecision: "no_go" })
  assert.equal(r.reason, "dry_run_design_gate_not_go")
  assert.equal(r.selectedAdapterId, B)
})

test("dry_run with design gate conditional_go routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, dryRunDesignDecision: "conditional_go" })
  assert.equal(r.reason, "dry_run_design_gate_not_go")
  assert.equal(r.selectedAdapterId, B)
})

test("dry_run with liveProviderRequested true routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, liveProviderRequested: true })
  assert.equal(r.reason, "live_provider_requested")
  assert.equal(r.selectedAdapterId, B)
})

test("dry_run with externalExecutionRequested true routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, externalExecutionRequested: true })
  assert.equal(r.reason, "external_execution_requested")
  assert.equal(r.selectedAdapterId, B)
})

test("dry_run with approvalCreationRequested true routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, approvalCreationRequested: true })
  assert.equal(r.reason, "approval_creation_requested")
  assert.equal(r.selectedAdapterId, B)
})

test("dry_run with executionCreationRequested true routes to blocked", () => {
  const r = routeProviderAdapter({ ...safe, executionCreationRequested: true })
  assert.equal(r.reason, "execution_creation_requested")
  assert.equal(r.selectedAdapterId, B)
})

// ─── Allowed dry-run route ─────────────────────────────────────

test("safe dry-run request routes to dry_run_provider_adapter", () => {
  const r = routeProviderAdapter(safe)
  assert.equal(r.decision, "route_to_dry_run_adapter")
  assert.equal(r.selectedAdapterId, D)
  assert.equal(r.reason, "dry_run_adapter_allowed")
})

test("selectedAdapterId is dry_run only for safe request", () => {
  assert.equal(routeProviderAdapter(safe).selectedAdapterId, D)
  assert.equal(routeProviderAdapter({ ...safe, liveProviderRequested: true }).selectedAdapterId, B)
})

// ─── False invariants ─────────────────────────────────────────

test("candidateOnly is true for blocked and dry-run", () => {
  assert.equal(routeProviderAdapter(safe).candidateOnly, true)
  assert.equal(routeProviderAdapter({ ...safe, requestedAdapterId: undefined }).candidateOnly, true)
})

test("false flags hold for blocked and dry-run", () => {
  for (const r of [routeProviderAdapter(safe), routeProviderAdapter({ ...safe, requestedAdapterId: undefined })]) {
    assert.equal(r.liveIntegrationAllowed, false)
    assert.equal(r.externalExecutionAllowed, false)
    assert.equal(r.approvalCreationAllowed, false)
    assert.equal(r.executionCreationAllowed, false)
  }
})

// ─── Determinism ──────────────────────────────────────────────

test("output is deterministic", () => {
  assert.deepEqual(routeProviderAdapter(safe), routeProviderAdapter(safe))
})

// ─── Serialized safety ────────────────────────────────────────

test("serialized result has no forbidden fields", () => {
  const s = JSON.stringify(routeProviderAdapter(safe))
  for (const f of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse"]) {
    assert.equal(s.includes(f), false)
  }
  for (const f of ["sk-", "TOKEN", "API_KEY", "Bearer", "SECRET"]) {
    assert.equal(s.includes(f), false)
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

test("source has no production/UI/persistence imports", () => {
  for (const p of ["React", "useState", "useEffect", "Supabase", "D1", "database", "route.ts"]) {
    assert.equal(SRC.includes(p), false, `should not contain ${p}`)
  }
})

test("createSafeDryRunRoutingRequest returns safe default", () => {
  const s = createSafeDryRunRoutingRequest()
  assert.equal(s.requestedAdapterId, "dry_run_provider_adapter")
  assert.equal(s.dryRunExplicitlyRequested, true)
  assert.equal(s.liveProviderRequested, false)
  assert.equal(s.externalExecutionRequested, false)
})
