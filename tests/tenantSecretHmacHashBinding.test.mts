/**
 * Phase 5E: Tenant-secret HMAC-SHA256 hash binding.
 *
 * Verifies the HMAC helper, the explicit legacy SHA-256 compatibility path, and
 * that no raw tenant secret or hashed value leaks through results or errors.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  hashField,
  canonicalize,
  computeLegacySha256Hash,
  computeTenantHmacSha256Hash,
  verifyHashBinding,
  HashBindingError,
} from "../app/lib/security/hash.ts"

// Test-only deterministic secrets — never used in production.
const SECRET_A = "test-tenant-secret-aaaa"
const SECRET_B = "test-tenant-secret-bbbb"
const VALUE = { provider: "slack", destination: "#general", body: "hi" }
const OTHER_VALUE = { provider: "slack", destination: "#general", body: "different" }

const HEX64 = /^[0-9a-f]{64}$/

// ─── Canonicalization stability (1) ─────────────────────────────

test("1. canonicalization remains stable (key order independent)", () => {
  const a = JSON.stringify(canonicalize({ b: 2, a: 1, c: { y: 1, x: 2 } }))
  const b = JSON.stringify(canonicalize({ c: { x: 2, y: 1 }, a: 1, b: 2 }))
  assert.equal(a, b)
  // Legacy SHA-256 over canonical form is unchanged.
  assert.equal(computeLegacySha256Hash(VALUE), hashField(VALUE))
})

// ─── HMAC determinism / variance (2,3,4,5) ──────────────────────

test("2. HMAC-SHA256 is deterministic for same secret + value", () => {
  assert.equal(computeTenantHmacSha256Hash(VALUE, SECRET_A), computeTenantHmacSha256Hash(VALUE, SECRET_A))
})

test("3. HMAC changes when the tenant secret changes", () => {
  assert.notEqual(computeTenantHmacSha256Hash(VALUE, SECRET_A), computeTenantHmacSha256Hash(VALUE, SECRET_B))
})

test("4. HMAC changes when the value changes", () => {
  assert.notEqual(computeTenantHmacSha256Hash(VALUE, SECRET_A), computeTenantHmacSha256Hash(OTHER_VALUE, SECRET_A))
})

test("5. HMAC output is 64 lowercase hex", () => {
  assert.match(computeTenantHmacSha256Hash(VALUE, SECRET_A), HEX64)
})

test("HMAC differs from legacy SHA-256 for the same value", () => {
  assert.notEqual(computeTenantHmacSha256Hash(VALUE, SECRET_A), computeLegacySha256Hash(VALUE))
})

// ─── Injection / missing-secret (7,8) ───────────────────────────

test("7 & 8. empty/missing tenant secret fails safely with HashBindingError", () => {
  assert.throws(() => computeTenantHmacSha256Hash(VALUE, ""), (e: unknown) => e instanceof HashBindingError && e.code === "missing_tenant_secret")
  // @ts-expect-error: intentionally omitting the required secret
  assert.throws(() => computeTenantHmacSha256Hash(VALUE, undefined), HashBindingError)
})

// ─── No raw secret / value exposure (9,10,11) ───────────────────

test("9 & 11. thrown error contains no raw secret or value", () => {
  try {
    computeTenantHmacSha256Hash(VALUE, "")
    assert.fail("should have thrown")
  } catch (e) {
    const s = `${(e as Error).name}: ${(e as Error).message}\n${(e as Error).stack ?? ""}`
    for (const leak of [SECRET_A, "test-tenant-secret", "#general", "slack", "hi"]) {
      assert.equal(s.includes(leak), false, `error must not leak ${leak}`)
    }
  }
})

test("10. serialized HMAC result contains no raw secret", () => {
  const digest = computeTenantHmacSha256Hash(VALUE, SECRET_A)
  assert.equal(digest.includes(SECRET_A), false)
  const verify = verifyHashBinding({ value: VALUE, storedDigest: digest, tenantSecret: SECRET_A, allowLegacySha256: false })
  const serialized = JSON.stringify(verify)
  for (const leak of [SECRET_A, "test-tenant-secret"]) {
    assert.equal(serialized.includes(leak), false)
  }
})

// ─── Verifier: HMAC + explicit legacy (12,13,14) ────────────────

test("verifyHashBinding matches an HMAC digest with the correct secret", () => {
  const digest = computeTenantHmacSha256Hash(VALUE, SECRET_A)
  const r = verifyHashBinding({ value: VALUE, storedDigest: digest, tenantSecret: SECRET_A, allowLegacySha256: false })
  assert.deepEqual(r, { ok: true, matched: "hmac-sha256" })
})

test("verifyHashBinding rejects an HMAC digest with the wrong secret", () => {
  const digest = computeTenantHmacSha256Hash(VALUE, SECRET_A)
  const r = verifyHashBinding({ value: VALUE, storedDigest: digest, tenantSecret: SECRET_B, allowLegacySha256: false })
  assert.equal(r.ok, false)
  assert.equal(r.matched, "none")
})

test("12. legacy SHA-256 verifier path is explicit (only with allowLegacySha256)", () => {
  const legacy = computeLegacySha256Hash(VALUE)
  const allowed = verifyHashBinding({ value: VALUE, storedDigest: legacy, allowLegacySha256: true })
  assert.deepEqual(allowed, { ok: true, matched: "sha256" })
  const denied = verifyHashBinding({ value: VALUE, storedDigest: legacy, allowLegacySha256: false })
  assert.equal(denied.ok, false)
})

test("13. a legacy SHA-256 digest never silently passes as HMAC", () => {
  const legacy = computeLegacySha256Hash(VALUE)
  // Secret provided + legacy allowed: must match via the legacy path, reported as sha256 (not hmac).
  const r = verifyHashBinding({ value: VALUE, storedDigest: legacy, tenantSecret: SECRET_A, allowLegacySha256: true })
  assert.equal(r.ok, true)
  assert.equal(r.matched, "sha256")
})

test("14. legacy records remain verifiable (back-compat) and HMAC records do not match the legacy path", () => {
  const legacy = computeLegacySha256Hash(VALUE)
  assert.equal(verifyHashBinding({ value: VALUE, storedDigest: legacy, allowLegacySha256: true }).ok, true)
  const hmac = computeTenantHmacSha256Hash(VALUE, SECRET_A)
  // An HMAC digest must NOT verify through the legacy SHA-256 path alone.
  assert.equal(verifyHashBinding({ value: VALUE, storedDigest: hmac, allowLegacySha256: true }).ok, false)
})

// ─── Source scans (6,18,19,20) ──────────────────────────────────

const HASH_SRC = "app/lib/security/hash.ts"
const TENANT_SECRET_SRC = "app/lib/security/tenantSecret.ts"

test("6 & 19. low-level hash helper does not read process.env", async () => {
  const src = await readFile(HASH_SRC, "utf8")
  assert.equal(src.includes("process.env"), false)
})

test("18. hash helper has no hardcoded production secret / default fallback secret", async () => {
  const src = await readFile(HASH_SRC, "utf8")
  // No literal secret assignment and no default-secret fallback patterns.
  assert.equal(/tenantSecret\s*=\s*["'`]/.test(src), false)
  assert.equal(/tenantSecret\s*\?\?\s*["'`]/.test(src), false)
  assert.equal(/["'`]default-secret["'`]/.test(src), false)
})

test("19b. tenantSecret provider module is interface-only and reads no env", async () => {
  const src = await readFile(TENANT_SECRET_SRC, "utf8")
  assert.equal(src.includes("process.env"), false)
  // Interface only: no class/implementation, no fetch.
  assert.equal(src.includes("class "), false)
  assert.equal(src.includes("fetch("), false)
})

test("20. hash helper has no provider SDK / fetch / network / external execution", async () => {
  const src = await readFile(HASH_SRC, "utf8")
  for (const bad of ["fetch(", "openai", "anthropic", "executionPayload", "providerRequest", "providerResponse", "Bearer", "sk-", "API_KEY"]) {
    assert.equal(src.includes(bad), false, `hash helper must not include ${bad}`)
  }
})
