/**
 * Phase 5C: Explicit approval ↔ action-preview binding.
 *
 * Verifies the server-side binding contract (verifyApprovalPreviewBinding) and
 * scans the verification/execution-like sources to prove no latest/workUnit-only
 * approval lookup is used for verification and no unsafe fields are exposed.
 *
 * Note on the client contract: the safe dry-run client never sends approvalId
 * (it is a forbidden client key). The server resolves the approval by the exact
 * actionPreviewId under tenant/workUnit scope and binds the pair — so assertions
 * about "approvalId alone" are expressed as the server requiring the explicit
 * approval↔preview binding, not as a client-supplied approvalId.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  verifyApprovalPreviewBinding,
  type BoundApprovalFacts,
  type BoundPreviewFacts,
  type ApprovalPreviewBindingContext,
} from "../app/lib/security/approvalPreviewBinding.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const tenantId = "tenant-a" as TenantId
const otherTenant = "tenant-b" as TenantId
const workUnitId = "wu-1"
const previewId = "preview-1"
const future = new Date(Date.now() + 30 * 60_000).toISOString()
const past = new Date(Date.now() - 30 * 60_000).toISOString()
const now = new Date().toISOString()

function approval(over: Partial<BoundApprovalFacts> = {}): BoundApprovalFacts {
  return {
    id: "approval-1",
    tenantId,
    workUnitId,
    actionPreviewId: previewId,
    actionType: "slack_reply",
    targetHash: "t-hash",
    payloadHash: "p-hash",
    status: "approved",
    expiresAt: future,
    usedAt: undefined,
    ...over,
  }
}

function preview(over: Partial<BoundPreviewFacts> = {}): BoundPreviewFacts {
  return { id: previewId, tenantId, workUnitId, targetHash: "t-hash", payloadHash: "p-hash", ...over }
}

function ctx(over: Partial<ApprovalPreviewBindingContext> = {}): ApprovalPreviewBindingContext {
  return { tenantId, workUnitId, actionPreviewId: previewId, requestedActionType: "slack_reply", now, ...over }
}

// ─── Positive ───────────────────────────────────────────────────

test("1. valid approval + matching preview passes verification", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval(), preview())
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.approvalId, "approval-1")
})

// ─── Explicit binding (5,6) ─────────────────────────────────────

test("5. wrong approval (bound to a different preview) + right requested preview fails", () => {
  // Server resolved an approval whose actionPreviewId points elsewhere.
  const r = verifyApprovalPreviewBinding(ctx(), approval({ actionPreviewId: "other-preview" }), preview())
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "invalid_request")
})

test("6. right approval + wrong preview (id mismatch) fails", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval(), preview({ id: "other-preview" }))
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "invalid_request")
})

// ─── Tenant / workUnit (7,8,9) ──────────────────────────────────

test("7. approval from another tenant fails (forbidden)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval({ tenantId: otherTenant }), preview())
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "forbidden")
})

test("8. preview from another tenant fails (forbidden)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval(), preview({ tenantId: otherTenant }))
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "forbidden")
})

test("9. preview from another workUnit fails (invalid_request)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval(), preview({ workUnitId: "wu-other" }))
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "invalid_request")
})

test("approval from another workUnit fails (invalid_request)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval({ workUnitId: "wu-other" }), preview())
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "invalid_request")
})

// ─── Hash binding (10,11) ───────────────────────────────────────

test("10. targetHash mismatch fails (not_ready)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval({ targetHash: "x" }), preview({ targetHash: "y" }))
  assert.equal(r.ok, false)
  if (!r.ok && r.disposition === "not_ready") assert.ok(r.reason.includes("hash"))
  else assert.fail("expected not_ready")
})

test("11. payloadHash mismatch fails (not_ready)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval({ payloadHash: "x" }), preview({ payloadHash: "y" }))
  assert.equal(r.ok, false)
  if (!r.ok && r.disposition === "not_ready") assert.ok(r.reason.includes("hash"))
  else assert.fail("expected not_ready")
})

// ─── Status / expiry / use (12-15) ──────────────────────────────

for (const [label, over, needle] of [
  ["12. pending", { status: "pending" }, "pending"],
  ["13. rejected", { status: "rejected" }, "rejected"],
  ["14. expired", { status: "approved", expiresAt: past }, "expired"],
  ["15. used (status)", { status: "used" }, "consumed"],
  ["15. used (usedAt)", { status: "approved", usedAt: now }, "consumed"],
] as const) {
  test(`${label} approval fails (not_ready)`, () => {
    const r = verifyApprovalPreviewBinding(ctx(), approval(over), preview())
    assert.equal(r.ok, false)
    if (!r.ok && r.disposition === "not_ready") assert.ok(r.reason.toLowerCase().includes(needle))
    else assert.fail("expected not_ready")
  })
}

// ─── Missing (16,17) ────────────────────────────────────────────

test("16. missing approval fails (not_ready)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), null, preview())
  assert.equal(r.ok, false)
  if (!r.ok && r.disposition === "not_ready") assert.ok(r.reason.includes("No approval"))
  else assert.fail("expected not_ready")
})

test("17. missing preview fails (not_ready)", () => {
  const r = verifyApprovalPreviewBinding(ctx(), approval(), null)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.disposition, "not_ready")
})

// ─── Action-type binding ────────────────────────────────────────

test("requestedActionType mismatch fails (not_ready)", () => {
  const r = verifyApprovalPreviewBinding(ctx({ requestedActionType: "github_issue" }), approval({ actionType: "slack_reply" }), preview())
  assert.equal(r.ok, false)
  if (!r.ok && r.disposition === "not_ready") assert.ok(r.reason.includes("mismatch"))
  else assert.fail("expected not_ready")
})

test("null requestedActionType bypasses the action-type check", () => {
  const r = verifyApprovalPreviewBinding(ctx({ requestedActionType: null }), approval(), preview())
  assert.equal(r.ok, true)
})

// ─── Source scans on the verification/execution paths ───────────

const ROUTE = "app/api/workunit/[id]/execution/dry-run/route.ts"
const BINDING = "app/lib/security/approvalPreviewBinding.ts"
const STORE = "app/lib/security/approvalStore.ts"
const TOOLBACKEND = "app/lib/toolBackend.ts"

test("4 & 24. dry-run route uses no latest/workUnit-only approval lookup", async () => {
  const src = await readFile(ROUTE, "utf8")
  assert.equal(src.includes("findByWorkUnitId"), false)
  assert.equal(/latest\s*approval/i.test(src), false)
  assert.equal(src.includes("findByPreviewId"), true)
  assert.equal(src.includes("verifyApprovalPreviewBinding"), true)
})

test("23. no latestApproval/findLatestApproval anywhere in verification sources", async () => {
  for (const f of [ROUTE, BINDING, STORE, TOOLBACKEND]) {
    const src = await readFile(f, "utf8")
    assert.equal(/findLatestApproval|latestApproval|findCurrentApproval/.test(src), false, `${f} must not use latest-approval lookup`)
  }
})

test("toolBackend verifyApproval path enforces explicit actionPreviewId binding", async () => {
  const src = await readFile(STORE, "utf8")
  assert.ok(src.includes("record.actionPreviewId !== input.actionPreviewId"))
})

test("18. dry-run route never marks approval used", async () => {
  const src = await readFile(ROUTE, "utf8")
  assert.equal(src.includes("markApprovalUsed"), false)
  assert.equal(src.includes("NEVER marks approval"), true)
})

test("19-22. dry-run response type exposes no unsafe fields", async () => {
  const src = await readFile(ROUTE, "utf8")
  const start = src.indexOf("type DryRunResponse")
  const section = src.slice(start, src.indexOf("}", start) + 1)
  for (const forbidden of ["approvalId", "targetHash", "payloadHash", "tenantId", "actorUserId", "role", "token", "secret", "rawPayload", "API_KEY"]) {
    assert.equal(section.includes(forbidden), false, `response type must not expose ${forbidden}`)
  }
})

test("25. binding/verification sources have no external execution / provider SDK / fetch", async () => {
  for (const f of [BINDING, ROUTE]) {
    const src = await readFile(f, "utf8")
    for (const bad of ["fetch(", "openai", "anthropic", "deepseek", "gemini", "ollama", "API_KEY", "Bearer", "sk-", "executionPayload", "providerRequest", "providerResponse"]) {
      assert.equal(src.includes(bad), false, `${f} must not include ${bad}`)
    }
  }
})

test("binding outcome never carries hashes/tenant/role/secret fields", () => {
  // Negative-path outcomes only carry a safe reason or a disposition tag.
  const failures = [
    verifyApprovalPreviewBinding(ctx(), approval({ targetHash: "x" }), preview({ targetHash: "y" })),
    verifyApprovalPreviewBinding(ctx(), approval({ tenantId: otherTenant }), preview()),
    verifyApprovalPreviewBinding(ctx(), null, preview()),
  ]
  for (const f of failures) {
    const s = JSON.stringify(f)
    for (const bad of ["t-hash", "p-hash", "tenant-a", "tenant-b", "slack_reply", "secret", "token"]) {
      assert.equal(s.includes(bad), false, `outcome must not expose ${bad}`)
    }
  }
})
