/**
 * Phase 4A: Live Provider Proposal Gate
 *
 * Determines whether a separate future live-provider adapter PR
 * may be opened. Does NOT connect a provider. Does NOT implement
 * a provider adapter.
 *
 * liveIntegrationAllowed, liveProviderAdapterImplemented, and
 * externalExecutionAllowed are always false.
 *
 * Live Real LLM integration: No-Go
 */

export type LiveProviderProposalGateId =
  | "phase_3e_merged" | "phase_3e_scorecard_go"
  | "explicit_owner" | "rollback_plan" | "budget_cap"
  | "rate_limit" | "provider_selected_or_deferred"
  | "secret_injection_policy" | "transport_policy"
  | "redaction_policy" | "offline_fixture_gate"
  | "shadow_harness" | "audit_logging_plan"
  | "kill_switch_required"
  | "no_sdk_current_phase" | "no_network_current_phase"
  | "no_env_secret_current_phase" | "no_external_execution"
  | "candidate_only_output" | "human_approval_required"
  | "separate_future_pr_required"

export type LiveProviderProposalDecision =
  | "no_go"
  | "conditional_go"
  | "go_to_open_separate_future_live_provider_adapter_pr"

export type LiveProviderProposalFinding = {
  readonly id: string
  readonly status: "pass" | "fail" | "warning"
  readonly severity: "p0" | "required"
  readonly reason: string
}

export type LiveProviderProposalGateInput = {
  readonly gates: readonly { readonly id: LiveProviderProposalGateId; readonly status: "pass" | "fail" | "warning"; readonly reason?: string }[]
}

export type LiveProviderProposalGateResult = {
  readonly decision: LiveProviderProposalDecision
  readonly liveIntegrationAllowed: false
  readonly liveProviderAdapterImplemented: false
  readonly externalExecutionAllowed: false
  readonly mayOpenFutureProviderAdapterPr: boolean
  readonly findings: readonly LiveProviderProposalFinding[]
}

// ─── Gate Catalog ─────────────────────────────────────────────

const CATALOG: Record<LiveProviderProposalGateId, { readonly severity: "p0" | "required"; readonly defaultReason: string }> = {
  phase_3e_merged: { severity: "p0", defaultReason: "Phase 3E readiness scorecard merged" },
  phase_3e_scorecard_go: { severity: "p0", defaultReason: "Phase 3E scorecard returns Go" },
  explicit_owner: { severity: "required", defaultReason: "Explicit human owner assigned" },
  rollback_plan: { severity: "required", defaultReason: "Rollback plan exists" },
  budget_cap: { severity: "required", defaultReason: "Budget cap defined" },
  rate_limit: { severity: "required", defaultReason: "Rate limit defined" },
  provider_selected_or_deferred: { severity: "required", defaultReason: "Provider candidate selected or intentionally deferred" },
  secret_injection_policy: { severity: "p0", defaultReason: "Secret injection policy exists" },
  transport_policy: { severity: "p0", defaultReason: "Transport policy exists" },
  redaction_policy: { severity: "p0", defaultReason: "Redaction policy exists" },
  offline_fixture_gate: { severity: "p0", defaultReason: "Offline fixture gate exists" },
  shadow_harness: { severity: "p0", defaultReason: "Shadow harness exists" },
  audit_logging_plan: { severity: "required", defaultReason: "Audit logging plan exists" },
  kill_switch_required: { severity: "p0", defaultReason: "Kill switch required" },
  no_sdk_current_phase: { severity: "p0", defaultReason: "No provider SDK in current phase" },
  no_network_current_phase: { severity: "p0", defaultReason: "No provider network in current phase" },
  no_env_secret_current_phase: { severity: "p0", defaultReason: "No env secret read in current phase" },
  no_external_execution: { severity: "p0", defaultReason: "No external execution" },
  candidate_only_output: { severity: "p0", defaultReason: "Candidate-only output" },
  human_approval_required: { severity: "p0", defaultReason: "Human approval required" },
  separate_future_pr_required: { severity: "p0", defaultReason: "Separate future PR required for adapter implementation" },
}

// ─── Helpers ──────────────────────────────────────────────────

export function createCurrentKnownPassingProposalInput(): LiveProviderProposalGateInput {
  return {
    gates: (Object.keys(CATALOG) as LiveProviderProposalGateId[]).map((id) => ({
      id, status: "pass", reason: CATALOG[id].defaultReason,
    })),
  }
}

// ─── Core Evaluator ──────────────────────────────────────────

export function evaluateLiveProviderProposalGate(
  input: LiveProviderProposalGateInput,
): LiveProviderProposalGateResult {
  const inputMap = new Map(input.gates.map((g) => [g.id, g]))
  const findings: LiveProviderProposalFinding[] = []

  for (const id of Object.keys(CATALOG) as LiveProviderProposalGateId[]) {
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
    return {
      decision: "no_go",
      liveIntegrationAllowed: false, liveProviderAdapterImplemented: false, externalExecutionAllowed: false,
      mayOpenFutureProviderAdapterPr: false, findings,
    }
  }

  if (warnings.length > 0) {
    return {
      decision: "conditional_go",
      liveIntegrationAllowed: false, liveProviderAdapterImplemented: false, externalExecutionAllowed: false,
      mayOpenFutureProviderAdapterPr: false, findings,
    }
  }

  return {
    decision: "go_to_open_separate_future_live_provider_adapter_pr",
    liveIntegrationAllowed: false, liveProviderAdapterImplemented: false, externalExecutionAllowed: false,
    mayOpenFutureProviderAdapterPr: true, findings,
  }
}
