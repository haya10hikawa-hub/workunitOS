import type { ForbiddenContextFinding } from "../llmContext/exclusionScanner.ts"

export type MemorySelectionResult =
  | { readonly ok: true; readonly summaries: readonly string[] }
  | { readonly ok: false; readonly reason: "forbidden_memory_context"; readonly findings: readonly ForbiddenContextFinding[] }

export type ColdMemoryPolicyResult = {
  readonly mayEnterLlmContext: false
  readonly reason: "cold_memory_excluded_in_phase_1a"
  readonly retainedRefs: readonly string[]
}
