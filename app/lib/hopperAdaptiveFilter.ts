export type HopperSourceType =
  | "github_star"
  | "rss"
  | "x_bookmark"
  | "share_sheet"
  | "browser_extension"
  | "newsletter"
  | "screenshot"
  | string

export type HopperVector = readonly number[]

export type HopperMemorySet = {
  V_short?: HopperVector | null
  V_work?: HopperVector | null
  V_long?: HopperVector | null
  M_reject?: HopperVector | readonly HopperVector[] | null
  M_open?: HopperVector | readonly HopperVector[] | null
}

export type HopperNearestNeighbor = {
  id: string
  similarity: number
  sourceType?: HopperSourceType
  projectId?: string
}

export type HopperFilterInput = {
  id: string
  embedding: HopperVector
  sourceType: HopperSourceType
  projectId?: string
  memories: HopperMemorySet
  nearestNeighbors?: readonly HopperNearestNeighbor[]
  multimodalConfidence?: number
  behaviorPrior?: number
  sourcePrior?: number
  now?: number
  auxiliarySignals?: {
    decisionMs?: number
    dwellMs?: number
  }
}

export type HopperScoreComponents = {
  workSimilarity: number
  shortSimilarity: number
  longSimilarity: number
  openSimilarity: number
  rejectSimilarity: number
  rejectPenalty: number
  duplicatePenalty: number
  multimodalConfidence: number
  behaviorPrior: number
  sourcePrior: number
}

export type HopperDecisionReason =
  | "adaptive_threshold_pass"
  | "adaptive_threshold_reject"
  | "cold_start_threshold"
  | "ewma_mean_std_threshold"
  | "moving_quantile_threshold"
  | "pass_rate_feedback_increased_k"
  | "pass_rate_feedback_decreased_k"
  | "duplicate_penalty_applied"
  | "reject_penalty_capped"
  | "source_project_scoped_stats"
  | "auxiliary_behavior_not_direct_label"

export type HopperFilterDecision = {
  id: string
  accepted: boolean
  score: number
  threshold: number
  scopeKey: string
  sampleCountBefore: number
  passRate: number
  targetPassRate: number
  k: number
  components: HopperScoreComponents
  reasonCodes: HopperDecisionReason[]
}

export type HopperFilterConfig = {
  targetPassRate: number
  targetBand: number
  ewmaAlpha: number
  thresholdAlpha: number
  quantileWindowSize: number
  passRateWindowSize: number
  minSamplesForAdaptive: number
  thresholdMin: number
  thresholdMax: number
  initialThreshold: number
  initialK: number
  minK: number
  maxK: number
  kStep: number
  duplicateSimilarityFloor: number
  duplicatePenaltyWeight: number
  duplicatePenaltyCap: number
  rejectPenaltyWeight: number
  rejectPenaltyCap: number
  weights: {
    work: number
    short: number
    long: number
    open: number
    multimodal: number
    behavior: number
    source: number
  }
}

export type HopperAdaptiveFilterConfigInput =
  Partial<Omit<HopperFilterConfig, "weights">> & {
    weights?: Partial<HopperFilterConfig["weights"]>
  }

export type HopperScopeStateSnapshot = {
  sampleCount: number
  ewmaMean: number
  ewmaVariance: number
  threshold: number
  k: number
  scoreWindow: number[]
  passWindow: boolean[]
  updatedAt: number
}

export type HopperFilterSnapshot = Record<string, HopperScopeStateSnapshot>

type HopperScopeState = HopperScopeStateSnapshot

const DEFAULT_CONFIG: HopperFilterConfig = {
  targetPassRate: 0.03,
  targetBand: 0.01,
  ewmaAlpha: 0.94,
  thresholdAlpha: 0.88,
  quantileWindowSize: 300,
  passRateWindowSize: 120,
  minSamplesForAdaptive: 30,
  thresholdMin: 0.24,
  thresholdMax: 0.92,
  initialThreshold: 0.46,
  initialK: 1.8,
  minK: 0.6,
  maxK: 3.2,
  kStep: 0.08,
  duplicateSimilarityFloor: 0.9,
  duplicatePenaltyWeight: 0.35,
  duplicatePenaltyCap: 0.16,
  rejectPenaltyWeight: 0.12,
  rejectPenaltyCap: 0.12,
  weights: {
    work: 0.32,
    short: 0.22,
    long: 0.14,
    open: 0.08,
    multimodal: 0.09,
    behavior: 0.08,
    source: 0.07,
  },
}

