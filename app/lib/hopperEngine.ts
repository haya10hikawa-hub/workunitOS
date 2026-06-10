import {
  HopperAdaptiveFilter,
  type HopperFilterDecision,
  type HopperFilterSnapshot,
  type HopperMemorySet,
  type HopperNearestNeighbor,
  type HopperSourceType,
  type HopperVector,
} from "./hopperAdaptiveFilter.ts"

export type HopperRawInput = {
  id: string
  title: string
  body?: string
  sourceType: HopperSourceType
  projectId?: string
  url?: string
  repo?: string
  author?: string
  tags?: string[]
  embedding: HopperVector
  createdAt: number
  sourcePrior?: number
  metadata?: Record<string, string | number | boolean | null>
}

export type HopperUnderstoodItem = HopperRawInput & {
  summary: string[]
  semanticTopics: string[]
}

export type HopperCanonicalItem = {
  id: string
  canonicalInput: HopperUnderstoodItem
  sourceType: HopperSourceType
  projectId?: string
  embedding: HopperVector
  summary: string[]
  tags: string[]
  duplicateLinks: string[]
  sourceTypes: HopperSourceType[]
  multimodalConfidence: number
  createdAt: number
}

export type HopperRankedItem = {
  item: HopperCanonicalItem
  decision: HopperFilterDecision
}

export type HopperJudgmentAction = "keep" | "discard" | "open"

export type HopperJudgmentLog = {
  itemId: string
  action: HopperJudgmentAction
  sourceType: HopperSourceType
  projectId?: string
  embedding: HopperVector
  decidedAt: number
  decisionMs?: number
  dwellMs?: number
  revisitCount?: number
  downstreamAction?: "task" | "issue" | "commit" | "none"
}

export type HopperMemorySnapshot = HopperMemorySet & {
  judgmentLogs: HopperJudgmentLog[]
}

export type HopperEngineSnapshot = {
  memories: HopperMemorySnapshot
  filter: HopperFilterSnapshot
}

export type HopperEngineConfig = {
  duplicateSimilarityThreshold: number
  mergeTimeWindowMs: number
  maxDisplayItems: number
  shortMemoryHalfLifeMs: number
  longMemoryHalfLifeMs: number
  maxRejectMemories: number
  maxOpenMemories: number
}

const DEFAULT_ENGINE_CONFIG: HopperEngineConfig = {
  duplicateSimilarityThreshold: 0.9,
  mergeTimeWindowMs: 1000 * 60 * 60 * 24,
  maxDisplayItems: 5,
  shortMemoryHalfLifeMs: 1000 * 60 * 60 * 48,
  longMemoryHalfLifeMs: 1000 * 60 * 60 * 24 * 45,
  maxRejectMemories: 80,
  maxOpenMemories: 80,
}

export class HopperEngine {
  private readonly config: HopperEngineConfig
  private readonly filter: HopperAdaptiveFilter
  private memories: HopperMemorySnapshot

  constructor(
    config: Partial<HopperEngineConfig> = {},
    snapshot?: HopperEngineSnapshot,
  ) {
    this.config = {
      ...DEFAULT_ENGINE_CONFIG,
      ...config,
    }
    this.filter = new HopperAdaptiveFilter({}, snapshot?.filter)
    this.memories = {
      V_short: snapshot?.memories.V_short ?? null,
      V_work: snapshot?.memories.V_work ?? null,
      V_long: snapshot?.memories.V_long ?? null,
      M_reject: snapshot?.memories.M_reject ?? [],
      M_open: snapshot?.memories.M_open ?? [],
      judgmentLogs: snapshot?.memories.judgmentLogs ?? [],
    }
  }

  setWorkContext(vector: HopperVector | null): void {
    this.memories = {
      ...this.memories,
      V_work: vector ? normalizeVector(vector) : null,
    }
  }

