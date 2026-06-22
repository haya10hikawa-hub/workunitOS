import type { LLMContextPack } from "../llmContext/types.ts"
import { scanLlmContextExclusions } from "../llmContext/exclusionScanner.ts"

export type MockDecompositionLlmInput = {
  readonly contextPack: LLMContextPack
}

export type MockDecompositionLlm = {
  readonly kind: "mock"
  readonly generate: (input: MockDecompositionLlmInput) => unknown
}

export type MockDecompositionLlmOutput = {
  readonly text: string
  readonly intent?: string
  readonly outcome?: string
  readonly verifier?: string
  readonly acceptanceCriteria?: readonly string[]
  readonly confidence?: number
}

export type MockDecompositionLlmValidationResult =
  | { readonly ok: true; readonly output: MockDecompositionLlmOutput }
  | { readonly ok: false; readonly reason: "invalid_mock_llm_output" | "forbidden_mock_llm_output" }

const ALLOWED_OUTPUT_KEYS = new Set(["text", "intent", "outcome", "verifier", "acceptanceCriteria", "confidence"])
const FORBIDDEN_PROVIDER_PAYLOAD_TEXT =
  /raw\s+provider\s+(payload|body)|provider-ready\s+payload|provider\s*(raw\s*)?(payload|body)|sendable\s+(provider\s+)?(payload|body)|approvedOutboundPayload|approvedOutboundBody|approved\s+outbound\s+(payload|body)/i
const FORBIDDEN_SECURITY_FIELD_TEXT = /\b(hash|role)\b(?:\s*:|\s+\w+|\b)/i

export function createStaticMockDecompositionLlm(output: MockDecompositionLlmOutput): MockDecompositionLlm {
  return {
    kind: "mock",
    generate: () => output,
  }
}

export function validateMockDecompositionLlmOutput(value: unknown): MockDecompositionLlmValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "invalid_mock_llm_output" }
  const candidate = value as Record<string, unknown>
  if (Object.keys(candidate).some((key) => !ALLOWED_OUTPUT_KEYS.has(key))) return { ok: false, reason: "invalid_mock_llm_output" }
  if (typeof candidate.text !== "string" || candidate.text.trim().length === 0) return { ok: false, reason: "invalid_mock_llm_output" }
  if (candidate.intent !== undefined && typeof candidate.intent !== "string") return { ok: false, reason: "invalid_mock_llm_output" }
  if (candidate.outcome !== undefined && typeof candidate.outcome !== "string") return { ok: false, reason: "invalid_mock_llm_output" }
  if (candidate.verifier !== undefined && typeof candidate.verifier !== "string") return { ok: false, reason: "invalid_mock_llm_output" }
  if (candidate.acceptanceCriteria !== undefined && !isStringArray(candidate.acceptanceCriteria)) return { ok: false, reason: "invalid_mock_llm_output" }
  if (candidate.confidence !== undefined && !isValidConfidence(candidate.confidence)) return { ok: false, reason: "invalid_mock_llm_output" }
  const textValues = [candidate.text, candidate.intent, candidate.outcome, candidate.verifier, ...(isStringArray(candidate.acceptanceCriteria) ? candidate.acceptanceCriteria : [])].filter(isString)
  if (textValues.some((text) => FORBIDDEN_PROVIDER_PAYLOAD_TEXT.test(text))) return { ok: false, reason: "forbidden_mock_llm_output" }
  if (textValues.some((text) => FORBIDDEN_SECURITY_FIELD_TEXT.test(text))) return { ok: false, reason: "forbidden_mock_llm_output" }
  if (!scanLlmContextExclusions(textValues).ok) return { ok: false, reason: "forbidden_mock_llm_output" }
  return { ok: true, output: candidate as MockDecompositionLlmOutput }
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isValidConfidence(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}
