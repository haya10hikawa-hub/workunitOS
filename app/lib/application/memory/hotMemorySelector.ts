import { scanLlmContextExclusions } from "../llmContext/exclusionScanner.ts"
import type { MemorySelectionResult } from "./types.ts"

export function selectHotMemorySummaries(input: { readonly summaries: readonly string[] }): MemorySelectionResult {
  const summaries = input.summaries.map(sanitize).filter(Boolean)
  const scan = scanLlmContextExclusions(summaries)
  if (!scan.ok) return { ok: false, reason: "forbidden_memory_context", findings: scan.findings }
  return { ok: true, summaries }
}

function sanitize(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 600)
}
