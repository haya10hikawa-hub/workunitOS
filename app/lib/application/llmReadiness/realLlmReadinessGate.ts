import { REQUIRED_FORBIDDEN_MODEL_CONTEXT_FIELDS, type RealLlmProviderBoundaryPolicy } from "./realLlmProviderPolicy.ts"

export type RealLlmReadinessBlocker =
  | "provider_not_disabled_by_default"
  | "feature_flag_missing"
  | "global_kill_switch_missing"
  | "tenant_allowlist_missing"
  | "budget_limit_missing"
  | "redaction_policy_missing"
  | "audit_policy_missing"
  | "p0_exclusion_scanner_missing"
  | "context_field_allowlist_missing"
  | "raw_provider_payload_allowed"
  | "forbidden_context_field_not_blocked"
  | "provider_output_can_create_formal_node"
  | "provider_output_can_create_approval"
  | "provider_output_can_create_execution"
  | "human_review_not_required"
  | "external_execution_not_disabled"

export type RealLlmReadinessResult = {
  readonly go: boolean
  readonly readinessOnly: true
  readonly providerConnected: false
  readonly blockedReasons: readonly RealLlmReadinessBlocker[]
}

export function evaluateRealLlmReadiness(policy: Partial<RealLlmProviderBoundaryPolicy> = {}): RealLlmReadinessResult {
  const merged = { ...defaultNoGoPolicy(), ...policy }
  const blockedReasons = [
    ...requiredBooleanBlockers(merged),
    ...forbiddenContextBlockers(merged),
  ]
  return { go: blockedReasons.length === 0, readinessOnly: true, providerConnected: false, blockedReasons }
}

function defaultNoGoPolicy(): RealLlmProviderBoundaryPolicy {
  return {
    providerDisabledByDefault: false,
    featureFlagRequired: false,
    globalKillSwitchRequired: false,
    tenantAllowlistRequired: false,
    budgetLimitRequired: false,
    redactionRequired: false,
    auditLoggingRequired: false,
    p0ExclusionScannerRequired: false,
    contextFieldAllowlistRequired: false,
    rawProviderPayloadAllowed: true,
    forbiddenContextFields: [],
    providerOutputCanCreateFormalNode: true,
    providerOutputCanCreateApproval: true,
    providerOutputCanCreateExecution: true,
    humanReviewRequired: false,
    externalExecutionDisabled: false,
  }
}

function requiredBooleanBlockers(policy: RealLlmProviderBoundaryPolicy): readonly RealLlmReadinessBlocker[] {
  const blockers: RealLlmReadinessBlocker[] = []
  if (!policy.providerDisabledByDefault) blockers.push("provider_not_disabled_by_default")
  if (!policy.featureFlagRequired) blockers.push("feature_flag_missing")
  if (!policy.globalKillSwitchRequired) blockers.push("global_kill_switch_missing")
  if (!policy.tenantAllowlistRequired) blockers.push("tenant_allowlist_missing")
  if (!policy.budgetLimitRequired) blockers.push("budget_limit_missing")
  if (!policy.redactionRequired) blockers.push("redaction_policy_missing")
  if (!policy.auditLoggingRequired) blockers.push("audit_policy_missing")
  if (!policy.p0ExclusionScannerRequired) blockers.push("p0_exclusion_scanner_missing")
  if (!policy.contextFieldAllowlistRequired) blockers.push("context_field_allowlist_missing")
  if (policy.rawProviderPayloadAllowed) blockers.push("raw_provider_payload_allowed")
  if (policy.providerOutputCanCreateFormalNode) blockers.push("provider_output_can_create_formal_node")
  if (policy.providerOutputCanCreateApproval) blockers.push("provider_output_can_create_approval")
  if (policy.providerOutputCanCreateExecution) blockers.push("provider_output_can_create_execution")
  if (!policy.humanReviewRequired) blockers.push("human_review_not_required")
  if (!policy.externalExecutionDisabled) blockers.push("external_execution_not_disabled")
  return blockers
}

function forbiddenContextBlockers(policy: RealLlmProviderBoundaryPolicy): readonly RealLlmReadinessBlocker[] {
  const fields = Array.isArray(policy.forbiddenContextFields) ? policy.forbiddenContextFields : []
  return REQUIRED_FORBIDDEN_MODEL_CONTEXT_FIELDS.every((field) => fields.includes(field)) ? [] : ["forbidden_context_field_not_blocked"]
}
