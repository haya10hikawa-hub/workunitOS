import test from "node:test"
import assert from "node:assert/strict"
import { createInMemoryApprovalRecordRepository } from "../app/lib/persistence/inMemoryRepositories.ts"
import { createRepositoryBackedApprovalStore } from "../app/lib/persistence/approvalStoreAdapter.ts"
import { verifyApproval } from "../app/lib/security/approvalStore.ts"
import { createApprovalPreview } from "../app/lib/security/actionApproval.ts"
import { approvalRecordDomainToRow, approvalRecordRowToDomain } from "../app/lib/persistence/mappers.ts"
import type { TenantDbContext } from "../app/lib/persistence/types.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const tenantId = "test-tenant" as TenantId
const ctx: TenantDbContext = { tenantId, db: null }

// ─── In-Memory Repository ───────────────────────────────────────

test("in-memory repo: create and findById", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const record = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "test" },
  })

  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))
  const found = await repo.findById(ctx, record.id)
  assert.ok(found)
  assert.equal(found.status, "approved")
})

test("in-memory repo: findById returns null for missing", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const found = await repo.findById(ctx, "nonexistent")
  assert.equal(found, null)
})

test("in-memory repo: findByPreviewId", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "preview-1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "pending" }))

  const found = await repo.findByPreviewId(ctx, "preview-1")
  assert.ok(found)
  assert.equal(found.actionPreviewId, "preview-1")
})

test("in-memory repo: updateStatus", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "pending" }))

  const updated = await repo.updateStatus(ctx, record.id, "approved")
  assert.ok(updated)
  assert.equal(updated.status, "approved")

  const found = await repo.findById(ctx, record.id)
  assert.equal(found?.status, "approved")
})

test("in-memory repo: markUsed sets status and usedAt", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const usedAt = new Date().toISOString()
  const updated = await repo.markUsed(ctx, record.id, usedAt)
  assert.ok(updated)
  assert.equal(updated.status, "used")
  assert.equal(updated.usedAt, usedAt)
})

// ─── Repository-Backed ApprovalStore ────────────────────────────

test("repo-backed store: findApprovalById returns domain record", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "preview-1",
    actionType: "slack_reply", target: "#general", payload: { body: "test" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const found = await store.findApprovalById(record.id)
  assert.ok(found)
  assert.equal(found.status, "approved")
  assert.equal(found.targetHash, record.targetHash)
})

test("repo-backed store: findApprovalById returns null for missing", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const found = await store.findApprovalById("nonexistent")
  assert.equal(found, null)
})

test("repo-backed store: markApprovalUsed updates status", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const usedAt = new Date().toISOString()
  await store.markApprovalUsed(record.id, usedAt)

  const found = await repo.findById(ctx, record.id)
  assert.equal(found?.status, "used")
  assert.equal(found?.usedAt, usedAt)
})

// ─── verifyApproval with Repo-Backed Store ──────────────────────

test("verifyApproval: matching approved record passes", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "preview-1",
    actionType: "slack_reply", target: "#general", payload: { body: "test" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "preview-1",
    approvalId: record.id, actionType: "slack_reply",
    targetHash: record.targetHash, payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, true)
})

test("verifyApproval: missing approval returns approval_required", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    approvalId: "nonexistent", actionType: "slack_reply",
    targetHash: "h1", payloadHash: "h2",
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})

test("verifyApproval: used approval fails after markUsed", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "github_issue", target: "acme/ops", payload: { title: "Fix" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))
  await store.markApprovalUsed(record.id, new Date().toISOString())

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    approvalId: record.id, actionType: "github_issue",
    targetHash: record.targetHash, payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_used")
})

test("verifyApproval: wrong tenant returns forbidden", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const result = await verifyApproval(store, {
    tenantId: "other-tenant" as TenantId, workUnitId: "wu-1",
    actionPreviewId: "p1", approvalId: record.id,
    actionType: "slack_reply", targetHash: record.targetHash,
    payloadHash: record.payloadHash, now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "forbidden")
})

test("verifyApproval: payload mismatch returns approval_payload_mismatch", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "original" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    approvalId: record.id, actionType: "slack_reply",
    targetHash: record.targetHash, payloadHash: "different",
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_payload_mismatch")
})

test("verifyApproval: target mismatch returns approval_target_mismatch", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    approvalId: record.id, actionType: "slack_reply",
    targetHash: "different", payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_target_mismatch")
})

test("verifyApproval: expired approval returns approval_expired", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const store = createRepositoryBackedApprovalStore(repo, ctx)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
    ttlMinutes: 1,
  })
  await repo.create(ctx, approvalRecordDomainToRow({ ...record, status: "approved" }))

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    approvalId: record.id, actionType: "slack_reply",
    targetHash: record.targetHash, payloadHash: record.payloadHash,
    now: new Date(Date.now() + 2 * 60_000).toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_expired")
})

// ─── Mappers ────────────────────────────────────────────────────

test("mappers: round-trip preserves all fields", () => {
  const domain = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  const approved: typeof domain = { ...domain, status: "approved", approvedAt: new Date().toISOString(), approvedByUserId: "u1" as unknown as typeof domain["approvedByUserId"] }

  const row = approvalRecordDomainToRow(approved)
  const back = approvalRecordRowToDomain(row)

  assert.equal(back.id, approved.id)
  assert.equal(back.status, "approved")
  assert.equal(back.targetHash, approved.targetHash)
  assert.equal(back.payloadHash, approved.payloadHash)
  assert.equal(back.expiresAt, approved.expiresAt)
})
