/**
 * LLM Processing Pipeline Types
 *
 * Defines the type system for the LLM data processing pipeline:
 *   ExternalSignal → SanitizedSignal → SourceCandidate → WorkUnitDraft
 *
 * LLM output is NEVER trusted as authority. Every output must be validated.
 */

import type { TenantId } from "../tenant/types.ts"
import type { SourceType } from "../domain/types.ts"

// ─── Pipeline Stages ────────────────────────────────────────────

export type LlmProcessingStage =
  | "sanitize_signal"
  | "extract_candidate"
  | "generate_workunit_draft"
  | "evaluate_workunit"
  | "generate_action_preview"

// ─── LLM Provider ───────────────────────────────────────────────

export type LlmProviderKind = "mock" | "openai" | "deepseek" | "anthropic"

export type LlmMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type LlmRequest = {
  messages: LlmMessage[]
  model?: string
  maxTokens?: number
  temperature?: number
  stage: LlmProcessingStage
}

export type LlmResponse = {
  content: string
  finishReason: "stop" | "length" | "error"
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface LlmProvider {
  generateJson(request: LlmRequest): Promise<LlmResponse>
}

// ─── Risk Flags ──────────────────────────────────────────────────

export type RiskFlag =
  | "prompt_injection_detected"
  | "source_content_includes_instruction"
  | "raw_body_present"
  | "hallucinated_field_detected"
  | "missing_source_evidence"
  | "input_too_long"
  | "unexpected_output_structure"
  | "sensitive_data_detected"

// ─── LLM Warnings ────────────────────────────────────────────────

export type LlmWarning = {
  code: string
  message: string
  riskFlag?: RiskFlag
  field?: string
}

// ─── Pipeline Result ─────────────────────────────────────────────

export type LlmProcessingResult<T> =
  | { ok: true; data: T; warnings: LlmWarning[]; stage: LlmProcessingStage }
  | { ok: false; error: "invalid_llm_output" | "unsafe_input" | "token_budget_exceeded"; warnings: LlmWarning[]; stage: LlmProcessingStage }

// ─── Sanitized Signal ────────────────────────────────────────────

export type SanitizedSignal = {
  id: string
  tenantId: TenantId
  sourceType: SourceType
  originalLength: number
  truncatedLength: number
  wasTruncated: boolean
  sanitizedContent: string
  riskFlags: RiskFlag[]
  metadata: {
    title?: string
    actor?: string
    timestamp?: string
    labels?: string[]
  }
}

// ─── Candidate Extraction ────────────────────────────────────────

export type CandidateExtractionOutput = {
  extractedSummary: string
  detectedActors: string[]
  detectedProblem?: string
  detectedDeadline?: string
  detectedIntent?: string
  confidence: number
  riskFlags: RiskFlag[]
}

// ─── WorkUnit Draft Generation ───────────────────────────────────

export type WorkUnitDraftGenerationOutput = {
  title: string
  situation: string
  problem: string
  actors: string[]
  nextAction: string
  tasks: string[]
  missingFields: string[]
  suggestedImpact: number
  suggestedUrgency: number
  suggestedEffort: number
  suggestedActorWeight: number
  riskFlags: RiskFlag[]
}

// ─── WorkUnit Evaluation ─────────────────────────────────────────

export type WorkUnitEvaluationResult = {
  isExecutable: boolean
  isComplete: boolean
  missingFields: string[]
  warnings: string[]
  hallucinationRisk: "none" | "low" | "medium" | "high"
  suggestedNextStep: string
}

// ─── Priority Scoring ────────────────────────────────────────────

export type ScoreInput = {
  impact: number     // 1-5
  urgency: number    // 1-5
  actorWeight: number // 1-5
  effort: number     // 1-5 (minimum 1)
}

export type ScoreResult = {
  priorityScore: number
  impact: number
  urgency: number
  actorWeight: number
  effort: number
  formula: string
}
