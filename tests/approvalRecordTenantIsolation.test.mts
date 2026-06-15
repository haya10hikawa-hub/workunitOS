import test from "node:test"
import assert from "node:assert/strict"
import { createInMemoryApprovalRecordRepository } from "../app/lib/persistence/inMemoryRepositories.ts"
import type { ApprovalRecordRow, TenantDbContext } from "../app/lib/persistence/types.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const TENANT_A = "tenant-a" as TenantId
const TENANT_B = "tenant-b" as TenantId

const ctxA: TenantDbContext = { tenantId: TENANT_A, db: null }
const ctxB: TenantDbContext = { tenantId: TENANT_B, db: null }

function makeRow(overrides: Partial<ApprovalRecordRow> = {}): ApprovalRecordRow {
  return {
    id: overrides.id ?? "approval:1",
    tenantId: overrides.tenantId ?? TENANT_A,
    workUnitId: overrides.workUnitId ?? "wu:1",
    actionPreviewId: overrides.actionPreviewId ?? "preview:1",
    actionType: overrides.actionType ?? "slack_reply",
    targetHash: overrides.targetHash ?? "hash-target",
    payloadHash: overrides.payloadHash ?? "hash-payload",
    status: overrides.status ?? "approved",
    approvedByUserId: overrides.approvedByUserId ?? undefined,
    createdAt: overrides.createdAt ?? "2026-06-01T00:00:00.000Z",
    approvedAt: overrides.approvedAt ?? "2026-06-01T00:01:00.000Z",
    expiresAt: overrides.expiresAt ?? "2026-06-15T00:00:00.000Z",
    usedAt: overrides.usedAt ?? undefined,
  }
}

// ─── Tenant isolation ────────────────────────────────────────────

test("findByWorkUnitId filters by tenantId", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  repo.addRecord(makeRow({ id: "a1", tenantId: TENANT_A, workUnitId: "wu:shared" }))
  repo.addRecord(makeRow({ id: "b1", tenantId: TENANT_B, workUnitId: "wu:shared" }))

  const resultsA = await repo.findByWorkUnitId(ctxA, "wu:shared")
  assert.equal(resultsA.length, 1)
  assert.equal(resultsA[0].id, "a1")
  assert.equal(resultsA[0].tenantId, TENANT_A)

  const resultsB = await repo.findByWorkUnitId(ctxB, "wu:shared")
  assert.equal(resultsB.length, 1)
  assert.equal(resultsB[0].id, "b1")
  assert.equal(resultsB[0].tenantId, TENANT_B)
})

test("findByWorkUnitId returns empty for non-existent workUnitId", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  repo.addRecord(makeRow({ id: "a1", workUnitId: "wu:1" }))
  const results = await repo.findByWorkUnitId(ctxA, "wu:nonexistent")
  assert.deepEqual(results, [])
})

test("findByPreviewId filters by tenantId", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  repo.addRecord(makeRow({ id: "a1", tenantId: TENANT_A, actionPreviewId: "preview:shared" }))
  repo.addRecord(makeRow({ id: "b1", tenantId: TENANT_B, actionPreviewId: "preview:shared" }))

  const resultA = await repo.findByPreviewId(ctxA, "preview:shared")
  assert.ok(resultA !== null)
  assert.equal(resultA!.id, "a1")

  const resultB = await repo.findByPreviewId(ctxB, "preview:shared")
  assert.ok(resultB !== null)
  assert.equal(resultB!.id, "b1")

  // Wrong tenant returns null
  const resultWrong = await repo.findByPreviewId(ctxA, "preview:shared")
  assert.ok(resultWrong !== null)
  assert.equal(resultWrong!.tenantId, TENANT_A)
})

test("findByPreviewId returns null for wrong tenant", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  repo.addRecord(makeRow({ id: "b1", tenantId: TENANT_B, actionPreviewId: "preview:b" }))

  const result = await repo.findByPreviewId(ctxA, "preview:b")
  assert.equal(result, null)
})

// ─── Sorting ──────────────────────────────────────────────────────

test("findByWorkUnitId sorts by createdAt descending", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  repo.addRecord(makeRow({ id: "a1", createdAt: "2026-06-01T00:00:00.000Z" }))
  repo.addRecord(makeRow({ id: "a2", createdAt: "2026-06-05T00:00:00.000Z" }))
  repo.addRecord(makeRow({ id: "a3", createdAt: "2026-06-03T00:00:00.000Z" }))

  const results = await repo.findByWorkUnitId(ctxA, "wu:1")
  assert.equal(results.length, 3)
  assert.equal(results[0].id, "a2") // newest first
  assert.equal(results[1].id, "a3")
  assert.equal(results[2].id, "a1") // oldest last
})

// ─── Status filtering ────────────────────────────────────────────

test("findByWorkUnitId returns all statuses", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  repo.addRecord(makeRow({ id: "a1", status: "approved" }))
  repo.addRecord(makeRow({ id: "a2", status: "rejected" }))
  repo.addRecord(makeRow({ id: "a3", status: "used" }))

  const results = await repo.findByWorkUnitId(ctxA, "wu:1")
  assert.equal(results.length, 3)
  const statuses = results.map((r) => r.status).sort()
  assert.deepEqual(statuses, ["approved", "rejected", "used"])
})
