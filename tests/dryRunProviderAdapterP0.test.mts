import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/dryRunProviderAdapter.ts"), "utf-8")
const BOUNDARY_SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/providerAdapterBoundary.ts"), "utf-8")

for (const [name, src] of [["dryRunAdapter", SRC], ["boundary", BOUNDARY_SRC]] as const) {
  test(`P0: ${name} - no provider SDK`, () => {
    for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) {
      assert.equal(src.includes(sdk), false)
    }
  })
  test(`P0: ${name} - no fetch`, () => { assert.equal(src.includes("fetch("), false) })
  test(`P0: ${name} - no process.env`, () => { assert.equal(src.includes("process.env"), false) })
  test(`P0: ${name} - no API key patterns`, () => {
    for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer", "SECRET"]) {
      assert.equal(src.includes(p), false)
    }
  })
  test(`P0: ${name} - no execution/approval patterns`, () => {
    for (const p of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse", "createApproval", "createExecution"]) {
      assert.equal(src.includes(p), false, `should not contain ${p}`)
    }
  })
}
