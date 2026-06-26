import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/candidateOnlyDecompositionRuleGate.ts"), "utf-8")

test("P0: no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("P0: no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("P0: no process.env", () => { assert.equal(SRC.includes("process.env"), false) })
test("P0: no API key patterns", () => { for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer", "SECRET"]) assert.equal(SRC.includes(p), false) })
test("P0: no execution/approval patterns", () => {
  for (const p of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse", "createApproval", "createExecution"]) assert.equal(SRC.includes(p), false)
})
test("P0: no forbidden runtime imports", () => {
  for (const p of ["BLOCKED_PROVIDER_ADAPTER", "DRY_RUN_PROVIDER_ADAPTER", "routeProviderAdapter",
    "runCandidateOnlyMockBoundaryHarness", "guardCandidateOnlyContextPackForMockBoundary", "runGuardedCandidateOnlyMockBoundaryChain",
    "classifyCandidateOnlyMockBoundaryResult", "createBlockedCandidateOnlyDecompositionClassifierResult",
    "orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate",
    "route.ts", "React", "useState", "useEffect", "Supabase", "createClient", "D1", "database"]) assert.equal(SRC.includes(p), false)
})
test("P0: only allowed type-only import exists", () => {
  const imports = SRC.match(/^import .+$/gm) ?? []
  assert.deepEqual(imports, [
    'import type { CandidateOnlyDecompositionClassifierResult } from "./candidateOnlyDecompositionClassifier.ts"',
  ])
})
