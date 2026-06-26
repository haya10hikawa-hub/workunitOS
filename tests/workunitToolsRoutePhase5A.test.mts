import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Import the route POST handler directly
import { POST } from "../app/api/workunit/tools/route.ts"

const SRC_ROUTE = readFileSync(join(import.meta.dirname!, "../app/api/workunit/tools/route.ts"), "utf-8")

// ─── CSRF / Origin route-level tests ─────────────────────────

test("cross-site Origin POST is rejected by the route", async () => {
  const req = new Request("http://localhost:3000/api/workunit/tools", {
    method: "POST",
    headers: { Origin: "https://evil.com", "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "draft" }),
  })
  const res = await POST(req)
  assert.equal(res.status, 403)
  const body: Record<string, string> = await res.json()
  assert.ok(body.error === "invalid_origin" || body.error === "csrf_failed")
})

test("malformed Origin POST is rejected by the route", async () => {
  const req = new Request("http://localhost:3000/api/workunit/tools", {
    method: "POST",
    headers: { Origin: "!!not-valid!!", "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "draft" }),
  })
  const res = await POST(req)
  assert.equal(res.status, 403)
})

test("missing Origin/Referer POST is rejected by the route", async () => {
  const req = new Request("http://localhost:3000/api/workunit/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "draft" }),
  })
  const res = await POST(req)
  assert.equal(res.status, 403)
})

// ─── Source scans on route ───────────────────────────────────

test("route imports CSRF protection", () => {
  assert.ok(SRC_ROUTE.includes("validateCsrfOrigin"))
})

test("route imports rate limit", () => {
  assert.ok(SRC_ROUTE.includes("checkRateLimit"))
})

test("route calls CSRF before session", () => {
  const csrfIdx = SRC_ROUTE.indexOf("validateCsrfOrigin")
  const sessionIdx = SRC_ROUTE.indexOf("requireSession")
  assert.ok(csrfIdx > 0 && sessionIdx > 0 && csrfIdx < sessionIdx, "CSRF must run before session")
})

test("route calls rate limit before RBAC", () => {
  const rateIdx = SRC_ROUTE.indexOf("checkRateLimit")
  const rbacIdx = SRC_ROUTE.indexOf("hasPermission")
  assert.ok(rateIdx > 0 && rbacIdx > 0 && rateIdx < rbacIdx, "Rate limit must run before RBAC")
})

test("route does not trust client-provided tenantId in body", () => {
  assert.equal(SRC_ROUTE.includes("body.tenantId"), false)
})

test("route does not trust client-provided role in body", () => {
  assert.equal(SRC_ROUTE.includes("body.role"), false)
})

// ─── Safe error verification ─────────────────────────────────

test("safe errors in route do not include Authorization", () => {
  for (const p of ["Authorization", "Bearer", "API_KEY", "SECRET", "TOKEN", "sk-"]) {
    const lines = SRC_ROUTE.split("\n").filter((l) => l.includes(p) && !l.includes("//") && !l.includes("*"))
    assert.equal(lines.length, 0, `should not contain ${p} in route logic`)
  }
})

test("route has safe error responses for CSRF+rate limit", () => {
  assert.ok(SRC_ROUTE.includes('"invalid_origin"') || SRC_ROUTE.includes("invalid_origin"))
  assert.ok(SRC_ROUTE.includes('"csrf_failed"') || SRC_ROUTE.includes("csrf_failed"))
  assert.ok(SRC_ROUTE.includes('"rate_limited"') || SRC_ROUTE.includes("rate_limited"))
})
