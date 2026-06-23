import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { evaluateRealLlmReadiness } from "../app/lib/application/llmReadiness/realLlmReadinessGate.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED, type RealLlmProviderBoundaryPolicy } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"

const readyPolicy: RealLlmProviderBoundaryPolicy = REAL_LLM_PROVIDER_POLICY_REQUIRED

test("readiness gate defaults to No-Go", () => {
  const result = evaluateRealLlmReadiness()
  assert.equal(result.go, false)
  assert.equal(result.providerConnected, false)
  assert.equal(result.readinessOnly, true)
})

for (const [field, reason] of [
  ["featureFlagRequired", "feature_flag_missing"],
  ["globalKillSwitchRequired", "global_kill_switch_missing"],
  ["tenantAllowlistRequired", "tenant_allowlist_missing"],
  ["budgetLimitRequired", "budget_limit_missing"],
  ["redactionRequired", "redaction_policy_missing"],
  ["auditLoggingRequired", "audit_policy_missing"],
  ["p0ExclusionScannerRequired", "p0_exclusion_scanner_missing"],
  ["contextFieldAllowlistRequired", "context_field_allowlist_missing"],
] as const) {
  test(`missing ${field} returns No-Go`, () => {
    const result = evaluateRealLlmReadiness({ ...readyPolicy, [field]: false })
    assert.equal(result.go, false)
    assert.equal(result.blockedReasons.includes(reason), true)
  })
}

test("all requirements satisfied returns readiness-only Go", () => {
  const result = evaluateRealLlmReadiness(readyPolicy)
  assert.deepEqual(result, { go: true, readinessOnly: true, providerConnected: false, blockedReasons: [] })
})

test("readiness gate source has no live provider API dependency", async () => {
  const source = await readFile("app/lib/application/llmReadiness/realLlmReadinessGate.ts", "utf8")
  for (const forbidden of ["fetch(", "API_KEY", "secret", "/api/", "/persistence/", "supabase"]) {
    assert.equal(source.includes(forbidden), false)
  }
})
