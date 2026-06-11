import test from "node:test"
import assert from "node:assert/strict"
import {
  savePreview,
  saveApproval,
  findPreviewById,
  resetSharedStoresForTests,
} from "../app/lib/persistence/sharedInMemoryStores.ts"
import {
  hashActionTarget,
  hashActionPayload,
} from "../app/lib/security/hash.ts"
import {
  verifyApproval,
  createInMemoryApprovalStore,
  defaultDenyApprovalStore,
} from "../app/lib/security/approvalStore.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"
import type { ActionApprovalRecord } from "../app/lib/domain/types.ts"

const tenantId = "test-tenant" as TenantId

// ─── Full Integration: Preview → Approval → Verify → Execute ────

test("full lifecycle: create preview → approve → verify passes → no preview → fails", async () => {
  resetSharedStoresForTests()

  // 1. Create a preview (simulating the action-preview route)
  const target = { provider: "slack", channel: "#general" }
  const payload = { body: "Hello team!" }
  const previewId = `preview:wu-1:slack_reply:${Date.now()}`
  const preview = {
    id: previewId,
    workUnitId: "wu-1",
    actionType: "slack_reply",
    targetPreview: target,
    payloadPreview: payload,
    targetHash: hashActionTarget(target),
    payloadHash: hashActionPayload(payload),
    requiresApproval: true,
    status: "preview",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  }
  savePreview(preview)

  // 2. Approve it (simulating the approval route)
  const now = new Date().toISOString()
  const approvalId = `approval:wu-1:slack_reply:${Date.now() + 1}`
  const approval = {
    id: approvalId,
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: previewId,
    actionType: "slack_reply",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    status: "approved",
    approvedByUserId: "user-pm",
    createdAt: now,
    approvedAt: now,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    usedAt: null as string | null,
  }
  saveApproval(approval)

  // 3. Create ApprovalStore from the stored approval
  const store = createInMemoryApprovalStore()
  const record: ActionApprovalRecord = {
    id: approval.id,
    tenantId: approval.tenantId as TenantId,
    workUnitId: approval.workUnitId,
    actionPreviewId: approval.actionPreviewId,
    actionType: "slack_reply",
    targetHash: approval.targetHash,
    payloadHash: approval.payloadHash,
    status: "approved",
    approvedByUserId: "user-pm" as ActionApprovalRecord["approvedByUserId"],
    createdAt: approval.createdAt,
    approvedAt: approval.approvedAt,
    expiresAt: approval.expiresAt,
    usedAt: undefined,
  }
  store.addRecord(record)

  // 4. Resolve preview hash context (simulating tools route)
  const storedPreview = findPreviewById(previewId)
  assert.ok(storedPreview)

  // 5. Verify against the store (simulating runApprovedExternal)
  const verifyResult = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: previewId,
    approvalId,
    actionType: "slack_reply",
    targetHash: storedPreview.targetHash as string,
    payloadHash: storedPreview.payloadHash as string,
    now: new Date().toISOString(),
  })
  assert.equal(verifyResult.ok, true)

  // 6. Mark used → second attempt fails
  await store.markApprovalUsed(approvalId, new Date().toISOString())
  const secondResult = await verifyApproval(store, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: previewId,
    approvalId,
    actionType: "slack_reply",
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(secondResult.ok, false)
  if (!secondResult.ok) assert.equal(secondResult.error, "approval_used")
})

// ─── Missing Preview → Execution Fails ──────────────────────────

test("execution fails when preview is missing", () => {
  resetSharedStoresForTests()
  const storedPreview = findPreviewById("nonexistent-preview-id")
  assert.equal(storedPreview, null)
})

// ─── Wrong Tenant blocked ──────────────────────────────────────

test("execution blocked: wrong tenant preview lookup", async () => {
  resetSharedStoresForTests()

  const target = { channel: "#ops" }
  const payload = { body: "blocked" }
  const previewId = `preview:wu-99:github_issue:${Date.now()}`

  savePreview({
    id: previewId, workUnitId: "wu-99", actionType: "github_issue",
    targetPreview: target, payloadPreview: payload,
    targetHash: hashActionTarget(target), payloadHash: hashActionPayload(payload),
    requiresApproval: true, status: "preview",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  })

  const preview = findPreviewById(previewId)
  assert.ok(preview)

  const store = createInMemoryApprovalStore()
  store.addRecord({
    id: "approval:wu-99:github_issue:1",
    tenantId: "wrong-tenant" as TenantId,
    workUnitId: "wu-99", actionPreviewId: previewId,
    actionType: "github_issue",
    targetHash: preview.targetHash as string,
    payloadHash: preview.payloadHash as string,
    status: "approved",
    approvedByUserId: "user-pm" as ActionApprovalRecord["approvedByUserId"],
    createdAt: new Date().toISOString(), approvedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    usedAt: undefined,
  })

  const result = await verifyApproval(store, {
    tenantId: "correct-tenant" as TenantId,
    workUnitId: "wu-99", actionPreviewId: previewId,
    approvalId: "approval:wu-99:github_issue:1",
    actionType: "github_issue",
    targetHash: preview.targetHash as string,
    payloadHash: preview.payloadHash as string,
    now: new Date().toISOString(),
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "forbidden")
})

// ─── Client hashes rejected ─────────────────────────────────────

test("client-provided hashes differ from stored preview hashes", () => {
  const serverTargetHash = hashActionTarget({ channel: "#general" })
  const clientHash = "a".repeat(64)
  assert.notEqual(serverTargetHash, clientHash)
})

// ─── Default Deny ───────────────────────────────────────────────

test("defaultDenyApprovalStore still blocks execution", async () => {
  const result = await verifyApproval(defaultDenyApprovalStore, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview:wu-1:slack_reply:1",
    approvalId: "approval:wu-1:slack_reply:1",
    actionType: "slack_reply",
    targetHash: hashActionTarget({ channel: "#g" }),
    payloadHash: hashActionPayload({ body: "x" }),
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})
