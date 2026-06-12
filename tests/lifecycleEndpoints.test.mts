import test from "node:test"
import assert from "node:assert/strict"

import { hashActionTarget, hashActionPayload } from "../app/lib/security/hash.ts"
import { verifyApproval, createInMemoryApprovalStore } from "../app/lib/security/approvalStore.ts"
import { hasPermission } from "../app/lib/security/rbac.ts"
import { createDevSessionWithRole } from "../app/lib/security/session.ts"
import type { TenantId, UserId } from "../app/lib/tenant/types.ts"
import type { ApprovalActionType } from "../app/lib/domain/types.ts"

const tenantId = "test-tenant" as TenantId

// ─── ActionPreview Hash Generation ──────────────────────────────

test("ActionPreview targetHash is SHA-256 hex of canonical target", () => {
  const target = { provider: "slack", channel: "#general", identifier: "msg:123" }
  const hash1 = hashActionTarget(target)
  const hash2 = hashActionTarget(target)

  // Deterministic
  assert.equal(hash1, hash2)
  // SHA-256 hex = 64 chars
  assert.equal(hash1.length, 64)
  assert.ok(/^[0-9a-f]{64}$/.test(hash1))

  // Different target → different hash
  const hash3 = hashActionTarget({ channel: "#random" })
  assert.notEqual(hash1, hash3)
})

test("ActionPreview payloadHash is SHA-256 hex of canonical payload", () => {
  const payload = { body: "Hello, this is a test message", channel: "#general" }
  const hash1 = hashActionPayload(payload)
  const hash2 = hashActionPayload(payload)

  assert.equal(hash1, hash2)
  assert.equal(hash1.length, 64)

  // Different payload → different hash
  const hash3 = hashActionPayload({ body: "different message" })
  assert.notEqual(hash1, hash3)
})

test("ActionPreview hashes change when content changes", () => {
  const targetHash1 = hashActionTarget({ channel: "#general" })
  const targetHash2 = hashActionTarget({ channel: "#ops" })
  assert.notEqual(targetHash1, targetHash2)

  const payloadHash1 = hashActionPayload({ body: "approved message" })
  const payloadHash2 = hashActionPayload({ body: "modified message" })
  assert.notEqual(payloadHash1, payloadHash2)
})

// ─── Approval Record Creation (mimicking route logic) ───────────

function createMockPreview(params: {
  workUnitId: string
  actionType: ApprovalActionType
  target: Record<string, unknown>
  payload: Record<string, unknown>
}) {
  return {
    id: `preview:${params.workUnitId}:${params.actionType}:${Date.now()}`,
    workUnitId: params.workUnitId,
    actionType: params.actionType,
    targetPreview: params.target,
    payloadPreview: params.payload,
    targetHash: hashActionTarget(params.target),
    payloadHash: hashActionPayload(params.payload),
    requiresApproval: true,
    status: "preview" as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  }
}

function createMockApproval(
  preview: ReturnType<typeof createMockPreview>,
  decision: "approve" | "reject",
  userId: string,
) {
  const now = new Date().toISOString()
  return {
    id: `approval:${preview.workUnitId}:${preview.actionType}:${Date.now()}`,
    tenantId,
    workUnitId: preview.workUnitId,
    actionPreviewId: preview.id,
    actionType: preview.actionType,
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    status: decision === "approve" ? "approved" as const : "rejected" as const,
    approvedByUserId: decision === "approve" ? (userId as UserId) : undefined,
    createdAt: now,
    approvedAt: decision === "approve" ? now : undefined,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    usedAt: undefined,
  }
}

// ─── Approval Verification Integration ─────────────────────────

test("created approval passes verifyApproval with matching preview hashes", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-1",
    actionType: "slack_reply",
    target: { channel: "#general" },
    payload: { body: "Hello team!" },
  })

  const approval = createMockApproval(preview, "approve", "user-pm")
  store.addRecord(approval)

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "slack_reply",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.approvalId, approval.id)
})

