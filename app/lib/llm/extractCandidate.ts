/**
 * Candidate Extraction
 *
 * Extracts structured SourceCandidate data from a SanitizedSignal
 * using the LLM provider.
 */

import type { TenantId } from "../tenant/types.ts"
import type { SourceCandidate } from "../domain/types.ts"
import type { LlmProvider, SanitizedSignal, CandidateExtractionOutput, LlmProcessingResult, RiskFlag } from "./types.ts"
import { buildCandidateExtractionPrompt } from "./prompts.ts"
import type { LlmModelRoute } from "./modelRouter.ts"

/**
 * Extract a SourceCandidate from a SanitizedSignal.
 *
 * The LLM output is validated, normalized, and wrapped in a typed result.
 * LLM output is NEVER trusted directly — it is parsed, validated, and scored.
 */
export async function extractSourceCandidate(
  provider: LlmProvider,
  signal: SanitizedSignal,
  tenantId: TenantId,
  options: { modelRoute?: LlmModelRoute } = {},
): Promise<LlmProcessingResult<SourceCandidate>> {
  const warnings: { code: string; message: string; riskFlag?: RiskFlag }[] = []

  if (signal.riskFlags.includes("prompt_injection_detected")) {
    return {
      ok: false,
      error: "unsafe_input",
      warnings: [{ code: "unsafe_input", message: "Prompt injection detected in source content", riskFlag: "prompt_injection_detected" }],
      stage: "extract_candidate",
    }
  }

  const messages = buildCandidateExtractionPrompt(signal.sanitizedContent)

  let response
  try {
    response = await provider.generateJson({
      messages,
      model: options.modelRoute?.model,
      temperature: options.modelRoute?.temperature,
      maxTokens: options.modelRoute?.maxOutputTokens,
      stage: "extract_candidate",
    })
  } catch {
    return { ok: false, error: "invalid_llm_output", warnings, stage: "extract_candidate" }
  }

  const parsed = parseExtractionOutput(response.content, warnings)
  if (!parsed) {
    return { ok: false, error: "invalid_llm_output", warnings, stage: "extract_candidate" }
  }

  const candidate: SourceCandidate = {
    id: `candidate:${signal.id}`,
    tenantId,
    sourceSignalIds: [signal.id],
    sourceType: signal.sourceType,
    extractedSummary: parsed.extractedSummary ?? "Untitled signal",
    detectedActors: parsed.detectedActors?.length ? parsed.detectedActors : ["Unknown"],
    detectedProblem: parsed.detectedProblem ?? undefined,
    detectedDeadline: parsed.detectedDeadline ?? undefined,
    detectedIntent: parsed.detectedIntent ?? undefined,
    confidence: clamp01(parsed.confidence ?? 0.5),
    trustLevel: "sanitized_candidate",
    createdAt: new Date().toISOString(),
  }

  return { ok: true, data: candidate, warnings, stage: "extract_candidate" }
}

function parseExtractionOutput(
  content: string,
  warnings: LlmProcessingResult<unknown>["warnings"],
): CandidateExtractionOutput | null {
  try {
    const raw = JSON.parse(content) as Record<string, unknown>

    // Validate required fields
    if (typeof raw.extractedSummary !== "string" || !raw.extractedSummary.trim()) {
      warnings.push({ code: "missing_summary", message: "LLM did not produce a summary" })
      return null
    }

    return {
      extractedSummary: raw.extractedSummary as string,
      detectedActors: Array.isArray(raw.detectedActors)
        ? raw.detectedActors.filter((a): a is string => typeof a === "string")
        : [],
      detectedProblem: typeof raw.detectedProblem === "string" ? raw.detectedProblem : undefined,
      detectedDeadline: typeof raw.detectedDeadline === "string" ? raw.detectedDeadline : undefined,
      detectedIntent: typeof raw.detectedIntent === "string" ? raw.detectedIntent : undefined,
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
      riskFlags: Array.isArray(raw.riskFlags)
        ? raw.riskFlags.filter((f): f is string => typeof f === "string") as RiskFlag[]
        : [],
    }
  } catch {
    warnings.push({ code: "parse_failed", message: "Failed to parse LLM JSON output" })
    return null
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
