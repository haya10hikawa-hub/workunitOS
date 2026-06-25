import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SRC = readFileSync(join(import.meta.dirname!, "../app/lib/application/llmProvider/candidateOnlyMockBoundaryHarness.ts"), "utf-8")

test("P0: no provider SDK", () => { for (const sdk of ["openai", "anthropic", "deepseek", "gemini", "ollama"]) assert.equal(SRC.includes(sdk), false) })
test("P0: no fetch", () => { assert.equal(SRC.includes("fetch("), false) })
test("P0: no process.env", () => { assert.equal(SRC.includes("process.env"), false) })

test("P0: no API key patterns", () => {
  for (const p of ["sk-", "API_KEY", "TOKEN", "Bearer", "SECRET"]) assert.equal(SRC.includes(p), false)
})

test("P0: no execution/approval patterns", () => {
  for (const p of ["approvalId", "executionId", "executionPayload", "providerRequest", "providerResponse", "createApproval", "createExecution"]) assert.equal(SRC.includes(p), false)
})

test("P0: no UI/API/persistence imports", () => {
  for (const p of ["React", "useState", "useEffect", "route.ts", "Supabase", "createClient", "D1", "database"]) assert.equal(SRC.includes(p), false)
})

test("P0: no upstream flow component imports", () => {
  for (const p of ["orchestrator", "processWorkSignal", "generateWorkUnitDraft", "evaluateWorkUnit", "extractCandidate",
    "Source Signal", "sourceSignal", "LLMContextPack", "ContextPack", "Exclusion Scanner", "exclusionScanner",
    "Decomposition Classifier", "decompositionClassifier", "Decomposition Orchestrator", "decompositionOrchestrator",
    "Action Field", "actionField", "Human Review", "humanReview"]) {
    // Use word-boundary regex so sourceSignal doesn't match inside sourceSignalConnected etc.
    const re = new RegExp("\\b" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b")
    assert.equal(re.test(SRC), false, `should not contain ${p}`)
  }
})
