import test from "node:test"
import assert from "node:assert/strict"
import {
  hashField,
  hashActionTarget,
  hashActionPayload,
  canonicalize,
  isApprovalStillValidForPreview,
} from "../app/lib/security/hash.ts"
import { createActionPreview } from "../app/lib/workUnitExecution.ts"
import { createApprovalPreview } from "../app/lib/security/actionApproval.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"

const tenantId = "test-tenant" as TenantId

// ─── canonicalize ────────────────────────────────────────────────

test("canonicalize sorts object keys alphabetically", () => {
  const a = canonicalize({ b: 1, a: 2, c: 3 })
  const b = canonicalize({ c: 3, a: 2, b: 1 })
  assert.deepEqual(a, b)
  assert.deepEqual(Object.keys(a as Record<string, unknown>), ["a", "b", "c"])
})

test("canonicalize strips undefined values", () => {
  const result = canonicalize({ a: 1, b: undefined, c: 3 })
  const keys = Object.keys(result as Record<string, unknown>)
  assert.ok(keys.includes("a"))
  assert.ok(!keys.includes("b"))
  assert.ok(keys.includes("c"))
})

test("canonicalize handles nested objects", () => {
  const result = canonicalize({ outer: { b: 1, a: 2 } })
  const outer = (result as Record<string, unknown>).outer as Record<string, unknown>
  assert.deepEqual(Object.keys(outer), ["a", "b"])
})

test("canonicalize passes through arrays unchanged", () => {
  assert.deepEqual(canonicalize([3, 1, 2]), [3, 1, 2])
})

test("canonicalize passes through primitives", () => {
  assert.equal(canonicalize(42), 42)
  assert.equal(canonicalize("hello"), "hello")
  assert.equal(canonicalize(null), null)
})

// ─── hashField ──────────────────────────────────────────────────

test("hashField produces deterministic output for same semantic input", () => {
  const a = hashField({ b: 2, a: 1 })
  const b = hashField({ a: 1, b: 2 })
  assert.equal(a, b)
})

test("hashField produces different output for different input", () => {
  assert.notEqual(hashField({ a: 1 }), hashField({ a: 2 }))
})

test("hashField is stable despite object key order", () => {
  const a = hashField({ destination: "#general", provider: "slack" })
  const b = hashField({ provider: "slack", destination: "#general" })
  assert.equal(a, b)
})

test("hashField ignores undefined fields", () => {
  const a = hashField({ a: 1 })
  const b = hashField({ a: 1, b: undefined })
  assert.equal(a, b)
})

test("hashField returns SHA-256 hex string (64 chars)", () => {
  const result = hashField({ test: true })
  assert.equal(result.length, 64)
  assert.ok(/^[0-9a-f]{64}$/.test(result))
})

// ─── hashActionTarget ───────────────────────────────────────────

test("hashActionTarget is deterministic", () => {
  const a = hashActionTarget({ destination: "#general", provider: "slack" })
  const b = hashActionTarget({ provider: "slack", destination: "#general" })
  assert.equal(a, b)
})

test("hashActionTarget differs for different destinations", () => {
  assert.notEqual(
    hashActionTarget({ destination: "#general" }),
    hashActionTarget({ destination: "#random" }),
  )
})

// ─── hashActionPayload ──────────────────────────────────────────

test("hashActionPayload is deterministic", () => {
  const a = hashActionPayload({ bodySnippet: "hello", title: "Test" })
  const b = hashActionPayload({ title: "Test", bodySnippet: "hello" })
  assert.equal(a, b)
})

test("hashActionPayload differs for different payloads", () => {
  assert.notEqual(
    hashActionPayload({ bodySnippet: "original" }),
    hashActionPayload({ bodySnippet: "tampered" }),
  )
})

// ─── ActionPreview Hashes ───────────────────────────────────────

test("ActionPreview includes targetHash and payloadHash from canonical hash", () => {
  const preview = createActionPreview({
    tenantId,
    workUnitId: "wu-1",
    actionType: "slack_reply",
    targetLabel: "Slack Reply",
    targetDestination: "#general",
    bodySnippet: "確認しました",
    detailFields: { channel: "#general" },
    provider: "slack",
  })

  assert.ok(preview.targetHash.length === 64)
  assert.ok(preview.payloadHash.length === 64)
  assert.ok(/^[0-9a-f]{64}$/.test(preview.targetHash))
  assert.ok(/^[0-9a-f]{64}$/.test(preview.payloadHash))
})

test("ActionPreview hashes differ for different targets", () => {
  const a = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "A", targetDestination: "#general",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const b = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "B", targetDestination: "#random",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  assert.notEqual(a.targetHash, b.targetHash)
})

test("ActionPreview hashes differ for different payloads", () => {
  const a = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "original", detailFields: {}, provider: "slack",
  })
  const b = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "tampered", detailFields: {}, provider: "slack",
  })
  assert.notEqual(a.payloadHash, b.payloadHash)
})

// ─── isApprovalStillValidForPreview ─────────────────────────────

test("isApprovalStillValidForPreview returns true for matching approved record", () => {
  const preview = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const approval = {
    id: "approval:test",
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: preview.id,
    actionType: "slack_reply" as const,
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    status: "approved" as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  }

  assert.equal(isApprovalStillValidForPreview(preview, approval), true)
})

test("isApprovalStillValidForPreview returns false for pending approval", () => {
  const preview = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const approval = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: preview.id,
    actionType: "slack_reply", target: "x", payload: { body: "test" },
  })
  assert.equal(isApprovalStillValidForPreview(preview, approval), false)
})

test("isApprovalStillValidForPreview returns false for expired approval", () => {
  const preview = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const approval = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: preview.id,
    actionType: "slack_reply", target: "x", payload: { body: "test" },
    ttlMinutes: 1,
  })
  const approved = { ...approval, status: "approved" as const }
  assert.equal(isApprovalStillValidForPreview(preview, approved, new Date(Date.now() + 2 * 60_000).toISOString()), false)
})

test("isApprovalStillValidForPreview returns false when targetHash differs", () => {
  const previewA = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "A", targetDestination: "#general",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const previewB = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "B", targetDestination: "#random",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const approval = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: previewA.id,
    actionType: "slack_reply",
    target: JSON.stringify(previewA.targetPreview),
    payload: previewA.payloadPreview,
  })
  const approved = { ...approval, status: "approved" as const }

  assert.equal(isApprovalStillValidForPreview(previewB, approved), false)
})

test("isApprovalStillValidForPreview returns false when payloadHash differs", () => {
  const previewA = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "original", detailFields: {}, provider: "slack",
  })
  const previewB = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "tampered", detailFields: {}, provider: "slack",
  })
  const approval = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: previewA.id,
    actionType: "slack_reply",
    target: JSON.stringify(previewA.targetPreview),
    payload: previewA.payloadPreview,
  })
  const approved = { ...approval, status: "approved" as const }

  assert.equal(isApprovalStillValidForPreview(previewB, approved), false)
})

test("isApprovalStillValidForPreview returns false for used approval", () => {
  const preview = createActionPreview({
    tenantId, workUnitId: "wu-1", actionType: "slack_reply",
    targetLabel: "X", targetDestination: "#general",
    bodySnippet: "test", detailFields: {}, provider: "slack",
  })
  const approval = createApprovalPreview({
    tenantId, workUnitId: "wu-1", actionPreviewId: preview.id,
    actionType: "slack_reply", target: "x", payload: { body: "test" },
  })
  const used = { ...approval, status: "approved" as const, usedAt: new Date().toISOString() }
  assert.equal(isApprovalStillValidForPreview(preview, used), false)
})
