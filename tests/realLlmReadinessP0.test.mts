import test from "node:test"
import assert from "node:assert/strict"
import { evaluateRealLlmReadiness } from "../app/lib/application/llmReadiness/realLlmReadinessGate.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED, REQUIRED_FORBIDDEN_MODEL_CONTEXT_FIELDS, type RealLlmProviderBoundaryPolicy } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"

const readyPolicy: RealLlmProviderBoundaryPolicy = REAL_LLM_PROVIDER_POLICY_REQUIRED

test("raw provider payload permission returns No-Go", () => {
  const result = evaluateRealLlmReadiness({ ...readyPolicy, rawProviderPayloadAllowed: true })
  assert.equal(result.go, false)
  assert.deepEqual(result.blockedReasons, ["raw_provider_payload_allowed"])
})

test("approvalId hash tenantId userId and role must be forbidden in context policy", () => {
  for (const omitted of REQUIRED_FORBIDDEN_MODEL_CONTEXT_FIELDS) {
    const result = evaluateRealLlmReadiness({ ...readyPolicy, forbiddenContextFields: readyPolicy.forbiddenContextFields.filter((field) => field !== omitted) })
    assert.equal(result.go, false)
    assert.equal(result.blockedReasons.includes("forbidden_context_field_not_blocked"), true)
  }
})

test("missing forbidden context field list returns No-Go instead of throwing", () => {
  const result = evaluateRealLlmReadiness({ ...readyPolicy, forbiddenContextFields: undefined })
  assert.equal(result.go, false)
  assert.equal(result.blockedReasons.includes("forbidden_context_field_not_blocked"), true)
})

test("partial policy missing required safety fields remains No-Go", () => {
  const result = evaluateRealLlmReadiness({
    featureFlagRequired: true,
    globalKillSwitchRequired: true,
    tenantAllowlistRequired: true,
    budgetLimitRequired: true,
    redactionRequired: true,
    auditLoggingRequired: true,
    p0ExclusionScannerRequired: true,
    contextFieldAllowlistRequired: true,
  })
  assert.equal(result.go, false)
  assert.equal(result.blockedReasons.includes("provider_not_disabled_by_default"), true)
  assert.equal(result.blockedReasons.includes("forbidden_context_field_not_blocked"), true)
  assert.equal(result.blockedReasons.includes("human_review_not_required"), true)
  assert.equal(result.blockedReasons.includes("external_execution_not_disabled"), true)
})

test("provider output cannot create Approval Execution or Formal Node", () => {
  const cases: readonly Partial<RealLlmProviderBoundaryPolicy>[] = [
    { providerOutputCanCreateApproval: true },
    { providerOutputCanCreateExecution: true },
    { providerOutputCanCreateFormalNode: true },
  ]
  for (const policy of cases) assert.equal(evaluateRealLlmReadiness({ ...readyPolicy, ...policy }).go, false)
})

test("human review and external execution blocks remain required", () => {
  const noReview = evaluateRealLlmReadiness({ ...readyPolicy, humanReviewRequired: false })
  const executionEnabled = evaluateRealLlmReadiness({ ...readyPolicy, externalExecutionDisabled: false })
  assert.equal(noReview.blockedReasons.includes("human_review_not_required"), true)
  assert.equal(executionEnabled.blockedReasons.includes("external_execution_not_disabled"), true)
})
