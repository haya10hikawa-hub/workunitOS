import { runDecompositionOrchestrator, type DecompositionOrchestrationResult, type DecompositionOrchestratorInput } from "./decompositionOrchestrator.ts"
import { buildLatencySample, summarizeLatencyBudget, type DecompositionLatencyBudget, type DecompositionLatencySample } from "./decompositionLatencyModel.ts"
import type { DecompositionTarget } from "./types.ts"

export type DecompositionEvalClock = { readonly now: () => number }

type DecompositionEvalCaseBase = {
  readonly id: string
  readonly input: DecompositionOrchestratorInput
  readonly p0?: boolean
}

export type DecompositionEvalCase = DecompositionEvalCaseBase & (
  | { readonly expectedTarget: DecompositionTarget; readonly expectBlockedReason?: never }
  | { readonly expectedTarget?: never; readonly expectBlockedReason: string }
)

export type DecompositionEvalCaseResult = {
  readonly id: string
  readonly passed: boolean
  readonly p0: boolean
  readonly p0Violation: boolean
  readonly candidateTarget?: DecompositionTarget
  readonly blockedReason?: string
  readonly confidence?: number
  readonly safetyResult: "candidate_only" | "blocked"
  readonly latency: readonly DecompositionLatencySample[]
  readonly result: DecompositionOrchestrationResult
}

export function runDecompositionEvalHarness(cases: readonly DecompositionEvalCase[], options: { readonly clock: DecompositionEvalClock; readonly budget?: DecompositionLatencyBudget }): { readonly results: readonly DecompositionEvalCaseResult[]; readonly summary: { readonly total: number; readonly passed: number; readonly failed: number; readonly p0Violations: number; readonly latency: ReturnType<typeof summarizeLatencyBudget> } } {
  const results = cases.map((evalCase) => runCase(evalCase, options))
  const latency = summarizeLatencyBudget(results.flatMap((result) => result.latency))
  return { results, summary: { total: results.length, passed: results.filter((result) => result.passed).length, failed: results.filter((result) => !result.passed).length, p0Violations: results.filter((result) => result.p0Violation).length, latency } }
}

function runCase(evalCase: DecompositionEvalCase, options: { readonly clock: DecompositionEvalClock; readonly budget?: DecompositionLatencyBudget }): DecompositionEvalCaseResult {
  let mockMs = 0
  const start = options.clock.now()
  const result = runDecompositionOrchestrator({ ...evalCase.input, mockLlm: evalCase.input.mockLlm && { kind: "mock", generate: (input) => { const before = options.clock.now(); const output = evalCase.input.mockLlm!.generate(input); mockMs += options.clock.now() - before; return output } } })
  const totalMs = options.clock.now() - start
  const target = result.ok ? result.decomposition.target : undefined
  const blockedReason = result.ok ? undefined : result.reason
  const expectedMatches = caseExpectationMatches(evalCase, result, target, blockedReason)
  const p0Violation = Boolean(evalCase.p0 && !expectedMatches)
  return { id: evalCase.id, passed: expectedMatches && !p0Violation, p0: Boolean(evalCase.p0), p0Violation, candidateTarget: target, blockedReason, confidence: undefined, safetyResult: result.ok ? "candidate_only" : "blocked", latency: latencySamples(totalMs, mockMs, Boolean(evalCase.p0), options.budget), result: redactResult(result) }
}

function caseExpectationMatches(evalCase: DecompositionEvalCase, result: DecompositionOrchestrationResult, target?: DecompositionTarget, blockedReason?: string): boolean {
  if ("expectBlockedReason" in evalCase) return !result.ok && blockedReason === evalCase.expectBlockedReason
  if (!("expectedTarget" in evalCase) || !result.ok || target !== evalCase.expectedTarget) return false
  if (result.phase !== "candidate_only" || !result.candidateOnly || !result.promotionGate.humanReviewRequired) return false
  if (target === "merge_candidate") return !result.promotionGate.ok && result.promotionGate.blockedReasons.includes("merge_candidate_to_merged")
  if (target === "split_candidate") return !result.promotionGate.ok && result.promotionGate.blockedReasons.includes("split_candidate_to_finalized_split")
  return true
}

function latencySamples(totalMs: number, mockMs: number, p0: boolean, budget?: DecompositionLatencyBudget): readonly DecompositionLatencySample[] {
  const shellMs = Math.max(0, totalMs - mockMs)
  const samples = [buildLatencySample("orchestration_shell_ms", shellMs, budget), buildLatencySample("mock_fast_extraction_ms", mockMs, budget), buildLatencySample("mock_total_orchestration_ms", totalMs, budget)]
  return p0 ? [...samples, buildLatencySample("p0_block_ms", totalMs, budget)] : samples
}

function redactResult(result: DecompositionOrchestrationResult): DecompositionOrchestrationResult {
  return result.ok || !result.findings ? result : { ...result, findings: [{ redacted: true, reason: "forbidden_eval_detail" }] }
}