  process(rawInputs: readonly HopperRawInput[]): HopperRankedItem[] {
    const understood = rawInputs.map(understandHopperInput)
    const canonicalItems = mergeHopperItems(understood, this.config)
    const ranked = this.rank(canonicalItems)

    return ranked.filter((rankedItem) => rankedItem.decision.accepted).slice(0, this.config.maxDisplayItems)
  }

  rank(canonicalItems: readonly HopperCanonicalItem[]): HopperRankedItem[] {
    const nearestNeighborsById = getNearestNeighborsById(canonicalItems)

    return canonicalItems
      .map((item) => ({
        item,
        decision: this.filter.evaluate({
          id: item.id,
          embedding: item.embedding,
          sourceType: item.sourceType,
          projectId: item.projectId,
          memories: this.memories,
          nearestNeighbors: nearestNeighborsById.get(item.id),
          multimodalConfidence: item.multimodalConfidence,
          behaviorPrior: getBehaviorPrior(item, this.memories.judgmentLogs),
          sourcePrior: item.canonicalInput.sourcePrior,
          now: item.createdAt,
        }),
      }))
      .sort((a, b) => b.decision.score - a.decision.score)
  }

  recordJudgment(log: HopperJudgmentLog): void {
    const normalizedLog = {
      ...log,
      embedding: normalizeVector(log.embedding),
    }

    const judgmentLogs = [...this.memories.judgmentLogs, normalizedLog]
    const M_reject =
      log.action === "discard"
        ? pushVectorMemory(this.memories.M_reject, normalizedLog.embedding, this.config.maxRejectMemories)
        : this.memories.M_reject
    const M_open =
      log.action === "open"
        ? pushVectorMemory(this.memories.M_open, normalizedLog.embedding, this.config.maxOpenMemories)
        : this.memories.M_open

    this.memories = {
      ...this.memories,
      V_short: buildShortMemory(judgmentLogs, this.config, log.decidedAt),
      V_long: buildLongMemory(judgmentLogs, this.config, log.decidedAt),
      M_reject,
      M_open,
      judgmentLogs,
    }
  }

  snapshot(): HopperEngineSnapshot {
    return {
      memories: {
        ...this.memories,
        V_short: cloneVector(this.memories.V_short),
        V_work: cloneVector(this.memories.V_work),
        V_long: cloneVector(this.memories.V_long),
        M_reject: cloneMemoryList(this.memories.M_reject),
        M_open: cloneMemoryList(this.memories.M_open),
        judgmentLogs: this.memories.judgmentLogs.map((log) => ({
          ...log,
          embedding: [...log.embedding],
        })),
      },
      filter: this.filter.snapshot(),
    }
  }
}

export function understandHopperInput(input: HopperRawInput): HopperUnderstoodItem {
  const text = [input.title, input.body].filter(Boolean).join(" ")
  const summary = summarizeText(text)
  const semanticTopics = Array.from(new Set([...(input.tags ?? []), ...extractTopics(text)]))

  return {
    ...input,
    embedding: normalizeVector(input.embedding),
    summary,
    semanticTopics,
    tags: semanticTopics,
  }
}

export function mergeHopperItems(
  inputs: readonly HopperUnderstoodItem[],
  config: Partial<HopperEngineConfig> = {},
): HopperCanonicalItem[] {
  const resolvedConfig = { ...DEFAULT_ENGINE_CONFIG, ...config }
  const clusters: HopperUnderstoodItem[][] = []

  for (const input of inputs) {
    const cluster = clusters.find((candidate) =>
      candidate.some((existing) => shouldMerge(existing, input, resolvedConfig)),
    )

    if (cluster) {
      cluster.push(input)
    } else {
      clusters.push([input])
    }
  }

  return clusters.map(toCanonicalItem)
}

