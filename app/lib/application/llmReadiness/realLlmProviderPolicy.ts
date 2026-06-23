export type ForbiddenModelContextField = "approvalId" | "targetHash" | "payloadHash" | "tenantId" | "userId" | "role"

export type RealLlmProviderBoundaryPolicy = {
  readonly providerDisabledByDefault: boolean
  readonly featureFlagRequired: boolean
  readonly globalKillSwitchRequired: boolean
  readonly tenantAllowlistRequired: boolean
  readonly budgetLimitRequired: boolean
  readonly redactionRequired: boolean
  readonly auditLoggingRequired: boolean
  readonly p0ExclusionScannerRequired: boolean
  readonly contextFieldAllowlistRequired: boolean
  readonly rawProviderPayloadAllowed: boolean
  readonly forbiddenContextFields: readonly ForbiddenModelContextField[]
  readonly providerOutputCanCreateFormalNode: boolean
  readonly providerOutputCanCreateApproval: boolean
  readonly providerOutputCanCreateExecution: boolean
  readonly humanReviewRequired: boolean
  readonly externalExecutionDisabled: boolean
}

export const REQUIRED_FORBIDDEN_MODEL_CONTEXT_FIELDS: readonly ForbiddenModelContextField[] = ["approvalId", "targetHash", "payloadHash", "tenantId", "userId", "role"]

export const REAL_LLM_PROVIDER_POLICY_REQUIRED: RealLlmProviderBoundaryPolicy = {
  providerDisabledByDefault: true,
  featureFlagRequired: true,
  globalKillSwitchRequired: true,
  tenantAllowlistRequired: true,
  budgetLimitRequired: true,
  redactionRequired: true,
  auditLoggingRequired: true,
  p0ExclusionScannerRequired: true,
  contextFieldAllowlistRequired: true,
  rawProviderPayloadAllowed: false,
  forbiddenContextFields: REQUIRED_FORBIDDEN_MODEL_CONTEXT_FIELDS,
  providerOutputCanCreateFormalNode: false,
  providerOutputCanCreateApproval: false,
  providerOutputCanCreateExecution: false,
  humanReviewRequired: true,
  externalExecutionDisabled: true,
}