export class HopperAdaptiveFilter {
  private readonly config: HopperFilterConfig
  private readonly scopes = new Map<string, HopperScopeState>()

  constructor(
    config: HopperAdaptiveFilterConfigInput = {},
    snapshot: HopperFilterSnapshot = {},
  ) {
    this.config = normalizeConfig({
      ...DEFAULT_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_CONFIG.weights,
        ...config.weights,
      },
    })

    for (const [scopeKey, state] of Object.entries(snapshot)) {
      this.scopes.set(scopeKey, normalizeState(state, this.config))
    }
  }

  evaluate(input: HopperFilterInput): HopperFilterDecision {
    const scopeKey = getScopeKey(input.sourceType, input.projectId)
    const state = this.getState(scopeKey, input.now)
    const reasonCodes: HopperDecisionReason[] = ["source_project_scoped_stats"]

    if (input.auxiliarySignals?.decisionMs || input.auxiliarySignals?.dwellMs) {
      reasonCodes.push("auxiliary_behavior_not_direct_label")
    }

    const components = scoreComponents(input, this.config)
    if (components.duplicatePenalty > 0) reasonCodes.push("duplicate_penalty_applied")
    if (
      components.rejectSimilarity > 0 &&
      components.rejectPenalty >= this.config.rejectPenaltyCap
    ) {
      reasonCodes.push("reject_penalty_capped")
    }

    const score = scoreInput(components, this.config)
    const passRateBefore = getPassRate(state.passWindow)
    const nextK = adjustK(state.k, passRateBefore, this.config, reasonCodes)
    const threshold = getDecisionThreshold(
      state,
      nextK,
      components.sourcePrior,
      this.config,
      reasonCodes,
    )
    const accepted = score >= threshold

    reasonCodes.push(accepted ? "adaptive_threshold_pass" : "adaptive_threshold_reject")

    this.scopes.set(
      scopeKey,
      updateState(state, score, accepted, threshold, nextK, input.now ?? Date.now(), this.config),
    )

    return {
      id: input.id,
      accepted,
      score,
      threshold,
      scopeKey,
      sampleCountBefore: state.sampleCount,
      passRate: passRateBefore,
      targetPassRate: this.config.targetPassRate,
      k: nextK,
      components,
      reasonCodes,
    }
  }

  snapshot(): HopperFilterSnapshot {
    return Object.fromEntries(
      Array.from(this.scopes.entries()).map(([scopeKey, state]) => [
        scopeKey,
        {
          ...state,
          scoreWindow: [...state.scoreWindow],
          passWindow: [...state.passWindow],
        },
      ]),
    )
  }

  getScopeState(sourceType: HopperSourceType, projectId?: string): HopperScopeStateSnapshot {
    const state = this.getState(getScopeKey(sourceType, projectId))

    return {
      ...state,
      scoreWindow: [...state.scoreWindow],
      passWindow: [...state.passWindow],
    }
  }

  private getState(scopeKey: string, now = Date.now()): HopperScopeState {
    const existing = this.scopes.get(scopeKey)
    if (existing) return existing

    const initial: HopperScopeState = {
      sampleCount: 0,
      ewmaMean: this.config.initialThreshold,
      ewmaVariance: 0,
      threshold: this.config.initialThreshold,
      k: this.config.initialK,
      scoreWindow: [],
      passWindow: [],
      updatedAt: now,
    }

    this.scopes.set(scopeKey, initial)
    return initial
  }
}

export function getScopeKey(sourceType: HopperSourceType, projectId?: string): string {
  return `${sourceType}::${projectId ?? "global"}`
}

export function scoreComponents(
  input: HopperFilterInput,
  config: HopperFilterConfig = DEFAULT_CONFIG,
): HopperScoreComponents {
  const rejectSimilarity = maxMemorySimilarity(input.embedding, input.memories.M_reject)
  const rejectPenalty = Math.min(rejectSimilarity * config.rejectPenaltyWeight, config.rejectPenaltyCap)
  const duplicatePenalty = getDuplicatePenalty(input.nearestNeighbors, config)

  return {
    workSimilarity: normalizedCosine(input.embedding, input.memories.V_work),
    shortSimilarity: normalizedCosine(input.embedding, input.memories.V_short),
    longSimilarity: normalizedCosine(input.embedding, input.memories.V_long),
    openSimilarity: maxMemorySimilarity(input.embedding, input.memories.M_open),
    rejectSimilarity,
    rejectPenalty,
    duplicatePenalty,
    multimodalConfidence: clamp01(input.multimodalConfidence ?? 0),
    behaviorPrior: clamp01(input.behaviorPrior ?? 0),
    sourcePrior: clamp01(input.sourcePrior ?? sourcePrior(input.sourceType)),
  }
}

