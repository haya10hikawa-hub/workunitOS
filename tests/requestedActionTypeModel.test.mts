import test from "node:test"
import assert from "node:assert/strict"
import {
  deriveRequestedActionType,
  type DeriveActionTypeInput,
} from "../app/lib/application/dashboard/requestedActionTypeModel.ts"

// ─── Fixtures ───────────────────────────────────────────────────

function input(overrides: Partial<DeriveActionTypeInput> = {}): DeriveActionTypeInput {
  return {
    sourceProvider: "slack",
    hasRepository: false,
    ...overrides,
  }
}

// ─── Canonical mappings ────────────────────────────────────────

test("slack source → slack_reply", () => {
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "slack" })), "slack_reply")
})

test("calendar source → calendar_block", () => {
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "calendar" })), "calendar_block")
})

test("github with repository → github_issue", () => {
  assert.equal(
    deriveRequestedActionType(input({ sourceProvider: "github", hasRepository: true })),
    "github_issue",
  )
})

test("github without repository → database_update", () => {
  assert.equal(
    deriveRequestedActionType(input({ sourceProvider: "github", hasRepository: false })),
    "database_update",
  )
})

test("email source → email_send", () => {
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "email" })), "email_send")
})

test("gmail source → email_send", () => {
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "gmail" })), "email_send")
})

test("unknown provider → null", () => {
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "unknown" })), null)
})

test("empty provider → null", () => {
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "" })), null)
})

// ─── No natural language in output ─────────────────────────────

test("output is never natural-language text", () => {
  // All valid outputs are canonical type codes, not sentences
  const results = [
    deriveRequestedActionType(input({ sourceProvider: "slack" })),
    deriveRequestedActionType(input({ sourceProvider: "calendar" })),
    deriveRequestedActionType(input({ sourceProvider: "github", hasRepository: true })),
    deriveRequestedActionType(input({ sourceProvider: "github", hasRepository: false })),
    deriveRequestedActionType(input({ sourceProvider: "unknown" })),
  ]
  for (const r of results) {
    if (r !== null) {
      // Must be one of the known codes — no spaces, no natural language
      assert.ok(
        ["slack_reply", "github_issue", "calendar_block", "email_send", "database_update"].includes(r),
        `unexpected output: ${r}`,
      )
    }
  }
})

// ─── No forbidden fields in output ────────────────────────────

test("output contains no forbidden fields", () => {
  // The function returns a string or null — verify no complex objects
  const r = deriveRequestedActionType(input({ sourceProvider: "slack" }))
  assert.equal(typeof r, "string")
  assert.equal(r?.includes("tenantId"), false)
  assert.equal(r?.includes("hash"), false)
  assert.equal(r?.includes("token"), false)
  assert.equal(r?.includes("secret"), false)
})

test("null output is valid when provider unknown", () => {
  const r = deriveRequestedActionType(input({ sourceProvider: "notion" }))
  assert.equal(r, null)
})

// ─── Deterministic ─────────────────────────────────────────────

test("same input produces same output", () => {
  const a = deriveRequestedActionType(input({ sourceProvider: "slack", hasRepository: true }))
  const b = deriveRequestedActionType(input({ sourceProvider: "slack", hasRepository: true }))
  assert.equal(a, b)
})

test("hasRepository true does not affect non-github providers", () => {
  // For slack, hasRepository is irrelevant
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "slack", hasRepository: true })), "slack_reply")
  assert.equal(deriveRequestedActionType(input({ sourceProvider: "slack", hasRepository: false })), "slack_reply")
})
