import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { validateCsrfOrigin } from "../app/lib/security/csrfProtection.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/security/csrfProtection.ts"), "utf-8")

// ─── Same-origin / allowed ────────────────────────────────────

test("same-origin request is allowed", () => {
  const req = new Request("http://localhost:3000", { headers: { Origin: "http://localhost:3000" } })
  assert.equal(validateCsrfOrigin(req).ok, true)
})

test("configured allowed origin is allowed", () => {
  // localhost:3000 is in ALLOWED_ORIGINS
  const req = new Request("http://localhost:3000", { headers: { Origin: "http://localhost:3000" } })
  assert.equal(validateCsrfOrigin(req).ok, true)
})

test("Referer fallback works when Origin missing", () => {
  const req = new Request("http://localhost:3000", { headers: { Referer: "http://localhost:3000/api/workunit/tools" } })
  assert.equal(validateCsrfOrigin(req).ok, true)
})

// ─── Blocked ───────────────────────────────────────────────────

test("cross-site Origin is blocked", () => {
  const req = new Request("http://localhost:3000", { headers: { Origin: "https://evil.com" } })
  const r = validateCsrfOrigin(req)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, "invalid_origin")
})

test("malformed Origin is blocked", () => {
  const req = new Request("http://localhost:3000", { headers: { Origin: "not-a-url!!!" } })
  const r = validateCsrfOrigin(req)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, "invalid_origin")
})

test("missing Origin and Referer is blocked", () => {
  const req = new Request("http://localhost:3000")
  const r = validateCsrfOrigin(req)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, "csrf_failed")
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no process.env beyond allowed origins config", () => {
  // Only process.env.ALLOWED_ORIGINS and NEXT_PUBLIC_APP_URL are allowed
  const envRefs = SRC.match(/process\.env\./g) ?? []
  assert.ok(envRefs.length <= 2)
})

test("source has no API key patterns", () => {
  for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer", "SECRET"]) assert.equal(SRC.includes(p), false)
})
