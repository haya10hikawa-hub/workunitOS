import assert from "node:assert/strict"
import test from "node:test"

import { HopperAdaptiveFilter } from "../app/lib/hopperAdaptiveFilter.ts"
import {
  HopperEngine,
  mergeHopperItems,
  understandHopperInput,
  type HopperRawInput,
} from "../app/lib/hopperEngine.ts"

const now = 1_800_000_000_000

function input(overrides: Partial<HopperRawInput> = {}): HopperRawInput {
  return {
    id: "item-1",
    title: "Adaptive vector ranking for WorkUnit OS",
    body: "A technical note about EWMA thresholds, embedding similarity, and ranked execution signals.",
    sourceType: "github_star",
    projectId: "workunit-os",
    url: "https://example.com/workunit",
    embedding: [0.96, 0.2, 0.08],
    createdAt: now,
    ...overrides,
  }
}

test("Understand normalizes input without collapsing user memory into one context vector", () => {
  const understood = understandHopperInput(
    input({
      tags: ["rank"],
      embedding: [3, 4],
    }),
  )

  assert.equal(understood.embedding.length, 2)
  assert.ok(Math.abs(vectorNorm(understood.embedding) - 1) < 1e-9)
  assert.ok(understood.summary.length > 0)
  assert.ok(understood.semanticTopics.includes("rank"))
})

test("Merge clusters same URL and high-similarity near-time inputs into canonical items", () => {
  const items = [
    understandHopperInput(input({ id: "url-share", sourceType: "share_sheet" })),
    understandHopperInput(
      input({
        id: "github-readme",
        sourceType: "github_star",
        repo: "org/workunit",
      }),
    ),
    understandHopperInput(
      input({
        id: "distant-rss",
        sourceType: "rss",
        url: "https://example.com/different",
        embedding: [0.1, 0.95, 0.2],
        createdAt: now + 1000 * 60 * 60 * 48,
      }),
    ),
  ]

  const merged = mergeHopperItems(items, {
    duplicateSimilarityThreshold: 0.9,
  })

  assert.equal(merged.length, 2)
  const workUnitCluster = merged.find((item) => item.duplicateLinks.length === 1)
  assert.ok(workUnitCluster)
  assert.deepEqual(new Set(workUnitCluster.sourceTypes), new Set(["share_sheet", "github_star"]))
  assert.ok(workUnitCluster.multimodalConfidence > 0.35)
})

test("Engine ranks accepted Hopper candidates and caps display output at five items", () => {
  const engine = new HopperEngine({
    maxDisplayItems: 5,
    duplicateSimilarityThreshold: 0.98,
  })
  engine.setWorkContext([1, 0.15, 0.05])

  for (let index = 0; index < 4; index += 1) {
    engine.recordJudgment({
      itemId: `keep-${index}`,
      action: "keep",
      sourceType: "github_star",
      projectId: "workunit-os",
      embedding: [0.95, 0.18 + index * 0.01, 0.05],
      decidedAt: now - index * 1000,
      downstreamAction: "issue",
    })
  }

  const ranked = engine.process(
    Array.from({ length: 8 }, (_, index) =>
      input({
        id: `candidate-${index}`,
        url: `https://example.com/${index}`,
        embedding:
          index < 6
            ? [0.96, 0.18 + index * 0.01, 0.05]
            : [0.05, 0.2, 0.97],
        createdAt: now + index,
      }),
    ),
  )

  assert.ok(ranked.length <= 5)
  assert.ok(ranked.length > 0)
  assert.ok(ranked.every((item) => item.decision.accepted))
  assert.ok(ranked[0].decision.score >= ranked[ranked.length - 1].decision.score)
})

test("Judgments update short, long, reject, and open memories separately", () => {
  const engine = new HopperEngine()

  engine.recordJudgment({
    itemId: "open-1",
    action: "open",
    sourceType: "rss",
    projectId: "workunit-os",
    embedding: [0.7, 0.2, 0.1],
    decidedAt: now,
  })
  engine.recordJudgment({
    itemId: "discard-1",
    action: "discard",
    sourceType: "x_bookmark",
    projectId: "workunit-os",
    embedding: [0.1, 0.9, 0.1],
    decidedAt: now + 1,
  })
  engine.recordJudgment({
    itemId: "keep-1",
    action: "keep",
    sourceType: "github_star",
    projectId: "workunit-os",
    embedding: [0.95, 0.1, 0.1],
    decidedAt: now + 2,
    downstreamAction: "commit",
  })

  const snapshot = engine.snapshot().memories

  assert.ok(snapshot.V_short)
  assert.ok(snapshot.V_long)
  assert.equal(Array.isArray(snapshot.M_open), true)
  assert.equal(Array.isArray(snapshot.M_reject), true)
  assert.equal((snapshot.M_open as unknown[]).length, 1)
  assert.equal((snapshot.M_reject as unknown[]).length, 1)
  assert.equal(snapshot.judgmentLogs.length, 3)
})

test("Adaptive filter keeps threshold statistics separated by source and project", () => {
  const filter = new HopperAdaptiveFilter({
    minSamplesForAdaptive: 2,
    initialThreshold: 0.4,
  })
  const memories = {
    V_work: [1, 0, 0],
    V_short: [1, 0, 0],
    V_long: [1, 0, 0],
    M_reject: [[0, 1, 0]],
    M_open: [[0.8, 0.1, 0]],
  }

  filter.evaluate({
    id: "github-1",
    embedding: [1, 0, 0],
    sourceType: "github_star",
    projectId: "workunit-os",
    memories,
    now,
  })
  filter.evaluate({
    id: "rss-1",
    embedding: [0, 1, 0],
    sourceType: "rss",
    projectId: "workunit-os",
    memories,
    now,
  })

  assert.equal(filter.getScopeState("github_star", "workunit-os").sampleCount, 1)
  assert.equal(filter.getScopeState("rss", "workunit-os").sampleCount, 1)
  assert.equal(filter.getScopeState("x_bookmark", "workunit-os").sampleCount, 0)
})

test("Adaptive filter applies duplicate penalty and caps reject penalty", () => {
  const filter = new HopperAdaptiveFilter({
    initialThreshold: 0.1,
    rejectPenaltyCap: 0.05,
    rejectPenaltyWeight: 1,
  })

  const decision = filter.evaluate({
    id: "duplicate-reject",
    embedding: [0, 1, 0],
    sourceType: "x_bookmark",
    projectId: "workunit-os",
    memories: {
      V_work: [0, 1, 0],
      V_short: [0, 1, 0],
      V_long: [0, 1, 0],
      M_reject: [[0, 1, 0]],
      M_open: [],
    },
    nearestNeighbors: [
      {
        id: "same-topic",
        similarity: 0.96,
      },
    ],
    now,
  })

  assert.ok(decision.components.duplicatePenalty > 0)
  assert.equal(decision.components.rejectPenalty, 0.05)
  assert.ok(decision.reasonCodes.includes("duplicate_penalty_applied"))
  assert.ok(decision.reasonCodes.includes("reject_penalty_capped"))
})

function vectorNorm(vector: readonly number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
}
