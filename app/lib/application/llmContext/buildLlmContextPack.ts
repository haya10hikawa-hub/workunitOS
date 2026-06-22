import { P0_FORBIDDEN_ACTIONS } from "../safety/p0Policy.ts"
import { scanLlmContextExclusions } from "./exclusionScanner.ts"
import type { LLMContextPack, LLMContextPackInput, LLMContextPackResult } from "./types.ts"

const MAX_SUMMARY_LENGTH = 1_200

export function buildLlmContextPack(input: LLMContextPackInput): LLMContextPackResult {
  const pack: LLMContextPack = {
    route: input.route,
    nodeSummary: sanitizeSummary(input.nodeSummary),
    sourceSummary: optionalSummary(input.sourceSummary),
    doneConditionSummary: optionalSummary(input.doneConditionSummary),
    missingFields: sanitizeList(input.missingFields),
    evidenceSummaries: sanitizeList(input.evidenceSummaries),
    relatedCandidateSummaries: sanitizeList(input.relatedCandidateSummaries),
    constraints: {
      externalExecutionBlocked: true,
      approvalRequired: true,
      humanReviewRequired: true,
      forbiddenActions: P0_FORBIDDEN_ACTIONS,
    },
  }
  const scan = scanLlmContextExclusions({ ...pack, rawContext: input.rawContext })
  if (!scan.ok) return { ok: false, reason: "forbidden_llm_context", findings: scan.findings }
  return { ok: true, pack }
}

function sanitizeSummary(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_SUMMARY_LENGTH)
}

function optionalSummary(value: string | undefined): string | undefined {
  const sanitized = value === undefined ? "" : sanitizeSummary(value)
  return sanitized || undefined
}

function sanitizeList(values: readonly string[] | undefined): readonly string[] | undefined {
  const sanitized = (values ?? []).map(sanitizeSummary).filter(Boolean)
  return sanitized.length > 0 ? sanitized : undefined
}
