import test from "node:test"
import assert from "node:assert/strict"
import { assertNoLiveAdapter } from "../app/lib/application/llmProvider/sealedProviderAdapter.ts"

test("assertNoLiveAdapter returns non-null sealed adapter", () => {
  const a = assertNoLiveAdapter()
  assert.ok(a)
  assert.equal(a.capability.adapterId, "no-live-adapter")
  assert.equal(a.capability.features.includes("no-live-adapter"), true)
  assert.equal(a.capability.features.includes("no-sdk"), true)
  assert.equal(a.capability.features.includes("no-network"), true)
  assert.equal(a.capability.features.includes("no-execution"), true)
  assert.equal(a.capability.networkRequired, false)
})

test("sealed adapter run returns blocked for every call", () => {
  const a = assertNoLiveAdapter()
  const r = a.run({ contextPack: { route: "fast_extraction", nodeSummary: "test", constraints: { externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [] } } }, { featureFlagEnabled: true, globalKillSwitchOpen: true, tenantAllowlisted: true, budgetLimitAvailable: true, redactionApplied: true, auditLoggingEnabled: true, p0ScannerEnabled: true, contextAllowlistApplied: true })
  assert.equal(r.ok, false)
  assert.equal(r.blockedReasons?.includes("provider_implementation_missing"), true)
  assert.equal(r.candidateOnly, true)
})

test("sealed adapter source has no SDK or network", () => {
  const src = assertNoLiveAdapter.toString()
  assert.equal(src.includes("openai"), false)
  assert.equal(src.includes("anthropic"), false)
  assert.equal(src.includes("fetch("), false)
  assert.equal(src.includes("process.env"), false)
})

test("sealed adapter is deterministic", () => {
  const a = assertNoLiveAdapter()
  const r1 = a.run({ contextPack: { route: "fast_extraction", nodeSummary: "x", constraints: { externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [] } } }, { featureFlagEnabled: true, globalKillSwitchOpen: true, tenantAllowlisted: true, budgetLimitAvailable: true, redactionApplied: true, auditLoggingEnabled: true, p0ScannerEnabled: true, contextAllowlistApplied: true })
  const r2 = a.run({ contextPack: { route: "fast_extraction", nodeSummary: "x", constraints: { externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [] } } }, { featureFlagEnabled: true, globalKillSwitchOpen: true, tenantAllowlisted: true, budgetLimitAvailable: true, redactionApplied: true, auditLoggingEnabled: true, p0ScannerEnabled: true, contextAllowlistApplied: true })
  assert.deepEqual(r1, r2)
})