function shouldMerge(
  a: HopperUnderstoodItem,
  b: HopperUnderstoodItem,
  config: HopperEngineConfig,
): boolean {
  if (a.url && b.url && a.url === b.url) return true
  if (a.repo && b.repo && a.repo === b.repo) return true

  const closeInTime = Math.abs(a.createdAt - b.createdAt) <= config.mergeTimeWindowMs
  const closeInVector = cosineSimilarity(a.embedding, b.embedding) >= config.duplicateSimilarityThreshold

  return closeInTime && closeInVector
}

function toCanonicalItem(cluster: readonly HopperUnderstoodItem[]): HopperCanonicalItem {
  const canonicalInput = [...cluster].sort((a, b) => {
    if (a.sourceType === "github_star" && b.sourceType !== "github_star") return -1
    if (a.sourceType !== "github_star" && b.sourceType === "github_star") return 1
    return a.createdAt - b.createdAt
  })[0]
  const duplicateLinks = cluster.filter((item) => item.id !== canonicalInput.id).map((item) => item.id)
  const sourceTypes = Array.from(new Set(cluster.map((item) => item.sourceType)))
  const tags = Array.from(new Set(cluster.flatMap((item) => item.semanticTopics)))
  const summary = Array.from(new Set(cluster.flatMap((item) => item.summary))).slice(0, 3)

  return {
    id: `cluster:${canonicalInput.id}`,
    canonicalInput,
    sourceType: canonicalInput.sourceType,
    projectId: canonicalInput.projectId,
    embedding: averageVectors(cluster.map((item) => item.embedding)),
    summary,
    tags,
    duplicateLinks,
    sourceTypes,
    multimodalConfidence: getMultimodalConfidence(cluster),
    createdAt: Math.min(...cluster.map((item) => item.createdAt)),
  }
}

function getMultimodalConfidence(cluster: readonly HopperUnderstoodItem[]): number {
  const sourceCount = new Set(cluster.map((item) => item.sourceType)).size
  const duplicateBoost = Math.min(0.4, (cluster.length - 1) * 0.12)
  const sourceBoost = Math.min(0.3, (sourceCount - 1) * 0.15)

  return clamp01(0.35 + duplicateBoost + sourceBoost)
}

function getNearestNeighborsById(
  items: readonly HopperCanonicalItem[],
): Map<string, HopperNearestNeighbor[]> {
  const neighbors = new Map<string, HopperNearestNeighbor[]>()

  for (const item of items) {
    const itemNeighbors = items
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => ({
        id: candidate.id,
        similarity: cosineSimilarity(item.embedding, candidate.embedding),
        sourceType: candidate.sourceType,
        projectId: candidate.projectId,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)

    neighbors.set(item.id, itemNeighbors)
  }

  return neighbors
}

function getBehaviorPrior(item: HopperCanonicalItem, logs: readonly HopperJudgmentLog[]): number {
  const relatedLogs = logs.filter(
    (log) =>
      log.projectId === item.projectId &&
      cosineSimilarity(log.embedding, item.embedding) >= 0.86,
  )

  if (relatedLogs.length === 0) return 0

  const total = relatedLogs.reduce((sum, log) => {
    const actionWeight = log.action === "keep" ? 0.75 : log.action === "open" ? 0.42 : -0.35
    const revisitWeight = Math.min(0.15, (log.revisitCount ?? 0) * 0.03)
    const downstreamWeight =
      log.downstreamAction && log.downstreamAction !== "none" ? 0.18 : 0

    return sum + actionWeight + revisitWeight + downstreamWeight
  }, 0)

  return clamp01(total / relatedLogs.length)
}

function buildShortMemory(
  logs: readonly HopperJudgmentLog[],
  config: HopperEngineConfig,
  now: number,
): HopperVector | null {
  const weighted = logs
    .filter((log) => log.action === "keep" || log.action === "open")
    .map((log) => ({
      vector: log.embedding,
      weight:
        (log.action === "keep" ? 1 : 0.45) *
        timeDecay(log.decidedAt, now, config.shortMemoryHalfLifeMs),
    }))

  return weightedAverageVectors(weighted)
}

function buildLongMemory(
  logs: readonly HopperJudgmentLog[],
  config: HopperEngineConfig,
  now: number,
): HopperVector | null {
  const weighted = logs
    .filter((log) => log.action === "keep")
    .map((log) => ({
      vector: log.embedding,
      weight:
        (log.downstreamAction && log.downstreamAction !== "none" ? 1.35 : 1) *
        timeDecay(log.decidedAt, now, config.longMemoryHalfLifeMs),
    }))

  return weightedAverageVectors(weighted)
}

function pushVectorMemory(
  memory: HopperMemorySet["M_reject"] | HopperMemorySet["M_open"],
  vector: HopperVector,
  maxSize: number,
): HopperVector[] {
  if (Array.isArray(memory) && memory.length === 0) return [[...vector]]

  const vectors = Array.isArray(memory?.[0])
    ? (memory as readonly HopperVector[])
    : memory
      ? [memory as HopperVector]
      : []

  return [...vectors, vector].slice(-maxSize).map((item) => [...item])
}

function summarizeText(text: string): string[] {
  const compact = text.replace(/\s+/g, " ").trim()
  if (!compact) return []

  const sentenceParts = compact
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const source = sentenceParts.length > 1 ? sentenceParts : chunkText(compact, 110)
  return source.slice(0, 3)
}

function extractTopics(text: string): string[] {
  const normalized = text.toLowerCase()
  const matches = normalized.match(/[a-z0-9][a-z0-9_-]{2,}|[\p{Script=Han}\p{Script=Katakana}]{2,}/gu)

  if (!matches) return []

  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "into",
    "your",
    "you",
    "are",
  ])

  return Array.from(new Set(matches.filter((token) => !stopWords.has(token)))).slice(0, 8)
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size))
  }
  return chunks
}

