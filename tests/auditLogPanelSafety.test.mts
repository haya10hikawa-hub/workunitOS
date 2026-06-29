/**
 * AuditLogPanel active-surface safety tests.
 *
 * The audit panel must never render raw internal identifiers (actorUserId) or
 * leak forbidden keys via metadata. Forbidden strings below are negative
 * controls; the static guard scans the panel source, not this test.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { deriveAuditActorLabel, redactAuditMetadata } from "../app/lib/application/audit/auditLogDisplayModel.ts"

const PANEL = readFileSync(join(process.cwd(), "app/components/workunit-os/AuditLogPanel.tsx"), "utf-8")
const LEGACY_TEST = readFileSync(join(process.cwd(), "tests/architectureLegacySurface.test.mts"), "utf-8")

// ─── Model ────────────────────────────────────────────────────
test("deriveAuditActorLabel returns a safe label, never the raw id", () => {
  assert.equal(deriveAuditActorLabel({ actorUserId: "user-123-internal" }), "Internal actor")
  assert.equal(deriveAuditActorLabel({ actorUserId: "" }), null)
  assert.equal(deriveAuditActorLabel({ actorUserId: null }), null)
  assert.equal(deriveAuditActorLabel({}), null)
  // Label must not echo the id.
  assert.equal(deriveAuditActorLabel({ actorUserId: "secret-actor" })!.includes("secret-actor"), false)
})

test("redactAuditMetadata drops forbidden internal keys but keeps safe ones", () => {
  const redacted = redactAuditMetadata({
    action: "review",
    note: "ok",
    actorUserId: "u1",
    tenantId: "t1",
    approvalId: "a1",
    targetHash: "h1",
    payloadHash: "h2",
    role: "admin",
    token: "x",
    secret: "y",
  })
  assert.deepEqual(Object.keys(redacted).sort(), ["action", "note"])
})

// ─── Panel source: active-surface safety ──────────────────────
test("1. AuditLogPanel does not render actorUserId directly", () => {
  assert.equal(PANEL.includes("row.actorUserId"), false)
  assert.equal(PANEL.includes("{actorLabel}"), true)
})

test("2. AuditLogPanel uses the safe audit display model", () => {
  assert.ok(PANEL.includes("deriveAuditActorLabel"))
  assert.ok(PANEL.includes("redactAuditMetadata(row.metadata)"))
})

test("3. AuditLogPanel renders no forbidden id/hash copy", () => {
  for (const forbidden of ["approvalId", "targetHash", "payloadHash", "tenantId", "actorUserId"]) {
    assert.equal(PANEL.includes(forbidden), false, `panel must not reference ${forbidden}`)
  }
})

test("4. legacy hash/approval surface is isolated by the legacy-surface test (residual risk)", () => {
  // Legacy WorkUnitActionField renders targetHash/payloadHash/approvalId but is
  // not on an active route; the legacy-surface test pins it out of the entry chain.
  assert.ok(LEGACY_TEST.includes("/app/components/legacy/workunitInbox/"))
  assert.ok(LEGACY_TEST.includes("WorkUnitActionField"))
})

test("5. AuditLogPanel introduces no /api/workunit/tools call", () => {
  assert.equal(PANEL.includes("/api/workunit/tools"), false)
})

test("6. AuditLogPanel introduces no provider import or direct fetch", () => {
  assert.equal(PANEL.includes("fetch("), false)
  for (const sdk of ["openai", "@anthropic-ai", "deepseekProvider", "createDeepseek"]) {
    assert.equal(PANEL.includes(sdk), false)
  }
})