export function scoreInput(
  components: HopperScoreComponents,
  config: HopperFilterConfig = DEFAULT_CONFIG,
): number {
  const raw =
    config.weights.work * components.workSimilarity +
    config.weights.short * components.shortSimilarity +
    config.weights.long * components.longSimilarity +
    config.weights.open * components.openSimilarity +
    config.weights.multimodal * components.multimodalConfidence +
    config.weights.behavior * components.behaviorPrior +
    config.weights.source * components.sourcePrior -
    components.rejectPenalty -
    components.duplicatePenalty

  return clamp01(raw)
}

function getDecisionThreshold(
  state: HopperScopeState,
  k: number,
  sourcePriorValue: number | undefined,
  config: HopperFilterConfig,
  reasonCodes: HopperDecisionReason[],
): number {
  if (state.sampleCount < config.minSamplesForAdaptive) {
    reasonCodes.push("cold_start_threshold")

    const quantileFallback =
      state.scoreWindow.length >= 5
        ? movingQuantile(state.scoreWindow, 1 - config.targetPassRate)
        : config.initialThreshold
    const priorRelief = clamp01(sourcePriorValue ?? 0) * 0.08

    return clamp(quantileFallback - priorRelief, config.thresholdMin, config.thresholdMax)
  }

  const std = Math.sqrt(Math.max(0, state.ewmaVariance))
  const meanStdThreshold = state.ewmaMean + k * std
  const quantileThreshold = movingQuantile(state.scoreWindow, 1 - config.targetPassRate)
  const candidate = Math.max(meanStdThreshold, quantileThreshold)
  const threshold = config.thresholdAlpha * state.threshold + (1 - config.thresholdAlpha) * candidate

  reasonCodes.push("ewma_mean_std_threshold", "moving_quantile_threshold")

  return clamp(threshold, config.thresholdMin, config.thresholdMax)
}

function updateState(
  state: HopperScopeState,
  score: number,
  accepted: boolean,
  threshold: number,
  k: number,
  updatedAt: number,
  config: HopperFilterConfig,
): HopperScopeState {
  const sampleCount = state.sampleCount + 1
  const previousMean = state.ewmaMean
  const ewmaMean =
    state.sampleCount === 0
      ? score
      : config.ewmaAlpha * state.ewmaMean + (1 - config.ewmaAlpha) * score
  const delta = score - previousMean
  const ewmaVariance =
    state.sampleCount <= 1
      ? 0
      : config.ewmaAlpha * state.ewmaVariance + (1 - config.ewmaAlpha) * delta * delta

  return {
    sampleCount,
    ewmaMean,
    ewmaVariance,
    threshold,
    k,
    scoreWindow: pushWindow(state.scoreWindow, score, config.quantileWindowSize),
    passWindow: pushWindow(state.passWindow, accepted, config.passRateWindowSize),
    updatedAt,
  }
}

function adjustK(
  currentK: number,
  passRate: number,
  config: HopperFilterConfig,
  reasonCodes: HopperDecisionReason[],
): number {
  if (passRate > config.targetPassRate + config.targetBand) {
    reasonCodes.push("pass_rate_feedback_increased_k")
    return clamp(currentK + config.kStep, config.minK, config.maxK)
  }

  if (passRate < Math.max(0, config.targetPassRate - config.targetBand)) {
    reasonCodes.push("pass_rate_feedback_decreased_k")
    return clamp(currentK - config.kStep, config.minK, config.maxK)
  }

  return currentK
}

function getDuplicatePenalty(
  nearestNeighbors: readonly HopperNearestNeighbor[] | undefined,
  config: HopperFilterConfig,
): number {
  if (!nearestNeighbors?.length) return 0

  const maxDuplicateSimilarity = nearestNeighbors.reduce((max, neighbor) => {
    if (neighbor.similarity < config.duplicateSimilarityFloor) return max
    return Math.max(max, neighbor.similarity)
  }, 0)

  if (maxDuplicateSimilarity === 0) return 0

  const excess = maxDuplicateSimilarity - config.duplicateSimilarityFloor
  const penalty = excess * config.duplicatePenaltyWeight

  return Math.min(penalty, config.duplicatePenaltyCap)
}

