import test from "node:test"
import assert from "node:assert/strict"
import {
  buildActionPlan,
  deriveActionPlanVariant,
} from "../app/lib/application/actionField/actionPlanModel.ts"

function mockWu(overrides: Record<string, unknown> = {}) {
  return {
    id: "wu:1",
    signalId: "s:1",
    tenantId: "dev-tenant",
    title: "Test WorkUnit",
    kind: "review_waiting" as const,
    priority: "high" as const,
    sourceProvider: "github" as const,
    reason: "test reason",
    evidence: "test evidence",
    nextAction: "Review code",
    sourceUrl: "https://example.com",
    actor: "alice",
    repository: "acme/api",
    createdAt: "2026-01-01",
    status: "open" as const,
    ...overrides,
  }
}

// ─── Variant mapping ──────────────────────────────────────────

test("slack + repository → slack_github", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "slack", repository: "acme/api" })), "slack_github")
})

test("github + repository → slack_github", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "github", repository: "acme/api" })), "slack_github")
})

test("calendar → calendar_email", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "calendar" })), "calendar_email")
})

test("slack (no repo) → slack", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "slack", repository: undefined })), "slack")
})

test("email → email", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "email" })), "email")
})

test("database → database", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "notion" })), "database")
})

test("unknown → unknown", () => {
  assert.equal(deriveActionPlanVariant(mockWu({ sourceProvider: "unknown-provider", repository: undefined })), "unknown")
})

// ─── Action plan construction ────────────────────────────────

test("buildActionPlan produces valid model", () => {
  const plan = buildActionPlan({ wu: mockWu(), previewRefCount: 1, previewStatus: "created" })
  assert.equal(plan.variant, "slack_github")
  assert.ok(plan.title.length > 0)
  assert.ok(plan.subtitle.length > 0)
  assert.equal(plan.steps.length, 2)
  assert.equal(plan.safetyChecks.length >= 3, true)
  assert.ok(plan.warnings.length > 0)
  assert.equal(plan.canApprovePlan, true)
})

test("buildActionPlan with no preview → cannot approve", () => {
  const plan = buildActionPlan({ wu: mockWu(), previewRefCount: 0, previewStatus: "idle" })
  assert.equal(plan.canApprovePlan, false)
})

test("each step has required fields", () => {
  const plan = buildActionPlan({ wu: mockWu(), previewRefCount: 1, previewStatus: "created" })
  for (const step of plan.steps) {
    assert.ok(step.id.length > 0)
    assert.ok(step.title.length > 0)
    assert.ok(step.targetLabel.length > 0)
    assert.ok(["low", "medium", "high"].includes(step.riskLevel))
  }
})

// ─── Forbidden fields ─────────────────────────────────────────

test("ActionPlanModel has no forbidden field keys", () => {
  const plan = buildActionPlan({ wu: mockWu(), previewRefCount: 1, previewStatus: "created" })
  const json = JSON.stringify(plan)
  assert.equal(json.includes("approvalId"), false)
  assert.equal(json.includes("targetHash"), false)
  assert.equal(json.includes("payloadHash"), false)
  assert.equal(json.includes("tenantId"), false)
  assert.equal(json.includes("actorUserId"), false)
  assert.equal(json.includes("role"), false)
  assert.equal(json.includes("token"), false)
  assert.equal(json.includes("secret"), false)
  assert.equal(json.includes("rawPayload"), false)
  assert.equal(json.includes("rawBody"), false)
})

// ─── Deterministic ────────────────────────────────────────────

test("buildActionPlan is deterministic", () => {
  const a = buildActionPlan({ wu: mockWu(), previewRefCount: 1, previewStatus: "created" })
  const b = buildActionPlan({ wu: mockWu(), previewRefCount: 1, previewStatus: "created" })
  assert.deepEqual(a, b)
})

// ─── Warnings for risky variants ──────────────────────────────

test("database variant includes irreversible warning", () => {
  const plan = buildActionPlan({ wu: mockWu({ sourceProvider: "notion" }), previewRefCount: 1, previewStatus: "created" })
  assert.ok(plan.warnings.some((w) => w.includes("irreversible")))
})

test("unknown variant includes manual review warning", () => {
  const plan = buildActionPlan({ wu: mockWu({ sourceProvider: "xyz", repository: undefined }), previewRefCount: 1, previewStatus: "created" })
  assert.ok(plan.warnings.some((w) => w.includes("manual review")))
})
