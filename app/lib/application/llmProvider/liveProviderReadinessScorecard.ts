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

export type LiveProviderReadinessGateId =
  | "phase_2a" | "phase_2b" | "phase_2c" | "phase_2d" | "phase_2e"
  | "phase_2f" | "phase_3a" | "phase_3b" | "phase_3c" | "phase_3d"
  | "phase_3cd_audit" | "no_security_no_go"
  | "rollback_plan" | "budget_policy" | "explicit_owner"
  | "human_approval" | "external_execution_disabled"
  | "candidate_only_output" | "no_provider_sdk"
  | "no_provider_network" | "no_provider_env_secret"

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

export type LiveProviderReadinessGateInput = {
  readonly id: LiveProviderReadinessGateId
  readonly status: "pass" | "fail" | "warning"
  readonly reason?: string
}

export type LiveProviderReadinessScorecardInput = {
  readonly gates: readonly LiveProviderReadinessGateInput[]
}

export type LiveProviderReadinessScorecardResult = {
  readonly decision: LiveProviderReadinessDecision
  readonly liveIntegrationAllowed: false
  readonly mayOpenFutureProviderPr: boolean
  readonly findings: readonly LiveProviderReadinessFinding[]
}

// ─── Gate Catalog ─────────────────────────────────────────────

type GateMeta = { readonly severity: "p0" | "required"; readonly defaultReason: string }

const GATE_CATALOG: Record<LiveProviderReadinessGateId, GateMeta> = {
  phase_2a: { severity: "p0", defaultReason: "Phase 2A provider boundary shell exists" },
  phase_2b: { severity: "p0", defaultReason: "Phase 2B entry criteria exists" },
  phase_2c: { severity: "p0", defaultReason: "Phase 2C dry-run contract exists" },
  phase_2d: { severity: "p0", defaultReason: "Phase 2D diagnostic redaction exists" },
  phase_2e: { severity: "p0", defaultReason: "Phase 2E offline fixture gate exists" },
  phase_2f: { severity: "p0", defaultReason: "Phase 2F provider candidate RFC exists" },
  phase_3a: { severity: "p0", defaultReason: "Phase 3A sealed adapter interface exists" },
  phase_3b: { severity: "p0", defaultReason: "Phase 3B secret policy exists" },
  phase_3c: { severity: "p0", defaultReason: "Phase 3C transport policy exists" },
  phase_3d: { severity: "p0", defaultReason: "Phase 3D shadow harness exists" },
  phase_3cd_audit: { severity: "p0", defaultReason: "Phase 3C/3D audit depth repair exists" },
  no_security_no_go: { severity: "p0", defaultReason: "No unresolved Security No-Go" },
  rollback_plan: { severity: "required", defaultReason: "Rollback plan documented" },
  budget_policy: { severity: "required", defaultReason: "Budget/rate-limit policy required before live PR" },
  explicit_owner: { severity: "required", defaultReason: "Explicit owner is required before live PR" },
  human_approval: { severity: "p0", defaultReason: "Human approval required" },
  external_execution_disabled: { severity: "p0", defaultReason: "External execution disabled" },
  candidate_only_output: { severity: "p0", defaultReason: "Provider output candidate-only" },
  no_provider_sdk: { severity: "p0", defaultReason: "No provider SDK imported" },
  no_provider_network: { severity: "p0", defaultReason: "No provider network enabled" },
  no_provider_env_secret: { severity: "p0", defaultReason: "No provider env secret read" },
}

// ─── Helpers ──────────────────────────────────────────────────

/** Returns all-pass input representing the current audited known state. */
export function createCurrentKnownPassingReadinessInput(): LiveProviderReadinessScorecardInput {
  const gates: LiveProviderReadinessGateInput[] = (Object.keys(GATE_CATALOG) as LiveProviderReadinessGateId[])
    .map((id) => ({ id, status: "pass", reason: GATE_CATALOG[id].defaultReason }))
  return { gates }
}

// ─── Core Evaluator ──────────────────────────────────────────

export function evaluateLiveProviderReadiness(
  input: LiveProviderReadinessScorecardInput,
): LiveProviderReadinessScorecardResult {
  const inputMap = new Map(input.gates.map((g) => [g.id, g]))

  const findings: LiveProviderReadinessFinding[] = []
  let missingCatalog = 0

  for (const id of Object.keys(GATE_CATALOG) as LiveProviderReadinessGateId[]) {
    const meta = GATE_CATALOG[id]
    const gate = inputMap.get(id)
    if (!gate) {
      findings.push({ id, status: "fail", severity: meta.severity, reason: `Missing gate: ${meta.defaultReason}` })
      missingCatalog++
    } else {
      findings.push({ id, status: gate.status, severity: meta.severity, reason: gate.reason ?? meta.defaultReason })
    }
  }

  const p0Fails = findings.filter((f) => f.severity === "p0" && f.status === "fail")
  const reqFails = findings.filter((f) => f.severity === "required" && f.status === "fail")
  const warnings = findings.filter((f) => f.status === "warning")

  if (p0Fails.length > 0 || reqFails.length > 0 || missingCatalog > 0) {
    return { decision: "no_go", liveIntegrationAllowed: false, mayOpenFutureProviderPr: false, findings }
  }

  if (warnings.length > 0) {
    return { decision: "conditional_go", liveIntegrationAllowed: false, mayOpenFutureProviderPr: false, findings }
  }

  return { decision: "go_to_propose_future_live_provider_pr", liveIntegrationAllowed: false, mayOpenFutureProviderPr: true, findings }
}