function maxMemorySimilarity(
  embedding: HopperVector,
  memory: HopperVector | readonly HopperVector[] | null | undefined,
): number {
  if (!memory) return 0
  if (typeof memory[0] === "number") return normalizedCosine(embedding, memory as HopperVector)

  return (memory as readonly HopperVector[]).reduce(
    (max, candidate) => Math.max(max, normalizedCosine(embedding, candidate)),
    0,
  )
}

function normalizedCosine(a: HopperVector, b: HopperVector | null | undefined): number {
  if (!b || a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let aNorm = 0
  let bNorm = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    aNorm += a[i] * a[i]
    bNorm += b[i] * b[i]
  }

  if (aNorm === 0 || bNorm === 0) return 0

  return clamp01(dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm)))
}

function movingQuantile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(clamp01(quantile) * sorted.length) - 1),
  )

  return sorted[index]
}

function getPassRate(passWindow: readonly boolean[]): number {
  if (passWindow.length === 0) return 0
  return passWindow.filter(Boolean).length / passWindow.length
}

function pushWindow<T>(window: readonly T[], value: T, maxSize: number): T[] {
  const next = [...window, value]
  return next.length > maxSize ? next.slice(next.length - maxSize) : next
}

function sourcePrior(sourceType: HopperSourceType): number {
  switch (sourceType) {
    case "github_star":
      return 0.72
    case "rss":
      return 0.58
    case "x_bookmark":
      return 0.5
    case "share_sheet":
      return 0.62
    case "browser_extension":
      return 0.6
    case "newsletter":
      return 0.54
    case "screenshot":
      return 0.42
    default:
      return 0.45
  }
}

function normalizeConfig(config: HopperFilterConfig): HopperFilterConfig {
  const thresholdMin = clamp01(Math.min(config.thresholdMin, config.thresholdMax))
  const thresholdMax = clamp01(Math.max(config.thresholdMin, config.thresholdMax))
  const minK = Math.max(0, Math.min(config.minK, config.maxK))
  const maxK = Math.max(minK, Math.max(config.minK, config.maxK))

  return {
    ...config,
    targetPassRate: clamp(config.targetPassRate, 0.01, 0.1),
    targetBand: Math.max(0.001, config.targetBand),
    ewmaAlpha: clamp(config.ewmaAlpha, 0.01, 0.99),
    thresholdAlpha: clamp(config.thresholdAlpha, 0.01, 0.99),
    quantileWindowSize: Math.max(10, Math.floor(config.quantileWindowSize)),
    passRateWindowSize: Math.max(10, Math.floor(config.passRateWindowSize)),
    minSamplesForAdaptive: Math.max(1, Math.floor(config.minSamplesForAdaptive)),
    thresholdMin,
    thresholdMax,
    initialThreshold: clamp(config.initialThreshold, thresholdMin, thresholdMax),
    initialK: clamp(config.initialK, minK, maxK),
    minK,
    maxK,
    kStep: Math.max(0.001, config.kStep),
    duplicateSimilarityFloor: clamp01(config.duplicateSimilarityFloor),
    duplicatePenaltyWeight: Math.max(0, config.duplicatePenaltyWeight),
    duplicatePenaltyCap: clamp01(config.duplicatePenaltyCap),
    rejectPenaltyWeight: Math.max(0, config.rejectPenaltyWeight),
    rejectPenaltyCap: clamp01(config.rejectPenaltyCap),
  }
}

function normalizeState(
  state: HopperScopeStateSnapshot,
  config: HopperFilterConfig,
): HopperScopeState {
  return {
    sampleCount: Math.max(0, Math.floor(state.sampleCount)),
    ewmaMean: clamp01(state.ewmaMean),
    ewmaVariance: Math.max(0, state.ewmaVariance),
    threshold: clamp(state.threshold, config.thresholdMin, config.thresholdMax),
    k: clamp(state.k, config.minK, config.maxK),
    scoreWindow: state.scoreWindow.slice(-config.quantileWindowSize).map(clamp01),
    passWindow: state.passWindow.slice(-config.passRateWindowSize),
    updatedAt: state.updatedAt,
  }
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
