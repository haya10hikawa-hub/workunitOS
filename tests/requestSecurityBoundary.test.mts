import test from "node:test"
import assert from "node:assert/strict"
import { readBoundedJsonObject } from "../app/lib/security/requestBody.ts"
import { validateToolBackendRequest } from "../app/lib/toolBackendValidation.ts"

function jsonRequest(value: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  })
}

test("bounded JSON reader rejects payloads over the byte limit", async () => {
  const result = await readBoundedJsonObject(jsonRequest({ value: "x".repeat(2_000) }), { maxBytes: 1_024 })
  assert.deepEqual(result, { ok: false, reason: "payload_too_large" })
})

test("bounded JSON reader rejects excessive nesting without recursion", async () => {
  let value: Record<string, unknown> = { leaf: true }
  for (let index = 0; index < 30; index += 1) value = { next: value }
  const result = await readBoundedJsonObject(jsonRequest(value), { maxDepth: 10 })
  assert.deepEqual(result, { ok: false, reason: "invalid_structure" })
})

test("tool validation rejects deep and cyclic structures without throwing", () => {
  const body: Record<string, unknown> = {
    id: "request-1",
    source: "slack",
    operation: "ingest",
    event: { id: "event-1", source: "slack" },
  }
  let cursor = body.event as Record<string, unknown>
  for (let index = 0; index < 100; index += 1) {
    cursor.next = {}
    cursor = cursor.next as Record<string, unknown>
  }
  assert.doesNotThrow(() => validateToolBackendRequest(body))
  assert.equal(validateToolBackendRequest(body).ok, false)

  const cyclic: Record<string, unknown> = { id: "event-2", source: "slack" }
  cyclic.self = cyclic
  assert.equal(validateToolBackendRequest({ id: "request-2", source: "slack", operation: "ingest", event: cyclic }).ok, false)
})

test("tool validation checks strings nested inside arrays", () => {
  const result = validateToolBackendRequest({
    id: "request-3",
    source: "slack",
    operation: "ingest",
    event: { id: "event-3", source: "slack", labels: ["x".repeat(10_001)] },
  })
  assert.equal(result.ok, false)
})
