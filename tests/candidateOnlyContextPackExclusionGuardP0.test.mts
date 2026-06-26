import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/candidateOnlyContextPackExclusionGuard.ts"), "utf-8")

test("P0: no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("P0: no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("P0: no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("P0: no API key patterns", () => {
  for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer", "SECRET"]) assert.equal(SRC.includes(p), false)
})

test("P0: no execution/approval patterns", () => {
  for (const p of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse", "createApproval", "createExecution"]) assert.equal(SRC.includes(p), false)
})

test("P0: no adapter/harness/routing execution imports", () => {
  for (const p of ["runCandidateOnlyMockBoundaryHarness", "routeProviderAdapter", "BLOCKED_PROVIDER_ADAPTER", "DRY_RUN_PROVIDER_ADAPTER"]) assert.equal(SRC.includes(p), false)
})

test("P0: no upstream/downstream imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate", "React", "useState", "useEffect", "route.ts", "Supabase", "createClient", "D1", "database"]) assert.equal(SRC.includes(p), false)
})

test("P0: only allowed type-only import exists", () => {
  const imports = SRC.match(/^import .+$/gm) ?? []
  assert.equal(imports.length, 1, "should have exactly one import")
  assert.ok(imports[0].includes("import type"), "import must be type-only")
  assert.ok(imports[0].includes("CandidateOnlyMockBoundaryInput"), "must import CandidateOnlyMockBoundaryInput")
  assert.ok(imports[0].includes("./candidateOnlyMockBoundaryHarness.ts"), "must import from Phase 4F harness")
})
