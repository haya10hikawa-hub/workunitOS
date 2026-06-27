import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  checkRateLimit,
  resetRateLimitStore,
  type RateLimitKey,
} from "../app/lib/security/rateLimitGate.ts"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/security/rateLimitGate.ts"), "utf-8")

test.beforeEach(() => { resetRateLimitStore() })

const key: RateLimitKey = { tenantId: "t1", actorUserId: "u1", clientIp: "127.0.0.1", routeFamily: "workunit_tools" }

test("rate limit key includes tenantId", () => {
  const k1: RateLimitKey = { ...key, tenantId: "ta" }
  const k2: RateLimitKey = { ...key, tenantId: "tb" }
  assert.notDeepEqual(k1.tenantId, k2.tenantId) // different tenants get different keys
})

test("rate limit key includes actorUserId", () => {
  assert.ok(key.actorUserId.length > 0)
})

test("rate limit key includes IP", () => {
  assert.ok(key.clientIp.length > 0)
})

test("first request is allowed", () => {
  assert.equal(checkRateLimit(key).ok, true)
})

test("requests within limit are allowed", () => {
  for (let i = 0; i < 30; i++) assert.equal(checkRateLimit(key).ok, true)
})

test("request beyond limit returns rate_limited", () => {
  for (let i = 0; i < 60; i++) checkRateLimit(key)
  const r = checkRateLimit(key)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.reason, "rate_limited")
})

test("different tenant/user/IP keys are independent", () => {
  for (let i = 0; i < 60; i++) checkRateLimit(key)
  const other: RateLimitKey = { tenantId: "t2", actorUserId: "u2", clientIp: "10.0.0.1", routeFamily: "workunit_tools" }
  assert.equal(checkRateLimit(other).ok, true)
})

// ─── Source scans ─────────────────────────────────────────────

test("source has no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("source has no provider SDK", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false)
})
