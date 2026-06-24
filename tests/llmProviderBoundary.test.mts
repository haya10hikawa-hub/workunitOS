import test from "node:test"
import assert from "node:assert/strict"
import { runGuardedLlmProvider } from "../app/lib/application/llmProvider/guardedLlmProvider.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"
import type { LLMContextPack } from "../app/lib/application/llmContext/types.ts"

const contextPack: LLMContextPack = {
  route: "fast_extraction",
  nodeSummary: "Summarize safe node candidate",
  constraints: { externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [] },
}

const readyControls = {
  featureFlagEnabled: true,
  globalKillSwitchOpen: true,
  tenantAllowlisted: true,
  budgetLimitAvailable: true,
  redactionApplied: true,
  auditLoggingEnabled: true,
  p0ScannerEnabled: true,
  contextAllowlistApplied: true,
}

test("disabled provider remains default even when readiness and controls pass", () => {
  const result = runGuardedLlmProvider({ request: { contextPack }, controls: readyControls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  assert.equal(result.ok, false)
  assert.equal(result.provider.providerConnected, false)
  assert.deepEqual(result.blockedReasons, ["provider_implementation_missing"])
})

test("blocks without readiness Go", () => {
  const result = runGuardedLlmProvider({ request: { contextPack }, controls: readyControls, policy: {} })
  assert.equal(result.blockedReasons.includes("readiness_gate_no_go"), true)
  assert.equal(result.providerConnected, false)
})

for (const [field, reason] of [
  ["featureFlagEnabled", "feature_flag_disabled"],
  ["globalKillSwitchOpen", "global_kill_switch_closed"],
  ["tenantAllowlisted", "tenant_not_allowlisted"],
  ["budgetLimitAvailable", "budget_limit_unavailable"],
  ["redactionApplied", "redaction_not_applied"],
  ["auditLoggingEnabled", "audit_logging_disabled"],
  ["p0ScannerEnabled", "p0_scanner_disabled"],
  ["contextAllowlistApplied", "context_allowlist_not_applied"],
] as const) {
  test(`blocks when ${field} is missing`, () => {
    const result = runGuardedLlmProvider({ request: { contextPack }, controls: { ...readyControls, [field]: false }, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
    assert.equal(result.blockedReasons.includes(reason), true)
  })
}
