import test from "node:test"
import assert from "node:assert/strict"
import { toSafeDiagnostic, toSafeDiagnostics, containsValuePreview } from "../app/lib/application/llmProvider/blockedDiagnosticRedaction.ts"

test("redacts approvalId value preview", () => {
  const d = toSafeDiagnostic({ path: "$.approvalId", key: "approvalId", reason: "forbidden_key", valuePreview: "ap-secret-preview-12345678" })
  assert.equal(d.key, "approvalId")
  assert.equal("valuePreview" in d, false)
  assert.equal(typeof d.valueType, "string")
})

test("redacts hash value preview", () => {
  const d = toSafeDiagnostic({ path: "$.targetHash", key: "targetHash", reason: "forbidden_key", valuePreview: "sha256-secret-hash-string" })
  assert.equal("valuePreview" in d, false)
  assert.equal(d.valueLength, 26)
})

test("redacts tenantId value preview", () => {
  const d = toSafeDiagnostic({ path: "$.tenantId", key: "tenantId", reason: "forbidden_key", valuePreview: "tenant-abc-123" })
  assert.equal("valuePreview" in d, false)
})

test("redacts userId value preview", () => {
  const d = toSafeDiagnostic({ path: "$.userId", key: "userId", reason: "forbidden_key", valuePreview: "user-secret-id" })
  assert.equal("valuePreview" in d, false)
})

test("redacts role value preview", () => {
  const d = toSafeDiagnostic({ path: "$.role", key: "role", reason: "forbidden_key", valuePreview: "admin" })
  assert.equal("valuePreview" in d, false)
})

test("redacts arbitrary sensitive text", () => {
  const d = toSafeDiagnostic({ path: "$.body", key: "body", reason: "forbidden_value", valuePreview: "Dear Customer, your account password is abc123." })
  assert.equal("valuePreview" in d, false)
  assert.equal(d.valueLength, 48)
})

test("safe diagnostic preserves metadata", () => {
  const d = toSafeDiagnostic({ path: "$.missingField", key: "missingField", reason: "forbidden_key" })
  assert.equal(d.path, "$.missingField")
  assert.equal(d.key, "missingField")
  assert.equal(d.severity, "p0")
})

test("toSafeDiagnostics handles arrays", () => {
  const out = toSafeDiagnostics([
    { path: "$.a", key: "a", reason: "forbidden_key", valuePreview: "secret1" },
    { path: "$.b", key: "b", reason: "forbidden_value", valuePreview: "secret2" },
  ])
  assert.equal(out.length, 2)
  for (const o of out) assert.equal("valuePreview" in o, false)
})

test("containsValuePreview detects exposure in JSON", () => {
  assert.equal(containsValuePreview('{"valuePreview":"secret"}'), true)
})

test("safe diagnostic serialized has no raw value", () => {
  const d = toSafeDiagnostic({ path: "$.x", key: "x", reason: "forbidden_key", valuePreview: "should-not-appear" })
  const s = JSON.stringify(d)
  assert.equal(s.includes("should-not-appear"), false)
  assert.equal(containsValuePreview(s), false)
})