test("verifyApproval rejects changed payloadHash", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-2",
    actionType: "gmail_reply",
    target: { to: "team@acme.com" },
    payload: { subject: "Q3 Review", body: "Original content" },
  })

  const approval = createMockApproval(preview, "approve", "user-pm")
  store.addRecord(approval)

  // Simulate payload was edited after approval
  const modifiedPayloadHash = hashActionPayload({ subject: "Q3 Review", body: "Modified content" })
  assert.notEqual(preview.payloadHash, modifiedPayloadHash)

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-2",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "gmail_reply",
    targetHash: preview.targetHash,
    payloadHash: modifiedPayloadHash, // changed
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_payload_mismatch")
})

test("verifyApproval rejects changed targetHash", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-3",
    actionType: "github_issue",
    target: { repo: "acme/ops" },
    payload: { title: "Fix pipeline" },
  })

  const approval = createMockApproval(preview, "approve", "user-admin")
  store.addRecord(approval)

  const modifiedTargetHash = hashActionTarget({ repo: "acme/website" })
  assert.notEqual(preview.targetHash, modifiedTargetHash)

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-3",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "github_issue",
    targetHash: modifiedTargetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_target_mismatch")
})

test("verifyApproval rejects used approval after markUsed", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-4",
    actionType: "slack_reply",
    target: { channel: "#alerts" },
    payload: { body: "System up" },
  })

  const approval = createMockApproval(preview, "approve", "user-pm")
  store.addRecord(approval)

  await store.markApprovalUsed(approval.id, new Date().toISOString())

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-4",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "slack_reply",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_used")
})

test("verifyApproval rejects wrong tenant", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-5",
    actionType: "calendar_event",
    target: { calendar: "team@acme.com" },
    payload: { summary: "Sprint review", start: "2026-07-01T10:00:00Z" },
  })

  const approval = createMockApproval(preview, "approve", "user-pm")
  store.addRecord(approval)

  const result = await verifyApproval(store, {
    tenantId: "other-tenant" as TenantId,
    workUnitId: "wu-5",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "calendar_event",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "forbidden")
})

test("verifyApproval: rejected approval remains rejected", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-6",
    actionType: "slack_reply",
    target: { channel: "#general" },
    payload: { body: "test" },
  })

  const approval = createMockApproval(preview, "reject", "user-pm")
  store.addRecord(approval)

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-6",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "slack_reply",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})

// ─── RBAC for Lifecycle Endpoints ───────────────────────────────

test("owner can create preview and approve", () => {
  const session = createDevSessionWithRole("owner")
  assert.equal(hasPermission(session, "workunit.create_action_preview"), true)
  assert.equal(hasPermission(session, "workunit.approve_external_action"), true)
})

test("manager can create preview and approve", () => {
  const session = createDevSessionWithRole("manager")
  assert.equal(hasPermission(session, "workunit.create_action_preview"), true)
  assert.equal(hasPermission(session, "workunit.approve_external_action"), true)
})

test("editor can create preview and approve", () => {
  const session = createDevSessionWithRole("editor")
  assert.equal(hasPermission(session, "workunit.create_action_preview"), true)
  assert.equal(hasPermission(session, "workunit.approve_external_action"), true)
})

test("viewer can neither create preview nor approve", () => {
  const session = createDevSessionWithRole("viewer")
  assert.equal(hasPermission(session, "workunit.create_action_preview"), false)
  assert.equal(hasPermission(session, "workunit.approve_external_action"), false)
})

// ─── Client Hash Rejection ──────────────────────────────────────

test("server-generated hashes differ from client-provided ones", () => {
  // Even if a client sends a hash that looks valid, the server
  // generates its own from canonical target/payload objects.
  const serverHash = hashActionTarget({ channel: "#general" })
  const fakeClientHash = "a".repeat(64)

  assert.notEqual(serverHash, fakeClientHash)
  assert.equal(serverHash.length, 64)
})

// ─── Expiry ─────────────────────────────────────────────────────

test("verifyApproval rejects expired approval", async () => {
  const store = createInMemoryApprovalStore()

  const preview = createMockPreview({
    workUnitId: "wu-expired",
    actionType: "slack_reply",
    target: { channel: "#old" },
    payload: { body: "expired" },
  })

  const approval = createMockApproval(preview, "approve", "user-pm")
  store.addRecord({ ...approval, expiresAt: new Date(Date.now() - 60_000).toISOString() })

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-expired",
    actionPreviewId: preview.id,
    approvalId: approval.id,
    actionType: "slack_reply",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_expired")
})
