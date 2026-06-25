/**
 * Phase 4G: Candidate-only Context Pack Exclusion Guard
 *
 * Pure guard covering only:
 *   LLMContextPack candidate contract -> Exclusion Guard -> safe Mock Boundary input
 *
 * Does NOT connect to: Source Signal, real LLMContextPack Builder,
 * real Exclusion Scanner, Mock Boundary Harness, adapters, routing,
 * production pipeline, UI, API routes, or persistence.
 *
 * Live Real LLM integration: No-Go
 */

import type { CandidateOnlyMockBoundaryInput } from "./candidateOnlyMockBoundaryHarness.ts"

export type CandidateOnlyContextPackSourceKind =
  | "manual" | "email" | "slack" | "calendar" | "github" | "document" | "unknown"

export type CandidateOnlyExclusionSeverity = "info" | "warn" | "block"

export type CandidateOnlyExclusionFindingCode =
  | "raw_secret" | "api_key" | "token" | "bearer_token"
  | "password" | "private_key" | "raw_signal" | "unsafe_context" | "unknown"

export type CandidateOnlyExclusionFinding = {
  readonly code: CandidateOnlyExclusionFindingCode
  readonly severity: CandidateOnlyExclusionSeverity
  readonly redacted: true
  readonly evidencePreview: "[REDACTED]"
}

export type CandidateOnlyContextPackContract = {
  readonly sanitizedText: string
  readonly sourceKinds: readonly CandidateOnlyContextPackSourceKind[]
  readonly exclusionFindings: readonly CandidateOnlyExclusionFinding[]
  readonly rawSignalIncluded: boolean
  readonly secretsIncluded: boolean
  readonly candidateOnly: true
  readonly maxOutputChars: number
}

export type CandidateOnlyContextPackGuardDecision =
  | "allow_mock_boundary_input"
  | "block_mock_boundary_input"

export type CandidateOnlyContextPackGuardReason =
  | "safe_candidate_only_context_pack"
  | "empty_sanitized_text"
  | "raw_signal_not_allowed"
  | "secrets_not_allowed"
  | "blocking_exclusion_finding"
  | "invalid_max_output_chars"
  | "default_blocked"

export type CandidateOnlyContextPackGuardResult = {
  readonly phase: "phase_4g_candidate_only_context_pack_exclusion_guard"
  readonly flowSegment: "context_pack_contract_to_exclusion_guard_to_mock_boundary_input"
  readonly decision: CandidateOnlyContextPackGuardDecision
  readonly reason: CandidateOnlyContextPackGuardReason
  readonly input?: CandidateOnlyMockBoundaryInput
  readonly candidateOnly: true
  readonly rawSignalIncluded: false
  readonly secretsIncluded: false
  readonly liveIntegrationAllowed: false
  readonly externalExecutionAllowed: false
  readonly approvalCreationAllowed: false
  readonly executionCreationAllowed: false
  readonly productionPipelineConnected: false
  readonly uiConnected: false
  readonly sourceSignalConnected: false
  readonly realContextPackBuilderConnected: false
  readonly realExclusionScannerConnected: false
  readonly decompositionClassifierConnected: false
  readonly decompositionOrchestratorConnected: false
  readonly actionFieldConnected: false
  readonly humanReviewConnected: false
}

const MAX_OUTPUT_CHARS = 1000

const FALSE = {
  candidateOnly: true,
  rawSignalIncluded: false,
  secretsIncluded: false,
  liveIntegrationAllowed: false,
  externalExecutionAllowed: false,
  approvalCreationAllowed: false,
  executionCreationAllowed: false,
  productionPipelineConnected: false,
  uiConnected: false,
  sourceSignalConnected: false,
  realContextPackBuilderConnected: false,
  realExclusionScannerConnected: false,
  decompositionClassifierConnected: false,
  decompositionOrchestratorConnected: false,
  actionFieldConnected: false,
  humanReviewConnected: false,
} as const

function blocked(reason: CandidateOnlyContextPackGuardReason): CandidateOnlyContextPackGuardResult {
  return { ...FALSE, phase: "phase_4g_candidate_only_context_pack_exclusion_guard", flowSegment: "context_pack_contract_to_exclusion_guard_to_mock_boundary_input", decision: "block_mock_boundary_input", reason }
}

export function createSafeCandidateOnlyContextPackContract(): CandidateOnlyContextPackContract {
  return {
    sanitizedText: "Sanitized candidate-only context for mock boundary evaluation.",
    sourceKinds: ["manual"],
    exclusionFindings: [],
    rawSignalIncluded: false,
    secretsIncluded: false,
    candidateOnly: true,
    maxOutputChars: 500,
  }
}

export function guardCandidateOnlyContextPackForMockBoundary(
  contextPack: CandidateOnlyContextPackContract,
): CandidateOnlyContextPackGuardResult {
  if (!contextPack.sanitizedText.trim()) return blocked("empty_sanitized_text")
  if (contextPack.rawSignalIncluded !== false) return blocked("raw_signal_not_allowed")
  if (contextPack.secretsIncluded !== false) return blocked("secrets_not_allowed")
  if (contextPack.exclusionFindings.some((f) => f.severity === "block")) return blocked("blocking_exclusion_finding")

  const maxChars = contextPack.maxOutputChars
  if (!Number.isFinite(maxChars) || maxChars < 1) return blocked("invalid_max_output_chars")

  const clamped = Math.min(Math.floor(maxChars), MAX_OUTPUT_CHARS)
  const srcKinds = contextPack.sourceKinds.join(", ")
  const prompt = `[CONTEXT_PACK_CANDIDATE_ONLY]
Source kinds: ${srcKinds}
Sanitized context:
${contextPack.sanitizedText}

No raw signal included.
No secrets included.
Exclusion findings are redacted.`

  return {
    ...FALSE,
    phase: "phase_4g_candidate_only_context_pack_exclusion_guard",
    flowSegment: "context_pack_contract_to_exclusion_guard_to_mock_boundary_input",
    decision: "allow_mock_boundary_input",
    reason: "safe_candidate_only_context_pack",
    input: { prompt, maxOutputChars: clamped },
  }
}
