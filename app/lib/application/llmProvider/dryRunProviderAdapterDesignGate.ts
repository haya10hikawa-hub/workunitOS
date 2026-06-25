/**
 * Phase 4C: Dry-run Provider Adapter Design Gate
 *
 * Determines whether a future dry-run provider adapter PR
 * may be opened. Does NOT implement a provider adapter.
 * Does NOT connect a live provider.
 *
 * Live Real LLM integration: No-Go
 * External execution: No-Go
 * UI connection: No-Go
 */

export type DryRunProviderDesignGateId =
  | "phase_4b_boundary_merged" | "blocked_adapter_available"
  | "candidate_only_contract" | "no_live_provider_call"
  | "no_provider_sdk" | "no_fetch" | "no_process_env"
  | "no_api_key_material" | "no_provider_endpoint"
  | "no_approval_creation" | "no_execution_creation"
  | "no_external_execution" | "redaction_policy_defined"
  | "budget_cap_defined" | "rate_limit_defined"
  | "timeout_policy_defined" | "retry_policy_defined"
  | "audit_logging_plan_defined" | "kill_switch_required"
  | "rollback_plan_defined" | "separate_future_pr_required"

export type DryRunProviderDesignDecision =
  | "no_go"
  | "conditional_go"
  | "go_to_open_dry_run_adapter_pr"

export type DryRunProviderDesignGateFinding = {
  readonly id: string
  readonly status: "pass" | "fail" | "warning"
  readonly severity: "p0" | "required"
  readonly reason: string
}

export type DryRunProviderDesignGateInput = {
  readonly gates: readonly { readonly id: DryRunProviderDesignGateId; readonly status: "pass" | "fail" | "warning"; readonly reason?: string }[]
}

export type DryRunProviderDesignGateResult = {
  readonly decision: DryRunProviderDesignDecision
  readonly mayOpenDryRunAdapterPr: boolean
  readonly liveIntegrationAllowed: false
  readonly providerAdapterImplemented: false
  readonly externalExecutionAllowed: false
  readonly approvalCreationAllowed: false
  readonly executionCreationAllowed: false
  readonly candidateOnly: true
  readonly findings: readonly DryRunProviderDesignGateFinding[]
}

const CATALOG: Record<DryRunProviderDesignGateId, { readonly severity: "p0" | "required"; readonly defaultReason: string }> = {
  phase_4b_boundary_merged: { severity: "p0", defaultReason: "Phase 4B provider adapter boundary merged" },
  blocked_adapter_available: { severity: "p0", defaultReason: "Blocked provider adapter available" },
  candidate_only_contract: { severity: "p0", defaultReason: "Candidate-only output contract defined" },
  no_live_provider_call: { severity: "p0", defaultReason: "No live provider calls in current phase" },
  no_provider_sdk: { severity: "p0", defaultReason: "No provider SDK imported" },
  no_fetch: { severity: "p0", defaultReason: "No fetch calls in adapter-related code" },
  no_process_env: { severity: "p0", defaultReason: "No process.env reads in adapter-related code" },
  no_api_key_material: { severity: "p0", defaultReason: "No API key or secret material" },
  no_provider_endpoint: { severity: "p0", defaultReason: "No provider endpoint configured" },
  no_approval_creation: { severity: "p0", defaultReason: "No approval creation by adapter" },
  no_execution_creation: { severity: "p0", defaultReason: "No execution creation by adapter" },
  no_external_execution: { severity: "p0", defaultReason: "No external execution" },
  redaction_policy_defined: { severity: "required", defaultReason: "Redaction policy defined" },
  budget_cap_defined: { severity: "required", defaultReason: "Budget cap defined" },
  rate_limit_defined: { severity: "required", defaultReason: "Rate limit defined" },
  timeout_policy_defined: { severity: "required", defaultReason: "Timeout policy defined" },
  retry_policy_defined: { severity: "required", defaultReason: "Retry policy defined" },
  audit_logging_plan_defined: { severity: "required", defaultReason: "Audit logging plan defined" },
  kill_switch_required: { severity: "p0", defaultReason: "Kill switch required" },
  rollback_plan_defined: { severity: "required", defaultReason: "Rollback plan defined" },
  separate_future_pr_required: { severity: "p0", defaultReason: "Separate future PR required for implementation" },
}

const FA = { liveIntegrationAllowed: false, providerAdapterImplemented: false, externalExecutionAllowed: false, approvalCreationAllowed: false, executionCreationAllowed: false, candidateOnly: true } as const

export function createCurrentKnownPassingDryRunProviderDesignInput(): DryRunProviderDesignGateInput {
  return {
    gates: (Object.keys(CATALOG) as DryRunProviderDesignGateId[]).map((id) => ({ id, status: "pass", reason: CATALOG[id].defaultReason })),
  }
}

export function evaluateDryRunProviderDesignGate(
  input: DryRunProviderDesignGateInput,
): DryRunProviderDesignGateResult {
  const inputMap = new Map(input.gates.map((g) => [g.id, g]))
  const findings: DryRunProviderDesignGateFinding[] = []

  for (const id of Object.keys(CATALOG) as DryRunProviderDesignGateId[]) {
    const meta = CATALOG[id]
    const gate = inputMap.get(id)
    if (!gate) {
      findings.push({ id, status: "fail", severity: meta.severity, reason: `Missing: ${meta.defaultReason}` })
    } else {
      findings.push({ id, status: gate.status, severity: meta.severity, reason: gate.reason ?? meta.defaultReason })
    }
  }

  const p0Fails = findings.filter((f) => f.severity === "p0" && f.status === "fail")
  const reqFails = findings.filter((f) => f.severity === "required" && f.status === "fail")
  const warnings = findings.filter((f) => f.status === "warning")

  if (p0Fails.length > 0 || reqFails.length > 0) {
    return { ...FA, decision: "no_go", mayOpenDryRunAdapterPr: false, findings }
  }
  if (warnings.length > 0) {
    return { ...FA, decision: "conditional_go", mayOpenDryRunAdapterPr: false, findings }
  }
  return { ...FA, decision: "go_to_open_dry_run_adapter_pr", mayOpenDryRunAdapterPr: true, findings }
}
