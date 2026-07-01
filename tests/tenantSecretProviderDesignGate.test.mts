/**
 * P6.0 — TenantSecretProvider design gate contract.
 *
 * Static, read-only guards (matching the repo's alpha-safety-gate / readiness-gate /
 * exit-criteria test convention) so a future edit cannot silently weaken the design gate,
 * the keying plan, or the threat model — or let a planning doc authorize implementation,
 * wiring of hash helpers, or any approval-flow behavior change.
 *
 * This test does NOT touch the network, the GitHub API, child_process, or the filesystem
 * (read-only). It only reads three docs under docs/ and asserts their content. It does NOT
 * scan its own source (no self-match traps); every forbidden/required phrase is asserted
 * against the docs.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

const root = process.cwd()

const DESIGN = path.join(root, "docs/TENANT_SECRET_PROVIDER_DESIGN.md")
const KEYING = path.join(root, "docs/APPROVAL_HASH_KEYING_PLAN.md")
const THREAT = path.join(root, "docs/APPROVAL_SECRET_THREAT_MODEL.md")

const read = (p: string): string => (existsSync(p) ? readFileSync(p, "utf8") : "")
const design = read(DESIGN)
const keying = read(KEYING)
const threat = read(THREAT)

const requireAll = (haystack: string, needles: string[], label: string): void => {
  for (const n of needles) assert.ok(haystack.includes(n), `${label} must include: ${n}`)
}

// ── Files exist ──────────────────────────────────────────────

test("1. docs/TENANT_SECRET_PROVIDER_DESIGN.md exists", () => {
  assert.equal(existsSync(DESIGN), true)
  assert.ok(design.length > 0)
})

test("2. docs/APPROVAL_HASH_KEYING_PLAN.md exists", () => {
  assert.equal(existsSync(KEYING), true)
  assert.ok(keying.length > 0)
})

test("3. docs/APPROVAL_SECRET_THREAT_MODEL.md exists", () => {
  assert.equal(existsSync(THREAT), true)
  assert.ok(threat.length > 0)
})

// ── Design gate ──────────────────────────────────────────────

test("4. design doc carries the non-authorization statement", () => {
  assert.match(
    design,
    /TenantSecretProvider planning does not authorize implementation, deployment, real LLM enablement, external execution, OAuth\/token storage, production secret storage, or approval-flow behavior changes\./i,
  )
})

test("5. design doc includes all required security properties", () => {
  requireAll(design, [
    "tenant-scoped secret material",
    "keyed approval-hash derivation",
    "no cross-tenant secret reuse",
    "no secrets in logs",
    "no secrets in evidence ledger",
    "no secrets in release decision records",
    "fail-closed when a tenant secret is unavailable",
    "deterministic verification for the same canonical approval payload",
    "rejection on tenant mismatch",
    "rejection on canonical payload mismatch",
  ], "design security properties")
})

test("6. design doc includes all secret lifecycle requirements", () => {
  requireAll(design, [
    "generation",
    "storage design",
    "rotation",
    "revocation",
    "backup / recovery assumptions",
    "local development strategy without production secrets",
    "test strategy without live secrets",
  ], "design secret lifecycle")
})

test("7. design doc states existing helpers are not connected to approval generation/verification", () => {
  assert.match(
    design,
    /does not connect them to approval record generation or approval verification behavior/i,
  )
})

// ── Keying plan ──────────────────────────────────────────────

test("8. keying plan states the current unkeyed SHA-256 state", () => {
  assert.match(
    keying,
    /Current approval hashing is documented as unkeyed SHA-256 over canonical approval payloads\./i,
  )
})

test("9. keying plan states the target tenant-scoped keyed derivation", () => {
  assert.match(
    keying,
    /Target approval hashing should use tenant-scoped keyed derivation such as HMAC over the canonical approval payload, subject to implementation review\./i,
  )
})

test("10. keying plan requires the canonical / keyed / migration preconditions", () => {
  requireAll(keying, [
    "canonical payload stability",
    "tenant id included in or bound to verification context",
    "target / payload / operation included in canonical material",
    "replay protections reviewed",
    "approval expiry preserved",
    "one-time-use semantics preserved",
    "four-eyes / self-approval constraints preserved",
    "audit event compatibility preserved",
    "legacy migration reviewed before activation",
  ], "keying plan preconditions")
})

test("11. keying plan does not authorize approval runtime / generation / verification changes", () => {
  requireAll(keying, [
    "approval hash runtime behavior changes",
    "approval record generation changes",
    "approval verification behavior changes",
  ], "keying plan non-authorization")
  assert.match(keying, /does not authorize/i)
})

// ── Threat model ─────────────────────────────────────────────

test("12. threat model includes all required threats", () => {
  requireAll(threat, [
    "cross-tenant secret confusion",
    "replayed approval payload",
    "forged approval hash",
    "leaked tenant secret",
    "secret in logs",
    "secret in evidence ledger",
    "secret in release decision record",
    "approval payload canonicalization mismatch",
    "self-approval bypass",
    "external action execution without valid approval",
  ], "threat model threats")
})

test("13. threat model includes all No-Go conditions", () => {
  requireAll(threat, [
    "secrets visible in logs",
    "secrets visible in docs or evidence records",
    "tenant mismatch accepted",
    "replay accepted without review",
    "provider unavailable but approval passes open",
    "self-approval accepted",
    "approval verification skipped",
    "external execution enabled before this gate is implemented and reviewed",
  ], "threat model No-Go conditions")
})

test("14. threat model includes the required mitigations", () => {
  requireAll(threat, [
    "fail-closed verification",
    "tenant mismatch rejection",
    "canonical payload mismatch rejection",
    "replay review before activation",
    "four-eyes / self-approval constraints preserved",
    "no secrets in logs",
    "no secrets in evidence ledger",
    "no secrets in release decision record",
  ], "threat model mitigations")
})

// ── Negative: no live secret markers in the new docs ─────────

test("15. new docs contain no live secret markers", () => {
  for (const doc of [design, keying, threat]) {
    for (const marker of ["sk-", "Bearer ", "BEGIN PRIVATE KEY", "oauth_access_token", "AKIA", "api_key="]) {
      assert.equal(doc.includes(marker), false, `docs must not contain live secret marker: ${marker}`)
    }
  }
})
