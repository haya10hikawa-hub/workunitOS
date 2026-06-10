import assert from "node:assert/strict"
import test from "node:test"

import {
  getHopperConnectionPreview,
  routeHopperCommit,
  type HopperCommitEvent,
  type HopperRoutableItem,
} from "../app/lib/hopperActionRouter.ts"

const item: HopperRoutableItem = {
  id: "cluster:repo-1",
  scopeKey: "github_star::workunit-os",
  score: 0.82,
  threshold: 0.41,
  title: "Faiss cache benchmark for Hopper vector retrieval",
  summary: "A repository showing local ANN benchmarks and cache boundary conditions.",
  sourceUrl: "https://github.com/vector-labs/faiss-cache",
}

const rssItem: HopperRoutableItem = {
  id: "cluster:rss-1",
  scopeKey: "rss::workunit-os",
  score: 0.77,
  threshold: 0.43,
  title: "EWMA thresholds for streaming recommender systems",
  summary: "Research about moving quantile thresholds and ranking drift.",
  sourceUrl: "https://example.com/ewma-thresholds",
}

const shareItem: HopperRoutableItem = {
  id: "cluster:share-1",
  scopeKey: "share_sheet::workunit-os",
  score: 0.7,
  threshold: 0.4,
  title: "Ask infra owner to verify Slack capture failure",
  summary: "A single pushed action from mobile share sheet.",
}

test("Hopper discard routes into explicit reject memory effect", () => {
  const event: HopperCommitEvent = {
    id: item.id,
    action: "discard",
    latencyMs: 180,
    score: item.score,
  }

  const outcome = routeHopperCommit(item, event)

  assert.deepEqual(outcome, {
    type: "drop",
    sourceItemId: item.id,
    memoryEffect: "M_reject",
    reason: "explicit_discard",
  })
})

test("Hopper note route preserves signal without creating execution work", () => {
  const event: HopperCommitEvent = {
    id: item.id,
    action: "keep",
    route: "note",
    nextAction: "defer",
    latencyMs: 240,
    score: item.score,
  }

  const outcome = routeHopperCommit(item, event)

  assert.equal(outcome?.type, "note")
  if (outcome?.type !== "note") return
  assert.equal(outcome.sourceItemId, item.id)
  assert.equal(outcome.targetSurface, "note")
  assert.equal(outcome.title, item.title)
  assert.match(outcome.reentryCondition, /similar signals/)
})

test("Hopper workunit create route emits issue-oriented WorkUnit draft", () => {
  const event: HopperCommitEvent = {
    id: item.id,
    action: "keep",
    route: "workunit",
    nextAction: "create",
    latencyMs: 300,
    score: item.score,
  }

  const outcome = routeHopperCommit(item, event)

  assert.equal(outcome?.type, "workunit_draft")
  if (outcome?.type !== "workunit_draft") return
  assert.equal(outcome.draft.sourceItemId, item.id)
  assert.equal(outcome.draft.targetSurface, "issue")
  assert.equal(outcome.draft.connection.targetSurface, "issue")
  assert.equal(outcome.draft.sourceUrl, item.sourceUrl)
  assert.equal(outcome.draft.status, "create_ready")
  assert.ok(outcome.draft.suggestedTasks.length >= 3)
  assert.match(outcome.draft.whyNow, /adaptive gate/)
})

test("Hopper rss/news input routes into research note draft surface", () => {
  const event: HopperCommitEvent = {
    id: rssItem.id,
    action: "keep",
    route: "workunit",
    nextAction: "create",
    latencyMs: 320,
    score: rssItem.score,
  }

  const outcome = routeHopperCommit(rssItem, event)

  assert.equal(outcome?.type, "workunit_draft")
  if (outcome?.type !== "workunit_draft") return
  assert.equal(outcome.draft.targetSurface, "research_note")
  assert.equal(outcome.draft.connection.targetSurface, "research_note")
  assert.equal(outcome.draft.status, "create_ready")
})

test("Hopper sns/share input routes into task draft surface", () => {
  const event: HopperCommitEvent = {
    id: shareItem.id,
    action: "keep",
    route: "workunit",
    nextAction: "create",
    latencyMs: 260,
    score: shareItem.score,
  }

  const outcome = routeHopperCommit(shareItem, event)

  assert.equal(outcome?.type, "workunit_draft")
  if (outcome?.type !== "workunit_draft") return
  assert.equal(outcome.draft.targetSurface, "task")
  assert.equal(outcome.draft.connection.targetSurface, "task")
  assert.match(outcome.draft.connection.nextAction, /Clarify/)
})

test("Hopper workunit defer route emits deferred draft without external creation", () => {
  const event: HopperCommitEvent = {
    id: item.id,
    action: "keep",
    route: "workunit",
    nextAction: "defer",
    latencyMs: 210,
    score: item.score,
  }

  const outcome = routeHopperCommit(item, event)

  assert.equal(outcome?.type, "workunit_draft")
  if (outcome?.type !== "workunit_draft") return
  assert.equal(outcome.draft.status, "deferred")
  assert.equal(outcome.draft.targetSurface, "issue")
})

test("Hopper connection preview exposes note and issue destinations", () => {
  const issuePreview = getHopperConnectionPreview(item, "workunit")
  const notePreview = getHopperConnectionPreview(item, "note")

  assert.equal(issuePreview.targetSurface, "issue")
  assert.equal(issuePreview.label, "GitHub Issue Draft")
  assert.equal(notePreview.targetSurface, "note")
  assert.equal(notePreview.label, "Open Note")
})
