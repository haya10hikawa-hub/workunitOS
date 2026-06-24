import test from "node:test"
import assert from "node:assert/strict"
import { FAKE_DRY_RUN_PROVIDER } from "../app/lib/application/llmProvider/fakeDryRunLlmProvider.ts"
import type { LLMContextPack } from "../app/lib/application/llmContext/types.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"

const pack: LLMContextPack = {
  route: "fast_extraction", nodeSummary: "test", constraints: {
    externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [],
  },
}

const ready = { featureFlagEnabled: true, globalKillSwitchOpen: true, tenantAllowlisted: true, budgetLimitAvailable: true, redactionApplied: true, auditLoggingEnabled: true, p0ScannerEnabled: true, contextAllowlistApplied: true }

test("fake dry-run provider is deterministic", () => {
  const a = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, ready, REAL_LLM_PROVIDER_POLICY_REQUIRED)
  const b = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, ready, REAL_LLM_PROVIDER_POLICY_REQUIRED)
  assert.deepEqual(a, b)
})

test("fake dry-run provider returns mode dry_run", () => {
  const r = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, ready, REAL_LLM_PROVIDER_POLICY_REQUIRED)
  assert.equal(r.mode, "dry_run")
})

test("fake dry-run provider capability is deterministic", () => {
  assert.equal(FAKE_DRY_RUN_PROVIDER.capability.deterministic, true)
  assert.equal(FAKE_DRY_RUN_PROVIDER.capability.networkRequired, false)
})

test("fake dry-run provider output cannot create Formal Node", () => {
  const r = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, ready, REAL_LLM_PROVIDER_POLICY_REQUIRED)
  assert.equal(JSON.stringify(r).includes("FormalNode"), false)
  assert.equal(JSON.stringify(r).includes("Approval"), false)
  assert.equal(JSON.stringify(r).includes("Execution"), false)
})

test("fake dry-run provider rejects raw provider payload", () => {
  const r = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack, rawProviderPayload: { dangerous: true } }, ready, REAL_LLM_PROVIDER_POLICY_REQUIRED)
  assert.equal(r.ok, false)
})

test("fake dry-run provider blocks when readiness is no-go", () => {
  const r = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, ready, {})
  assert.equal(r.ok, false)
})

for (const [field] of [["featureFlagEnabled"], ["globalKillSwitchOpen"], ["tenantAllowlisted"], ["budgetLimitAvailable"],
  ["redactionApplied"], ["auditLoggingEnabled"], ["p0ScannerEnabled"], ["contextAllowlistApplied"]] as const) {
  test(`fake dry-run preflight blocks without ${field}`, () => {
    const r = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, { ...ready, [field]: false }, REAL_LLM_PROVIDER_POLICY_REQUIRED)
    assert.equal(r.ok, false)
  })
}

test("fake dry-run provider has no SDK imports", () => {
  const src = FAKE_DRY_RUN_PROVIDER.toString()
  assert.equal(src.includes("openai"), false)
  assert.equal(src.includes("anthropic"), false)
  assert.equal(src.includes("fetch"), false)
})

test("fake dry-run provider output has deterministic metadata", () => {
  const r = FAKE_DRY_RUN_PROVIDER.adapt({ contextPack: pack }, ready, REAL_LLM_PROVIDER_POLICY_REQUIRED)
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.metadata.tokensUsed, 0)
})
