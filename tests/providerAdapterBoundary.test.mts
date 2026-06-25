import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/providerAdapterBoundary.ts"), "utf-8")

test("source has no provider SDK imports", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false, `should not contain ${sdk}`)
  }
})

test("source has no fetch calls", () => {
  assert.equal(SRC.includes("fetch("), false)
})

test("source has no process.env", () => {
  assert.equal(SRC.includes("process.env"), false)
})

test("source has no execution-related fields", () => {
  for (const forbidden of ["executionPayload", "createApproval", "createExecution"]) {
    assert.equal(SRC.includes(forbidden), false, `should not contain ${forbidden}`)
  }
})
