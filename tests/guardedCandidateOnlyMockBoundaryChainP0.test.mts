import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/guardedCandidateOnlyMockBoundaryChain.ts"), "utf-8")

test("P0: no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("P0: no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("P0: no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("P0: no API key patterns", () => {
  for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer", "SECRET"]) assert.equal(SRC.includes(p), false)
})

test("P0: no execution/approval patterns", () => {
  for (const p of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse", "createApproval", "createExecution"]) assert.equal(SRC.includes(p), false)
})

test("P0: no direct adapter or routing imports", () => {
  for (const p of ["BLOCKED_PROVIDER_ADAPTER", "DRY_RUN_PROVIDER_ADAPTER", "routeProviderAdapter"]) assert.equal(SRC.includes(p), false)
})

test("P0: no upstream/downstream imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate", "route.ts", "React", "useState", "useEffect", "Supabase", "createClient", "D1", "database"]) assert.equal(SRC.includes(p), false)
})

test("P0: imports only allowed modules", () => {
  const ALLOWED = ["./providerAdapterBoundary.ts", "./providerAdapterRoutingGate.ts", "./candidateOnlyContextPackExclusionGuard.ts", "./candidateOnlyMockBoundaryHarness.ts"]
  const fromPaths = [...SRC.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
  for (const p of fromPaths) {
    assert.ok(ALLOWED.some(a => p.endsWith(a)), `unexpected import from: ${p}`)
  }
})

test("P0: provider boundary and routing gate imports are type-only", () => {
  const imports = SRC.match(/^import .+$/gm) ?? []
  const boundary = imports.filter((l) => l.includes("./providerAdapterBoundary.ts"))
  const routing = imports.filter((l) => l.includes("./providerAdapterRoutingGate.ts"))
  assert.equal(boundary.length, 1)
  assert.equal(routing.length, 1)
  for (const line of [...boundary, ...routing]) {
    assert.ok(line.startsWith("import type "), `must be type-only: ${line}`)
  }
})
