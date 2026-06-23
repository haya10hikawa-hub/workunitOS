import { scanLlmContextExclusions, type ForbiddenContextFinding } from "../llmContext/exclusionScanner.ts"
import type { LLMContextPack } from "../llmContext/types.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED, type RealLlmProviderBoundaryPolicy } from "../llmReadiness/realLlmProviderPolicy.ts"
import { evaluateRealLlmReadiness, type RealLlmReadinessBlocker } from "../llmReadiness/realLlmReadinessGate.ts"

type ProviderBoundaryFinding = Omit<ForbiddenContextFinding, "valuePreview">

export type LlmProviderBoundaryBlocker =
  | "readiness_gate_no_go"
  | "feature_flag_disabled"
  | "global_kill_switch_closed"
  | "tenant_not_allowlisted"
  | "budget_limit_unavailable"
  | "redaction_not_applied"
  | "audit_logging_disabled"
  | "p0_scanner_disabled"
  | "context_allowlist_not_applied"
  | "forbidden_context"
  | "context_key_not_allowlisted"
  | "raw_provider_payload_forbidden"
  | "provider_implementation_missing"

export type SanitizedLlmProviderRequest = {
  readonly contextPack: LLMContextPack
  readonly rawProviderPayload?: unknown
}

export type LlmProviderRuntimeControls = {
  readonly featureFlagEnabled: boolean
  readonly globalKillSwitchOpen: boolean
  readonly tenantAllowlisted: boolean
  readonly budgetLimitAvailable: boolean
  readonly redactionApplied: boolean
  readonly auditLoggingEnabled: boolean
  readonly p0ScannerEnabled: boolean
  readonly contextAllowlistApplied: boolean
}

export type LlmProviderBoundaryInput = {
  readonly request: SanitizedLlmProviderRequest
  readonly controls: LlmProviderRuntimeControls
  readonly policy?: Partial<RealLlmProviderBoundaryPolicy>
}

export type LlmProviderBoundaryResult = {
  readonly ok: false
  readonly phase: "provider_boundary"
  readonly providerConnected: false
  readonly candidateOnly: true
  readonly blockedReasons: readonly LlmProviderBoundaryBlocker[]
  readonly readinessBlockedReasons?: readonly RealLlmReadinessBlocker[]
  readonly findings?: readonly ProviderBoundaryFinding[]
}

export function evaluateLlmProviderBoundary(input: LlmProviderBoundaryInput): LlmProviderBoundaryResult {
  const readiness = evaluateRealLlmReadiness(input.policy ?? REAL_LLM_PROVIDER_POLICY_REQUIRED)
  const blockedReasons: LlmProviderBoundaryBlocker[] = []
  if (!readiness.go) blockedReasons.push("readiness_gate_no_go")
  blockedReasons.push(...runtimeControlBlockers(input.controls))
  if (input.request.rawProviderPayload !== undefined) blockedReasons.push("raw_provider_payload_forbidden")
  const allowlistFindings = findNonAllowlistedContextKeys(input.request.contextPack)
  if (allowlistFindings.length > 0) blockedReasons.push("context_key_not_allowlisted")
  const scan = scanLlmContextExclusions(input.request.contextPack)
  if (!scan.ok) blockedReasons.push("forbidden_context")
  if (blockedReasons.length === 0) blockedReasons.push("provider_implementation_missing")
  return {
    ok: false,
    phase: "provider_boundary",
    providerConnected: false,
    candidateOnly: true,
    blockedReasons,
    readinessBlockedReasons: readiness.go ? undefined : readiness.blockedReasons,
    findings: [...allowlistFindings, ...scan.findings.map(redactFinding)].length > 0 ? [...allowlistFindings, ...scan.findings.map(redactFinding)] : undefined,
  }
}

function findNonAllowlistedContextKeys(pack: LLMContextPack): readonly ProviderBoundaryFinding[] {
  const findings: ProviderBoundaryFinding[] = []
  const record = pack as unknown as Record<string, unknown>
  const allowedTopLevel = new Set(["route", "nodeSummary", "sourceSummary", "doneConditionSummary", "missingFields", "evidenceSummaries", "relatedCandidateSummaries", "constraints"])
  for (const key of Object.keys(record)) {
    if (!allowedTopLevel.has(key)) findings.push({ path: `$.${key}`, key, reason: "forbidden_key" })
  }
  if (!["fast_extraction", "draft_generation", "critic_verification", "deep_reasoning"].includes(String(record.route))) {
    findings.push({ path: "$.route", key: "route", reason: "forbidden_value" })
  }
  if (typeof record.nodeSummary !== "string") {
    findings.push({ path: "$.nodeSummary", key: "nodeSummary", reason: "forbidden_value" })
  }
  for (const key of ["route", "nodeSummary", "sourceSummary", "doneConditionSummary"] as const) {
    if (record[key] !== undefined && typeof record[key] !== "string") findings.push({ path: `$.${key}`, key, reason: "forbidden_value" })
  }
  for (const key of ["missingFields", "evidenceSummaries", "relatedCandidateSummaries"] as const) {
    if (record[key] !== undefined && !isStringArray(record[key])) findings.push({ path: `$.${key}`, key, reason: "forbidden_value" })
  }
  findings.push(...constraintFindings(record.constraints))
  return findings
}

function constraintFindings(value: unknown): readonly ProviderBoundaryFinding[] {
  if (!isRecord(value)) return [{ path: "$.constraints", key: "constraints", reason: "forbidden_value" }]
  const findings: ProviderBoundaryFinding[] = []
  const allowed = new Set(["externalExecutionBlocked", "approvalRequired", "humanReviewRequired", "forbiddenActions"])
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) findings.push({ path: `$.constraints.${key}`, key, reason: "forbidden_key" })
  }
  for (const key of ["externalExecutionBlocked", "approvalRequired", "humanReviewRequired"] as const) {
    if (value[key] !== true) findings.push({ path: `$.constraints.${key}`, key, reason: "forbidden_value" })
  }
  if (!isStringArray(value.forbiddenActions)) findings.push({ path: "$.constraints.forbiddenActions", key: "forbiddenActions", reason: "forbidden_value" })
  return findings
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function redactFinding(finding: ForbiddenContextFinding): ProviderBoundaryFinding {
  return { path: finding.path, key: finding.key, reason: finding.reason }
}

function runtimeControlBlockers(controls: LlmProviderRuntimeControls): readonly LlmProviderBoundaryBlocker[] {
  const blockers: LlmProviderBoundaryBlocker[] = []
  if (!controls.featureFlagEnabled) blockers.push("feature_flag_disabled")
  if (!controls.globalKillSwitchOpen) blockers.push("global_kill_switch_closed")
  if (!controls.tenantAllowlisted) blockers.push("tenant_not_allowlisted")
  if (!controls.budgetLimitAvailable) blockers.push("budget_limit_unavailable")
  if (!controls.redactionApplied) blockers.push("redaction_not_applied")
  if (!controls.auditLoggingEnabled) blockers.push("audit_logging_disabled")
  if (!controls.p0ScannerEnabled) blockers.push("p0_scanner_disabled")
  if (!controls.contextAllowlistApplied) blockers.push("context_allowlist_not_applied")
  return blockers
}
