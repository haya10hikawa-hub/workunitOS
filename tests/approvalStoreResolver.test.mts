import test from "node:test"
import assert from "node:assert/strict"
import {
  resolveApprovalStoreConfig,
  resolveApprovalStore,
  getDevInMemoryApprovalRepository,
  resetDevInMemoryApprovalRepositoryForTests,
} from "../app/lib/security/approvalStoreResolver.ts"
import { defaultDenyApprovalStore, verifyApproval } from "../app/lib/security/approvalStore.ts"
import { createApprovalPreview } from "../app/lib/security/actionApproval.ts"
import { approvalRecordDomainToRow } from "../app/lib/persistence/mappers.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const tenantId = "test-tenant" as TenantId

// ─── Resolver Config ────────────────────────────────────────────

test("production: mode is default_deny even with in-memory flag", () => {
  resetDevInMemoryApprovalRepositoryForTests()
  const config = resolveApprovalStoreConfig({
    NODE_ENV: "production",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })
  assert.equal(config.mode, "default_deny")
  assert.equal(config.isProduction, true)
})

test("development without flag: mode is default_deny", () => {
  resetDevInMemoryApprovalRepositoryForTests()
  const config = resolveApprovalStoreConfig({
    NODE_ENV: "development",
  })
  assert.equal(config.mode, "default_deny")
})

test("development with flag: mode is in_memory", () => {
  resetDevInMemoryApprovalRepositoryForTests()
  const config = resolveApprovalStoreConfig({
    NODE_ENV: "development",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })
  assert.equal(config.mode, "in_memory")
  assert.equal(config.isProduction, false)
})

// ─── Resolver Instance ──────────────────────────────────────────

test("resolveApprovalStore returns default_deny in production", () => {
  resetDevInMemoryApprovalRepositoryForTests()
  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "production",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })
  // Verify it's the default deny (findApprovalById returns null)
  assert.ok(store)
})

test("resolveApprovalStore returns default_deny without flag", () => {
  resetDevInMemoryApprovalRepositoryForTests()
  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "development",
  })
  assert.ok(store)
})

test("resolveApprovalStore returns in-memory store with flag", () => {
  resetDevInMemoryApprovalRepositoryForTests()
  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "development",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })
  assert.ok(store)
  // findApprovalById should work (return null for missing)
  store.findApprovalById("nonexistent").then((r) => assert.equal(r, null))
})

// ─── In-Memory Store via Resolver ───────────────────────────────

test("in-memory store via resolver: can seed and verify approval", async () => {
  resetDevInMemoryApprovalRepositoryForTests()

  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "development",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })

  // Seed an approved record via the shared repo
  const repo = getDevInMemoryApprovalRepository()
  assert.ok(repo, "repo should be initialized")

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: "preview-1",
    actionType: "slack_reply", target: "#general", payload: { body: "test" },
  })
  await repo.create(
    { tenantId, db: null },
    approvalRecordDomainToRow({ ...record, status: "approved" }),
  )

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "preview-1",
    approvalId: record.id, actionType: "slack_reply",
    targetHash: record.targetHash, payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, true)
})

test("in-memory store via resolver: used approval fails after markUsed", async () => {
  resetDevInMemoryApprovalRepositoryForTests()

  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "development",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })

  const repo = getDevInMemoryApprovalRepository()
  assert.ok(repo)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-2", actionPreviewId: "p2",
    actionType: "github_issue", target: "acme/ops", payload: { title: "Fix" },
  })
  await repo.create(
    { tenantId, db: null },
    approvalRecordDomainToRow({ ...record, status: "approved" }),
  )

  // Mark used
  await store.markApprovalUsed(record.id, new Date().toISOString())

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-2", actionPreviewId: "p2",
    approvalId: record.id, actionType: "github_issue",
    targetHash: record.targetHash, payloadHash: record.payloadHash,
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_used")
})

test("in-memory store via resolver: wrong tenant blocked", async () => {
  resetDevInMemoryApprovalRepositoryForTests()

  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "development",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })

  const repo = getDevInMemoryApprovalRepository()
  assert.ok(repo)

  const record = createApprovalPreview({
    tenantId, workUnitId: "wu-3", actionPreviewId: "p3",
    actionType: "slack_reply", target: "#g", payload: { body: "x" },
  })
  await repo.create(
    { tenantId, db: null },
    approvalRecordDomainToRow({ ...record, status: "approved" }),
  )

  const result = await verifyApproval(store, {
    tenantId: "other-tenant" as TenantId, workUnitId: "wu-3",
    actionPreviewId: "p3", approvalId: record.id,
    actionType: "slack_reply", targetHash: record.targetHash,
    payloadHash: record.payloadHash, now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "forbidden")
})

test("in-memory store via resolver: missing approval → approval_required", async () => {
  resetDevInMemoryApprovalRepositoryForTests()

  const store = resolveApprovalStore(tenantId, {
    NODE_ENV: "development",
    ALLOW_IN_MEMORY_APPROVAL_STORE: "true",
  })

  const result = await verifyApproval(store, {
    tenantId, workUnitId: "wu-x", actionPreviewId: "px",
    approvalId: "nonexistent", actionType: "slack_reply",
    targetHash: "h1", payloadHash: "h2",
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})

test("default_deny store always returns approval_required", async () => {
  const result = await verifyApproval(defaultDenyApprovalStore, {
    tenantId, workUnitId: "wu-1", actionPreviewId: "p1",
    approvalId: "any", actionType: "slack_reply",
    targetHash: "h1", payloadHash: "h2",
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})
