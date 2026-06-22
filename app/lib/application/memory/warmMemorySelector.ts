import { scanLlmContextExclusions } from "../llmContext/exclusionScanner.ts"
import type { MemorySelectionResult } from "./types.ts"

export function selectWarmMemorySummaries(input: { readonly summaries: readonly string[]; readonly topK?: number }): MemorySelectionResult {
  const topK = Math.max(0, Math.min(input.topK ?? 5, 10))
  const summaries = input.summaries.slice(0, topK).map(sanitize).filter(Boolean)
  const scan = scanLlmContextExclusions(summaries)
  if (!scan.ok) return { ok: false, reason: "forbidden_memory_context", findings: scan.findings }
  return { ok: true, summaries }
}

function sanitize(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 400)
}
