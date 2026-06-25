import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/dryRunProviderAdapterDesignGate.ts"), "utf-8")

test("P0: no provider SDK strings in source", () => {
  for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
    assert.equal(SRC.includes(sdk), false)
  }
})

test("P0: no fetch in source", () => { assert.equal(SRC.includes("fetch("), false) })
test("P0: no process.env in source", () => { assert.equal(SRC.includes("process.env"), false) })

test("P0: no API key patterns", () => {
  for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer"]) {
    assert.equal(SRC.includes(p), false)
  }
})

test("P0: no execution payload patterns", () => {
  for (const p of ["executionPayload", "createApproval", "createExecution", "providerRequest", "providerResponse"]) {
    assert.equal(SRC.includes(p), false)
  }
})
