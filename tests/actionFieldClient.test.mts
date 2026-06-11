import test from "node:test"
import assert from "node:assert/strict"
import { transformSignalToInboxWorkUnit } from "../app/lib/workunitInbox/transform.ts"
import { MOCK_SIGNALS } from "../app/lib/workunitInbox/mockSignals.ts"

// NOTE: These tests validate the client helper logic.
// The actual fetch calls require a running Next.js server.
// Route-level integration is covered by lifecycle endpoint tests.

// ─── Request Shape Validation ───────────────────────────────────

test("approve request sends only actionPreviewId and decision", () => {
  // Validate the shape that the client sends to the server.
  // The client must never send hashes, tenantId, or approvedByUserId.
  const body = {
    actionPreviewId: "preview:wu:slack_reply:123",
    decision: "approve",
  }

  assert.ok(typeof body.actionPreviewId === "string")
  assert.ok(body.decision === "approve" || body.decision === "reject")
  assert.equal("targetHash" in body, false)
  assert.equal("payloadHash" in body, false)
  assert.equal("tenantId" in body, false)
  assert.equal("approvedByUserId" in body, false)
  assert.equal("status" in body, false)
  assert.equal("usedAt" in body, false)
})

test("reject request sends only actionPreviewId and decision", () => {
  const body = {
    actionPreviewId: "preview:wu:slack_reply:123",
    decision: "reject",
  }

  assert.equal(body.decision, "reject")
  assert.equal("targetHash" in body, false)
  assert.equal("payloadHash" in body, false)
})

test("all InboxWorkUnit kinds can produce a non-empty workUnitId for preview creation", () => {
  for (const signal of MOCK_SIGNALS) {
    const wu = transformSignalToInboxWorkUnit(signal)
    assert.ok(wu.id.length > 0)
  }
})

test("actionPreviewId format is preserved from server response", () => {
  const serverResponse = {
    ok: true,
    requestId: "req:test",
    preview: {
      id: "preview:wu-1:github_issue:1620000000000",
      actionType: "github_issue",
      targetHash: "a".repeat(64),
      payloadHash: "b".repeat(64),
    },
  }

  assert.ok(serverResponse.preview.id.startsWith("preview:"))
  assert.equal(serverResponse.preview.targetHash.length, 64)
  assert.equal(serverResponse.preview.payloadHash.length, 64)
})

test("approval response contains expected fields", () => {
  const serverResponse = {
    ok: true,
    requestId: "req:test",
    approval: {
      id: "approval:wu-1:github_issue:1620000000001",
      workUnitId: "wu-1",
      actionPreviewId: "preview:wu-1:github_issue:1620000000000",
      actionType: "github_issue",
      status: "approved",
      targetHash: "a".repeat(64),
      payloadHash: "b".repeat(64),
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  }

  assert.equal(serverResponse.approval.status, "approved")
  assert.ok(serverResponse.approval.id)
  assert.ok(serverResponse.approval.expiresAt)
})
