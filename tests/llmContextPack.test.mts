import test from "node:test"
import assert from "node:assert/strict"
import { scanLlmContextExclusions } from "../app/lib/application/llmContext/exclusionScanner.ts"
import { buildLlmContextPack } from "../app/lib/application/llmContext/buildLlmContextPack.ts"
import { selectHotMemorySummaries } from "../app/lib/application/memory/hotMemorySelector.ts"
import { selectWarmMemorySummaries } from "../app/lib/application/memory/warmMemorySelector.ts"
import { applyColdMemoryPolicy } from "../app/lib/application/memory/coldMemoryPolicy.ts"

test("LLM exclusion scanner blocks approval/hash/tenant/user/role fields", () => {
  const result = scanLlmContextExclusions({ approvalId: "a1", nested: { targetHash: "h1", tenantId: "t1", userId: "u1", role: "owner" } })
  assert.equal(result.ok, false)
  assert.deepEqual(result.findings.map((f) => f.key).filter(Boolean).sort(), ["approvalId", "role", "targetHash", "tenantId", "userId"])
})

test("LLM exclusion scanner blocks token secret apiKey and raw provider payload fields", () => {
  const result = scanLlmContextExclusions({ token: "t", secret: "s", apiKey: "k", rawPayload: {}, rawBody: "raw Slack body", html: "<p>x</p>", fileContent: "x" })
  assert.equal(result.ok, false)
  assert.ok(result.findings.length >= 7)
})

test("LLM exclusion scanner blocks sendable and execution payload fields", () => {
  const result = scanLlmContextExclusions({ sendableBody: "x", approvedOutboundBody: "x", externalExecutionPayload: {}, dbUpdatePayload: {} })
  assert.equal(result.ok, false)
  assert.deepEqual(result.findings.map((f) => f.key).sort(), ["approvedOutboundBody", "dbUpdatePayload", "externalExecutionPayload", "sendableBody"])
})

test("LLMContextPack contains sanitized summaries only", () => {
  const result = buildLlmContextPack({
    route: "fast_extraction",
    nodeSummary: "  Review quarterly plan\n",
    sourceSummary: "Safe source summary",
    missingFields: ["verifier"],
    evidenceSummaries: ["No raw body included"],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const flat = JSON.stringify(result.pack)
  for (const forbidden of ["approvalId", "targetHash", "payloadHash", "tenantId", "userId", "role", "rawPayload", "sendableBody"]) {
    assert.equal(flat.includes(forbidden), false)
  }
  assert.equal(result.pack.constraints.externalExecutionBlocked, true)
  assert.equal(result.pack.constraints.approvalRequired, true)
  assert.equal(result.pack.constraints.humanReviewRequired, true)
})

test("LLMContextPack blocks forbidden rawContext instead of sanitizing silently", () => {
  const result = buildLlmContextPack({
    route: "draft_generation",
    nodeSummary: "Draft editable reply",
    rawContext: { providerTarget: "slack", message: "raw Gmail body" },
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, "forbidden_llm_context")
})

test("Hot and Warm memory selectors allow only sanitized summaries", () => {
  assert.equal(selectHotMemorySummaries({ summaries: ["Selected node summary"] }).ok, true)
  assert.equal(selectWarmMemorySummaries({ summaries: ["Related evidence", "approvalId: a1"] }).ok, false)
  assert.equal(applyColdMemoryPolicy({ refs: ["audit:1"] }).mayEnterLlmContext, false)
})
