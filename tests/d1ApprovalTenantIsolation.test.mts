import test from "node:test"
import assert from "node:assert/strict"
import { D1ActionPreviewRepository } from "../app/lib/persistence/d1/actionPreviewRepository.ts"
import { D1ApprovalRecordRepository } from "../app/lib/persistence/d1/approvalRecordRepository.ts"
import type { ActionPreviewRow, ApprovalRecordRow, TenantDbContext } from "../app/lib/persistence/types.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"
import { FakeD1Database } from "./helpers/fakeD1.ts"

const ownCtx: TenantDbContext = { tenantId: "tenant:a" as TenantId, db: null }
const otherCtx: TenantDbContext = { tenantId: "tenant:b" as TenantId, db: null }

test("D1 action previews are tenant-scoped for id and workUnit lookups", async () => {
  const repo = new D1ActionPreviewRepository(new FakeD1Database())
  await repo.create(ownCtx, previewRow())
  assert.ok(await repo.findById(ownCtx, "preview:1"))
  assert.equal(await repo.findById(otherCtx, "preview:1"), null)
  assert.equal((await repo.findByWorkUnitId(otherCtx, "wu:1")).length, 0)
})

test("D1 approval records are tenant-scoped for id preview workUnit and updates", async () => {
  const db = new FakeD1Database()
  const repo = new D1ApprovalRecordRepository(db)
  await repo.create(ownCtx, approvalRow())

  assert.ok(await repo.findById(ownCtx, "approval:1"))
  assert.equal(await repo.findById(otherCtx, "approval:1"), null)
  assert.equal(await repo.findByPreviewId(otherCtx, "preview:1"), null)
  assert.equal((await repo.findByWorkUnitId(otherCtx, "wu:1")).length, 0)

  assert.equal(await repo.updateStatus(otherCtx, "approval:1", "rejected"), null)
  assert.equal((await repo.findById(ownCtx, "approval:1"))?.status, "approved")
  assert.equal(await repo.markUsed(otherCtx, "approval:1", "2026-06-22T00:00:00.000Z"), null)
  assert.equal((await repo.findById(ownCtx, "approval:1"))?.status, "approved")
})

function previewRow(): ActionPreviewRow {
  return {
    id: "preview:1",
    tenantId: ownCtx.tenantId,
    workUnitId: "wu:1",
    actionType: "internal_task",
    targetPreview: "{}",
    payloadPreview: "{}",
    requiresApproval: 1,
    status: "preview",
    targetHash: "target-hash",
    payloadHash: "payload-hash",
    createdAt: "2026-06-22T00:00:00.000Z",
  }
}

function approvalRow(): ApprovalRecordRow {
  return {
    id: "approval:1",
    tenantId: ownCtx.tenantId,
    workUnitId: "wu:1",
    actionPreviewId: "preview:1",
    actionType: "internal_task",
    targetHash: "target-hash",
    payloadHash: "payload-hash",
    status: "approved",
    createdAt: "2026-06-22T00:00:00.000Z",
    approvedAt: "2026-06-22T00:00:00.000Z",
    expiresAt: "2026-06-23T00:00:00.000Z",
  }
}