function timeDecay(eventTime: number, now: number, halfLifeMs: number): number {
  const age = Math.max(0, now - eventTime)
  return Math.exp((-Math.LN2 * age) / halfLifeMs)
}

function weightedAverageVectors(
  weighted: readonly { vector: HopperVector; weight: number }[],
): HopperVector | null {
  const valid = weighted.filter((item) => item.weight > 0 && item.vector.length > 0)
  if (valid.length === 0) return null

  const dimensions = valid[0].vector.length
  const totals = Array.from({ length: dimensions }, () => 0)
  let totalWeight = 0

  for (const item of valid) {
    if (item.vector.length !== dimensions) continue
    totalWeight += item.weight
    for (let index = 0; index < dimensions; index += 1) {
      totals[index] += item.vector[index] * item.weight
    }
  }

  if (totalWeight === 0) return null
  return normalizeVector(totals.map((value) => value / totalWeight))
}

function averageVectors(vectors: readonly HopperVector[]): HopperVector {
  const averaged = weightedAverageVectors(vectors.map((vector) => ({ vector, weight: 1 })))
  return averaged ?? []
}

function normalizeVector(vector: HopperVector): HopperVector {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (norm === 0) return [...vector]
  return vector.map((value) => value / norm)
}

function cosineSimilarity(a: HopperVector, b: HopperVector): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let aNorm = 0
  let bNorm = 0

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    aNorm += a[index] * a[index]
    bNorm += b[index] * b[index]
  }

  if (aNorm === 0 || bNorm === 0) return 0
  return clamp01(dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm)))
}

function cloneVector(vector: HopperVector | null | undefined): HopperVector | null {
  return vector ? [...vector] : null
}

function cloneMemoryList(
  memory: HopperVector | readonly HopperVector[] | null | undefined,
): HopperVector[] {
  if (!memory) return []
  if (Array.isArray(memory) && memory.length === 0) return []
  if (typeof memory[0] === "number") return [[...(memory as HopperVector)]]
  return (memory as readonly HopperVector[]).map((vector) => [...vector])
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
