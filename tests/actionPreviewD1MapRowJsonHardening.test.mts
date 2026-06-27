/**
 * Phase 5D: ActionPreview D1 mapRow JSON parsing / serialization hardening.
 *
 * Proves that JSON columns roundtrip verbatim, hashes are preserved exactly,
 * tenant boundary holds, and malformed stored JSON fails safely (the row is
 * treated as absent) without fabricating defaults or exposing raw content.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { D1ActionPreviewRepository } from "../app/lib/persistence/d1/actionPreviewRepository.ts"
import { FakeD1Database } from "./helpers/fakeD1.ts"
import type { ActionPreviewRow, TenantDbContext } from "../app/lib/persistence/types.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const tenantId = "tenant-a" as TenantId
const otherTenant = "tenant-b" as TenantId

function setup() {
  const db = new FakeD1Database()
  const repo = new D1ActionPreviewRepository(db)
  const ctx: TenantDbContext = { tenantId, db }
  return { db, repo, ctx }
}

function row(over: Partial<ActionPreviewRow> = {}): ActionPreviewRow {
  return {
    id: "preview-1",
    tenantId,
    workUnitId: "wu-1",
    actionType: "slack_reply",
    targetPreview: JSON.stringify({ provider: "slack", channel: "#general" }),
    payloadPreview: JSON.stringify({ body: "hello team" }),
    requiresApproval: 1,
    status: "preview",
    targetHash: "target-hash-abc",
    payloadHash: "payload-hash-def",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    ...over,
  }
}

// ─── Roundtrip (1-6) ────────────────────────────────────────────

test("1. create + findById roundtrip preserves target JSON verbatim", async () => {
  const { repo, ctx } = setup()
  const r = row({ targetPreview: JSON.stringify({ provider: "github", repository: "acme/api" }) })
  await repo.create(ctx, r)
  const found = await repo.findById(ctx, r.id)
  assert.ok(found)
  assert.equal(found.targetPreview, r.targetPreview)
  assert.deepEqual(JSON.parse(found.targetPreview), { provider: "github", repository: "acme/api" })
})

test("2. create + findById roundtrip preserves payload JSON verbatim", async () => {
  const { repo, ctx } = setup()
  const r = row({ payloadPreview: JSON.stringify({ intent: "review_pr", nested: { a: [1, 2, 3] } }) })
  await repo.create(ctx, r)
  const found = await repo.findById(ctx, r.id)
  assert.ok(found)
  assert.equal(found.payloadPreview, r.payloadPreview)
  assert.deepEqual(JSON.parse(found.payloadPreview), { intent: "review_pr", nested: { a: [1, 2, 3] } })
})

test("create accepts an object preview and stores it without double-encoding", async () => {
  const { repo, ctx } = setup()
  // Some callers pass an object despite the string type; it must be encoded once.
  const r = row({ targetPreview: { provider: "slack", channel: "#x" } as unknown as string })
  await repo.create(ctx, r)
  const found = await repo.findById(ctx, r.id)
  assert.ok(found)
  assert.deepEqual(JSON.parse(found.targetPreview), { provider: "slack", channel: "#x" })
  // Single-encoded: parsing once yields the object, not a string.
  assert.equal(typeof JSON.parse(found.targetPreview), "object")
})

test("3. create + findByWorkUnitId roundtrip preserves target/payload JSON", async () => {
  const { repo, ctx } = setup()
  const r = row()
  await repo.create(ctx, r)
  const rows = await repo.findByWorkUnitId(ctx, "wu-1")
  assert.equal(rows.length, 1)
  assert.equal(rows[0].targetPreview, r.targetPreview)
  assert.equal(rows[0].payloadPreview, r.payloadPreview)
})

test("4 & 5. targetHash and payloadHash are preserved exactly", async () => {
  const { repo, ctx } = setup()
  const r = row({ targetHash: "EXACT-target-#hash", payloadHash: "EXACT-payload-#hash" })
  await repo.create(ctx, r)
  const found = await repo.findById(ctx, r.id)
  assert.ok(found)
  assert.equal(found.targetHash, "EXACT-target-#hash")
  assert.equal(found.payloadHash, "EXACT-payload-#hash")
})

test("6. status and requiresApproval are preserved", async () => {
  const { repo, ctx } = setup()
  await repo.create(ctx, row({ status: "preview", requiresApproval: 1 }))
  const found = await repo.findById(ctx, "preview-1")
  assert.ok(found)
  assert.equal(found.status, "preview")
  assert.equal(found.requiresApproval, 1)
})

// ─── Missing / tenant boundary (7,8) ────────────────────────────

test("7. missing row returns null / empty", async () => {
  const { repo, ctx } = setup()
  assert.equal(await repo.findById(ctx, "nope"), null)
  assert.deepEqual(await repo.findByWorkUnitId(ctx, "wu-nope"), [])
})

test("8. wrong tenant returns null / empty", async () => {
  const { repo, db } = setup()
  await repo.create({ tenantId, db }, row())
  const otherCtx: TenantDbContext = { tenantId: otherTenant, db }
  assert.equal(await repo.findById(otherCtx, "preview-1"), null)
  assert.deepEqual(await repo.findByWorkUnitId(otherCtx, "wu-1"), [])
})

// ─── Malformed JSON fails safely (9-16) ─────────────────────────

function seedMalformed(db: FakeD1Database, field: "target_preview" | "payload_preview", raw: string) {
  const base = {
    id: "preview-bad",
    tenant_id: tenantId,
    work_unit_id: "wu-1",
    action_type: "slack_reply",
    target_preview: JSON.stringify({ ok: true }),
    payload_preview: JSON.stringify({ ok: true }),
    requires_approval: 1,
    status: "preview",
    target_hash: "secret-target-hash-zzz",
    payload_hash: "secret-payload-hash-yyy",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  }
  db.seedRow("action_previews", { ...base, [field]: raw })
}

const RAW_SECRET_TARGET = '{"destination":"#secret-chan","apiKey":"sk-LEAK","token":"Bearer-LEAK" NOT JSON'
const RAW_SECRET_PAYLOAD = '{"body":"top secret payload","SECRET":"abc" <<malformed'

test("9. malformed target JSON returns null (findById fails safe)", async () => {
  const { repo, ctx, db } = setup()
  seedMalformed(db, "target_preview", RAW_SECRET_TARGET)
  assert.equal(await repo.findById(ctx, "preview-bad"), null)
})

test("10. malformed payload JSON returns null (findById fails safe)", async () => {
  const { repo, ctx, db } = setup()
  seedMalformed(db, "payload_preview", RAW_SECRET_PAYLOAD)
  assert.equal(await repo.findById(ctx, "preview-bad"), null)
})

test("malformed row is skipped by findByWorkUnitId", async () => {
  const { repo, ctx, db } = setup()
  await repo.create(ctx, row()) // one valid row
  seedMalformed(db, "target_preview", RAW_SECRET_TARGET) // one malformed row, same wu
  const rows = await repo.findByWorkUnitId(ctx, "wu-1")
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, "preview-1")
})

test("11-15. malformed JSON exposes no raw target/payload/hash/secret via the result", async () => {
  const { repo, ctx, db } = setup()
  seedMalformed(db, "target_preview", RAW_SECRET_TARGET)
  const found = await repo.findById(ctx, "preview-bad")
  // The fail-safe result is null — it carries no fields at all.
  assert.equal(found, null)
  const serialized = JSON.stringify(found)
  for (const leak of ["#secret-chan", "sk-LEAK", "Bearer-LEAK", "secret-target-hash", "top secret"]) {
    assert.equal(serialized.includes(leak), false)
  }
})

test("16. malformed row does not become an executable/default preview", async () => {
  const { repo, ctx, db } = setup()
  seedMalformed(db, "target_preview", RAW_SECRET_TARGET)
  const found = await repo.findById(ctx, "preview-bad")
  // Must NOT fabricate a `{}` target that could read as a valid empty action.
  assert.equal(found, null)
})

// ─── Source scans (17,18) ───────────────────────────────────────

const REPO_SRC_PATH = "app/lib/persistence/d1/actionPreviewRepository.ts"
const HELPERS_SRC_PATH = "app/lib/persistence/d1/rowHelpers.ts"

test("17. mapRow uses safe wrappers, no raw JSON.parse in the repository", async () => {
  const src = await readFile(REPO_SRC_PATH, "utf8")
  assert.equal(src.includes("JSON.parse"), false, "repository must not call JSON.parse directly")
  assert.ok(src.includes("readJsonColumn"))
  assert.ok(src.includes("toJsonColumn"))
  // The fail-safe fallback heuristic is gone.
  assert.equal(src.includes("[object Object]"), false)
})

test("17b. readJsonColumn wraps JSON.parse in try/catch", async () => {
  const src = await readFile(HELPERS_SRC_PATH, "utf8")
  const fn = src.slice(src.indexOf("export function readJsonColumn"))
  assert.ok(fn.includes("try") && fn.includes("catch"))
})

test("18. repository has no external execution / provider SDK / fetch", async () => {
  const src = await readFile(REPO_SRC_PATH, "utf8")
  for (const bad of ["fetch(", "openai", "anthropic", "executionPayload", "providerRequest", "providerResponse", "API_KEY", "Bearer", "sk-"]) {
    assert.equal(src.includes(bad), false, `repository must not include ${bad}`)
  }
})
