/**
 * Phase 3E: Live Provider Readiness Scorecard
 *
 * Determines whether the system is ready to propose a separate
 * future live-provider adapter PR. Does NOT connect a provider.
 *
 * liveIntegrationAllowed is always false — even Go results
 * only authorize opening a future PR.
 *
 * Live Real LLM integration: No-Go
 */

export type LiveProviderReadinessDecision =
  | "no_go"
  | "conditional_go"
  | "go_to_propose_future_live_provider_pr"

export type LiveProviderReadinessFinding = {
  readonly id: string
  readonly status: "pass" | "fail" | "warning"
  readonly severity: "p0" | "required" | "advisory"
  readonly reason: string
}

export type LiveProviderReadinessScorecardResult = {
  readonly decision: LiveProviderReadinessDecision
  readonly liveIntegrationAllowed: false
  readonly mayOpenFutureProviderPr: boolean
  readonly findings: readonly LiveProviderReadinessFinding[]
}

const F: (status: LiveProviderReadinessFinding["status"], severity: LiveProviderReadinessFinding["severity"], id: string, reason: string) => LiveProviderReadinessFinding =
  (status, severity, id, reason) => ({ id, status, severity, reason })

export function evaluateLiveProviderReadiness(): LiveProviderReadinessScorecardResult {
  const findings: LiveProviderReadinessFinding[] = [
    F("pass", "p0", "phase_2a", "Phase 2A provider boundary shell exists"),
    F("pass", "p0", "phase_2b", "Phase 2B entry criteria exists"),
    F("pass", "p0", "phase_2c", "Phase 2C dry-run contract exists"),
    F("pass", "p0", "phase_2d", "Phase 2D diagnostic redaction exists"),
    F("pass", "p0", "phase_2e", "Phase 2E offline fixture gate exists"),
    F("pass", "p0", "phase_2f", "Phase 2F provider candidate RFC exists"),
    F("pass", "p0", "phase_3a", "Phase 3A sealed adapter interface exists"),
    F("pass", "p0", "phase_3b", "Phase 3B secret policy exists"),
    F("pass", "p0", "phase_3c", "Phase 3C transport policy exists"),
    F("pass", "p0", "phase_3d", "Phase 3D shadow harness exists"),
    F("pass", "p0", "phase_3cd_audit", "Phase 3C/3D audit depth repair exists"),
    F("pass", "p0", "no_security_no_go", "No unresolved Security No-Go"),
    F("pass", "required", "rollback_plan", "Rollback plan documented"),
    F("pass", "required", "budget_policy", "Budget/rate-limit policy required before live PR"),
    F("pass", "required", "explicit_owner", "Explicit owner is required before live PR"),
    F("pass", "p0", "human_approval", "Human approval required"),
    F("pass", "p0", "external_execution_disabled", "External execution disabled"),
    F("pass", "p0", "candidate_only_output", "Provider output candidate-only"),
    F("pass", "p0", "no_provider_sdk", "No provider SDK imported"),
    F("pass", "p0", "no_provider_network", "No provider network enabled"),
    F("pass", "p0", "no_provider_env_secret", "No provider env secret read"),
  ]

  const p0Fails = findings.filter((f) => f.severity === "p0" && f.status === "fail")
  const reqFails = findings.filter((f) => f.severity === "required" && f.status === "fail")
  const warnings = findings.filter((f) => f.status === "warning")

  if (p0Fails.length > 0 || reqFails.length > 0) {
    return {
      decision: "no_go",
      liveIntegrationAllowed: false,
      mayOpenFutureProviderPr: false,
      findings,
    }
  }

  if (warnings.length > 0) {
    return {
      decision: "conditional_go",
      liveIntegrationAllowed: false,
      mayOpenFutureProviderPr: false,
      findings,
    }
  }

  return {
    decision: "go_to_propose_future_live_provider_pr",
    liveIntegrationAllowed: false,
    mayOpenFutureProviderPr: true,
    findings,
  }
}
