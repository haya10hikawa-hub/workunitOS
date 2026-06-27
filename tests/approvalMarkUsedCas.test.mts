/**
 * Phase 5B: Approval markUsed atomic compare-and-set hardening.
 *
 * Proves that the one-time-use claim is enforced atomically: an approval can
 * only transition approved -> used once, and only when it is unexpired and
 * tenant-matched. Replays, expired records, non-approved records, and
 * cross-tenant calls do not claim the approval.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { D1ApprovalRecordRepository } from "../app/lib/persistence/d1/approvalRecordRepository.ts"
import { createInMemoryApprovalRecordRepository } from "../app/lib/persistence/inMemoryRepositories.ts"
import { createRepositoryBackedApprovalStore } from "../app/lib/persistence/approvalStoreAdapter.ts"
import { createInMemoryApprovalStore, defaultDenyApprovalStore } from "../app/lib/security/approvalStore.ts"
import { createApprovalPreview } from "../app/lib/security/actionApproval.ts"
import { approvalRecordDomainToRow } from "../app/lib/persistence/mappers.ts"
import { FakeD1Database } from "./helpers/fakeD1.ts"
import type { ApprovalRecordRepository } from "../app/lib/persistence/repositories.ts"
import type { ApprovalRecordRow, TenantDbContext } from "../app/lib/persistence/types.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"
import type { ActionApprovalRecord } from "../app/lib/domain/types.ts"

const tenantId = "tenant-a" as TenantId
const otherTenantId = "tenant-b" as TenantId

const D1_SRC = readFileSync(
  join(import.meta.dirname!, "../app/lib/persistence/d1/approvalRecordRepository.ts"),
  "utf-8",
)
const TOOLBACKEND_SRC = readFileSync(join(import.meta.dirname!, "../app/lib/toolBackend.ts"), "utf-8")

function domainRecord(opts: {
  status?: ActionApprovalRecord["status"]
  tenantId?: TenantId
  ttlMinutes?: number
} = {}): ActionApprovalRecord {
  const rec = createApprovalPreview({
    tenantId: opts.tenantId ?? tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "p1",
    actionType: "slack_reply",
    target: "#general",
    payload: { body: "hello" },
    ttlMinutes: opts.ttlMinutes,
  })
  return { ...rec, status: opts.status ?? "approved" }
}

function row(opts: Parameters<typeof domainRecord>[0] = {}): ApprovalRecordRow {
  return approvalRecordDomainToRow(domainRecord(opts))
}

// ─── D1 repository CAS matrix ───────────────────────────────────

function freshD1(): { repo: D1ApprovalRecordRepository; ctx: TenantDbContext } {
  const db = new FakeD1Database()
  return { repo: new D1ApprovalRecordRepository(db), ctx: { tenantId, db } }
}

test("D1 markUsed claims an approved, unused, unexpired record", async () => {
  const { repo, ctx } = freshD1()
  const r = row({ status: "approved" })
  await repo.create(ctx, r)
  const claimed = await repo.markUsed(ctx, r.id, new Date().toISOString())
  assert.ok(claimed)
  assert.equal(claimed.status, "used")
  assert.ok(claimed.usedAt)
})

test("D1 markUsed returns null on the second (already-used) call", async () => {
  const { repo, ctx } = freshD1()
  const r = row({ status: "approved" })
  await repo.create(ctx, r)
  const first = await repo.markUsed(ctx, r.id, new Date().toISOString())
  const second = await repo.markUsed(ctx, r.id, new Date().toISOString())
  assert.ok(first)
  assert.equal(second, null)
})

test("D1 markUsed returns null for an expired record", async () => {
  const { repo, ctx } = freshD1()
  const r = row({ status: "approved", ttlMinutes: -10 })
  await repo.create(ctx, r)
  const claimed = await repo.markUsed(ctx, r.id, new Date().toISOString())
  assert.equal(claimed, null)
})

test("D1 markUsed returns null when status is not approved", async () => {
  for (const status of ["pending", "rejected", "expired"] as const) {
    const { repo, ctx } = freshD1()
    const r = row({ status })
    await repo.create(ctx, r)
    const claimed = await repo.markUsed(ctx, r.id, new Date().toISOString())
    assert.equal(claimed, null, `status=${status} must not be claimable`)
  }
})

test("D1 markUsed returns null for a wrong-tenant context", async () => {
  const { repo } = freshD1()
  const wrongCtx: TenantDbContext = { tenantId: otherTenantId, db: null }
  const r = row({ status: "approved" })
  await repo.create({ tenantId, db: null }, r)
  const claimed = await repo.markUsed(wrongCtx, r.id, new Date().toISOString())
  assert.equal(claimed, null)
})

test("D1 concurrent markUsed claims exactly once", async () => {
  const { repo, ctx } = freshD1()
  const r = row({ status: "approved" })
  await repo.create(ctx, r)
  const results = await Promise.all([
    repo.markUsed(ctx, r.id, new Date().toISOString()),
    repo.markUsed(ctx, r.id, new Date().toISOString()),
  ])
  const claims = results.filter((x) => x !== null)
  assert.equal(claims.length, 1)
})

// ─── In-memory repository CAS matrix (parity) ───────────────────

function exerciseRepo(name: string, makeRepo: () => ApprovalRecordRepository) {
  const ctx: TenantDbContext = { tenantId, db: null }

  test(`${name}: claims approved/unused/unexpired then rejects replay`, async () => {
    const repo = makeRepo()
    const r = row({ status: "approved" })
    await repo.create(ctx, r)
    const first = await repo.markUsed(ctx, r.id, new Date().toISOString())
    const second = await repo.markUsed(ctx, r.id, new Date().toISOString())
    assert.equal(first?.status, "used")
    assert.equal(second, null)
  })

  test(`${name}: rejects expired`, async () => {
    const repo = makeRepo()
    const r = row({ status: "approved", ttlMinutes: -10 })
    await repo.create(ctx, r)
    assert.equal(await repo.markUsed(ctx, r.id, new Date().toISOString()), null)
  })

  test(`${name}: rejects non-approved`, async () => {
    const repo = makeRepo()
    const r = row({ status: "pending" })
    await repo.create(ctx, r)
    assert.equal(await repo.markUsed(ctx, r.id, new Date().toISOString()), null)
  })

  test(`${name}: rejects wrong tenant`, async () => {
    const repo = makeRepo()
    const r = row({ status: "approved" })
    await repo.create(ctx, r)
    assert.equal(await repo.markUsed({ tenantId: otherTenantId, db: null }, r.id, new Date().toISOString()), null)
  })
}

exerciseRepo("in-memory repo", createInMemoryApprovalRecordRepository)

// ─── ApprovalStore one-time-use claim ───────────────────────────

test("repo-backed store: markApprovalUsed returns true once, then false", async () => {
  const repo = createInMemoryApprovalRecordRepository()
  const ctx: TenantDbContext = { tenantId, db: null }
  const store = createRepositoryBackedApprovalStore(repo, ctx)
  const r = row({ status: "approved" })
  await repo.create(ctx, r)
  assert.equal(await store.markApprovalUsed(r.id, new Date().toISOString()), true)
  assert.equal(await store.markApprovalUsed(r.id, new Date().toISOString()), false)
})

test("in-memory store: markApprovalUsed returns true once, then false", async () => {
  const store = createInMemoryApprovalStore()
  store.addRecord(domainRecord({ status: "approved" }))
  const id = store.getAllRecords()[0].id
  assert.equal(await store.markApprovalUsed(id, new Date().toISOString()), true)
  assert.equal(await store.markApprovalUsed(id, new Date().toISOString()), false)
})

test("in-memory store: markApprovalUsed rejects expired", async () => {
  const store = createInMemoryApprovalStore()
  store.addRecord(domainRecord({ status: "approved", ttlMinutes: -10 }))
  const id = store.getAllRecords()[0].id
  assert.equal(await store.markApprovalUsed(id, new Date().toISOString()), false)
})

test("defaultDeny store: markApprovalUsed always returns false", async () => {
  assert.equal(await defaultDenyApprovalStore.markApprovalUsed("any", new Date().toISOString()), false)
})

// ─── Source-scan guards (referenced by Phase 6A/6C) ─────────────

test("D1 markUsed SQL is a conditional CAS with tenant/status/used_at/expiry guards", () => {
  const sql = D1_SRC.slice(D1_SRC.indexOf("MARK_USED_SQL"))
  assert.ok(/tenant_id\s*=\s*\?/.test(sql), "must scope by tenant_id")
  assert.ok(/status\s*=\s*'approved'/.test(sql), "must require status approved")
  assert.ok(/used_at\s+IS\s+NULL/i.test(sql), "must require used_at IS NULL")
  assert.ok(/expires_at\s*>\s*\?/.test(sql), "must require not-expired")
})

test("toolBackend fails closed when the markUsed claim is lost", () => {
  // The execute path must not return success if the atomic claim was not won.
  assert.ok(TOOLBACKEND_SRC.includes("markApprovalUsed"))
  assert.ok(/if\s*\(\s*!claimed\s*\)/.test(TOOLBACKEND_SRC), "must branch on a lost claim")
  assert.ok(TOOLBACKEND_SRC.includes('"approval_used"'), "must fail with approval_used")
})
