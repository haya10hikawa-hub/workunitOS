import test from "node:test"
import assert from "node:assert/strict"
import { SEALED_SECRET_POLICY } from "../app/lib/application/llmProvider/providerSecretPolicy.ts"

test("sealed secret policy has secretSource not-configured", () => {
  assert.equal(SEALED_SECRET_POLICY.secretSource, "not-configured")
})

test("sealed secret policy never in source", () => {
  assert.equal(SEALED_SECRET_POLICY.neverInSource, true)
})

test("sealed secret policy never in model context", () => {
  assert.equal(SEALED_SECRET_POLICY.neverInModelContext, true)
})

test("sealed secret policy never in diagnostics", () => {
  assert.equal(SEALED_SECRET_POLICY.neverInDiagnostics, true)
})

test("sealed secret policy has no rotation required when not configured", () => {
  assert.equal(SEALED_SECRET_POLICY.rotationRequired, false)
})

test("sealed secret policy serialized has no secret values", () => {
  const s = JSON.stringify(SEALED_SECRET_POLICY)
  assert.equal(s.includes("sk-"), false)
  assert.equal(s.includes("SECRET"), false)
  assert.equal(s.includes("TOKEN"), false)
  assert.equal(s.includes("process.env"), false)
})

test("sealed secret policy source has no env reads", () => {
  const src = SEALED_SECRET_POLICY.toString()
  assert.equal(src.includes("process.env"), false)
  assert.equal(src.includes("fetch("), false)
})
