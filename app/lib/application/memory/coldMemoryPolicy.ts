import type { ColdMemoryPolicyResult } from "./types.ts"

export function applyColdMemoryPolicy(input: { readonly refs: readonly string[] }): ColdMemoryPolicyResult {
  return {
    mayEnterLlmContext: false,
    reason: "cold_memory_excluded_in_phase_1a",
    retainedRefs: input.refs.map((ref) => ref.trim()).filter(Boolean),
  }
}
