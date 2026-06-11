import test from "node:test"
import assert from "node:assert/strict"
import {
  createApprovalPreview,
  approvalActionTypeForOperation,
  hashActionTarget,
  hashActionPayload,
} from "../app/lib/security/actionApproval.ts"
import {
  verifyApproval,
  defaultDenyApprovalStore,
  createInMemoryApprovalStore,
} from "../app/lib/security/approvalStore.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const tenantId = "test-tenant" as TenantId

test("approvalActionTypeForOperation maps external operations correctly", () => {
  assert.equal(approvalActionTypeForOperation("reply"), "slack_reply")
  assert.equal(approvalActionTypeForOperation("schedule"), "calendar_event")
  assert.equal(approvalActionTypeForOperation("create_issue"), "github_issue")
  assert.equal(approvalActionTypeForOperation("ingest"), null)
  assert.equal(approvalActionTypeForOperation("draft"), null)
  assert.equal(approvalActionTypeForOperation("create_task"), null)
})

test("createApprovalPreview builds a valid pending record", () => {
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general:thread-123",
    payload: { body: "確認しました" },
  })

  assert.equal(record.tenantId, tenantId)
  assert.equal(record.status, "pending")
  assert.equal(record.actionPreviewId, "preview-1")
  assert.ok(record.id.startsWith("approval:"))
  assert.ok(record.targetHash.length > 0)
  assert.ok(record.payloadHash.length > 0)
  assert.ok(new Date(record.expiresAt) > new Date(record.createdAt))
})

test("createApprovalPreview respects custom TTL", () => {
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-2",
    actionPreviewId: "preview-2",
    actionType: "github_issue",
    target: "acme/ops",
    payload: { title: "Security review" },
    ttlMinutes: 30,
  })

  const expires = new Date(record.expiresAt).getTime()
  const created = new Date(record.createdAt).getTime()
  const diffMinutes = (expires - created) / 60_000
  assert.ok(diffMinutes >= 29 && diffMinutes <= 31)
})

// ─── Approval Store Verification ────────────────────────────────

test("default approval store denies all", async () => {
  const result = await verifyApproval(defaultDenyApprovalStore, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: "any-id",
    actionType: "slack_reply",
    targetHash: "h123",
    payloadHash: "h456",
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})

test("in-memory store: approved record passes verification", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
  })
  // Manually approve the record
  store.addRecord({ ...record, status: "approved" })

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: record.id,
    actionType: "slack_reply",
    targetHash: record.targetHash,
    payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, true)
})

test("in-memory store: wrong tenant returns forbidden", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
  })
  store.addRecord({ ...record, status: "approved" })

  const result = await verifyApproval(store, {
    tenantId: "other-tenant" as TenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: record.id,
    actionType: "slack_reply",
    targetHash: record.targetHash,
    payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "forbidden")
})

test("in-memory store: payload mismatch returns approval_payload_mismatch", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "original" },
  })
  store.addRecord({ ...record, status: "approved" })

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: record.id,
    actionType: "slack_reply",
    targetHash: record.targetHash,
    payloadHash: "different-hash",  // mismatched
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_payload_mismatch")
})

test("in-memory store: target mismatch returns approval_target_mismatch", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
  })
  store.addRecord({ ...record, status: "approved" })

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: record.id,
    actionType: "slack_reply",
    targetHash: "different-hash",  // mismatched
    payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_target_mismatch")
})

test("in-memory store: expired approval returns approval_expired", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
    ttlMinutes: 1,
  })
  store.addRecord({ ...record, status: "approved" })

  // 2 minutes later
  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: record.id,
    actionType: "slack_reply",
    targetHash: record.targetHash,
    payloadHash: record.payloadHash,
    now: new Date(Date.now() + 2 * 60_000).toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_expired")
})

test("in-memory store: used approval returns approval_used", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
  })
  store.addRecord({ ...record, status: "used", usedAt: new Date().toISOString() })

  const result = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: record.id,
    actionType: "slack_reply",
    targetHash: record.targetHash,
    payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_used")
})

test("in-memory store: can mark approval as used", async () => {
  const store = createInMemoryApprovalStore()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
  })
  store.addRecord({ ...record, status: "approved" })

  const usedAt = new Date().toISOString()
  await store.markApprovalUsed(record.id, usedAt)
  const updated = await store.findApprovalById(record.id)
  assert.ok(updated)
  assert.equal(updated.status, "used")
  assert.equal(updated.usedAt, usedAt)
})

test("hashActionTarget produces consistent output", () => {
  const a = hashActionTarget({ destination: "#general" })
  const b = hashActionTarget({ destination: "#general" })
  assert.equal(a, b)
  assert.ok(a.length > 0)
})

test("hashActionTarget produces different output for different targets", () => {
  assert.notEqual(hashActionTarget({ destination: "#general" }), hashActionTarget({ destination: "#random" }))
})

test("hashActionPayload produces consistent output", () => {
  const a = hashActionPayload({ body: "test" })
  const b = hashActionPayload({ body: "test" })
  assert.equal(a, b)
})

test("hashActionPayload detects payload changes", () => {
  assert.notEqual(
    hashActionPayload({ body: "original" }),
    hashActionPayload({ body: "tampered" }),
  )
})
