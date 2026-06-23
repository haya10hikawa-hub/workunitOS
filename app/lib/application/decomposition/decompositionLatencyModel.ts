export type DecompositionLatencyMetric =
  | "orchestration_shell_ms"
  | "mock_fast_extraction_ms"
  | "mock_total_orchestration_ms"
  | "p0_block_ms"

export type DecompositionLatencyBudget = Record<DecompositionLatencyMetric, number>

export type DecompositionLatencySample = {
  readonly metric: DecompositionLatencyMetric
  readonly elapsedMs: number
  readonly budgetMs: number
  readonly withinBudget: boolean
}

export const DEFAULT_DECOMPOSITION_LATENCY_BUDGET: DecompositionLatencyBudget = {
  orchestration_shell_ms: 300,
  mock_fast_extraction_ms: 3000,
  mock_total_orchestration_ms: 6000,
  p0_block_ms: 300,
}

export function buildLatencySample(metric: DecompositionLatencyMetric, elapsedMs: number, budget: DecompositionLatencyBudget = DEFAULT_DECOMPOSITION_LATENCY_BUDGET): DecompositionLatencySample {
  const safeElapsedMs = Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : Number.POSITIVE_INFINITY
  const budgetMs = Number.isFinite(budget[metric]) && budget[metric] >= 0 ? budget[metric] : DEFAULT_DECOMPOSITION_LATENCY_BUDGET[metric]
  return { metric, elapsedMs: safeElapsedMs, budgetMs, withinBudget: safeElapsedMs <= budgetMs }
}

export function summarizeLatencyBudget(samples: readonly DecompositionLatencySample[]): { readonly total: number; readonly overBudget: number; readonly samples: readonly DecompositionLatencySample[] } {
  return { total: samples.length, overBudget: samples.filter((sample) => !sample.withinBudget).length, samples }
}
