import type { DoneConditionDraft, DoneConditionStatus, DecompositionInput } from "./types.ts"
import { containsForbiddenContextText, isForbiddenContextKey } from "../safety/p0Policy.ts"

export function buildDoneConditionDraft(input: DecompositionInput): DoneConditionDraft {
  const outcome = normalize(input.outcome) || inferOutcome(input.text)
  const verifier = normalize(input.verifier) || inferVerifier(input.text)
  const acceptanceCriteria = normalizeCriteria(input.acceptanceCriteria) ?? inferCriteria(input.text)
  const draft: DoneConditionDraft = {
    outcome,
    verifier,
    acceptanceCriteria,
    sourceRef: input.sourceRef,
    humanInputRef: input.humanInputRef,
    missingFields: [],
    status: "partial",
    invalidReasons: [],
    riskFlags: input.riskFlags ?? [],
    candidateOnly: true,
  }
  const status = evaluateDoneConditionDraft(draft, input.context)
  return { ...draft, missingFields: status.missingFields, invalidReasons: status.invalidReasons, status: status.status }
}

export function evaluateDoneConditionDraft(
  input: DoneConditionDraft,
  context?: Record<string, unknown>,
): DoneConditionStatus {
  const missingFields = [
    input.outcome ? null : "outcome",
    input.verifier ? null : "verifier",
    input.acceptanceCriteria.length > 0 ? null : "acceptanceCriteria",
    input.sourceRef || input.humanInputRef ? null : "sourceRefOrHumanInputRef",
  ].filter((field): field is string => Boolean(field))

  const invalidReasons = [
    isAiVerifier(input.verifier) ? "ai_verifier_forbidden" : null,
    containsForbiddenContextField(context) ? "forbidden_context_field_present" : null,
    containsExternalExecutionPayload(context) ? "external_execution_payload_present" : null,
  ].filter((reason): reason is string => Boolean(reason))

  const status: DoneConditionStatus["status"] = invalidReasons.length > 0
    ? "invalid"
    : missingFields.length === 0
      ? "complete"
      : "partial"

  return {
    status,
    validForFormalCandidate: status === "complete",
    missingFields,
    invalidReasons,
  }
}

export function containsForbiddenContextField(value: unknown): boolean {
  return findForbiddenContextKeys(value).length > 0
}

export function findForbiddenContextKeys(value: unknown): string[] {
  const found = new Set<string>()
  scan(value, found)
  return [...found].sort()
}

export function containsExternalExecutionPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const keys = findForbiddenContextKeys(value)
  return keys.includes("externalExecutionPayload") || keys.includes("sendableBody") || keys.includes("approvedOutboundBody") || keys.includes("dbUpdatePayload")
}

export function isAiVerifier(verifier: string): boolean {
  return /^(ai|llm|model|system|assistant)$/i.test(verifier.trim())
}

function scan(value: unknown, found: Set<string>): void {
  if (typeof value === "string") {
    if (containsForbiddenContextText(value)) found.add("$value")
    return
  }
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    for (const item of value) scan(item, found)
    return
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenContextKey(key)) {
      found.add(key)
    }
    scan(nested, found)
  }
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? ""
}

function normalizeCriteria(value: readonly string[] | undefined): readonly string[] | null {
  if (!value) return null
  return value.map((item) => item.trim()).filter(Boolean)
}

function inferOutcome(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  if (/ありがとう|了解|thanks/i.test(trimmed)) return ""
  if (/log|ログ|PDF|URL/i.test(trimmed) && !/分析|作る|メモ|返信|回答/.test(trimmed)) return ""
  if (/メモ|一覧|返信案|正式回答|調査|修正要否/.test(trimmed)) return trimmed
  return ""
}

function inferVerifier(text: string): string {
  if (/PM|pm|顧客|法務/.test(text)) return "human_owner"
  return ""
}

function inferCriteria(text: string): readonly string[] {
  if (/メモ|一覧|返信案|正式回答|調査|修正要否/.test(text)) return ["Human reviewer can verify the outcome."]
  return []
}
