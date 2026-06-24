import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { runGuardedLlmProvider } from "../app/lib/application/llmProvider/guardedLlmProvider.ts"
import { REAL_LLM_PROVIDER_POLICY_REQUIRED } from "../app/lib/application/llmReadiness/realLlmProviderPolicy.ts"
import type { LLMContextPack } from "../app/lib/application/llmContext/types.ts"

const safePack: LLMContextPack = {
  route: "draft_generation",
  nodeSummary: "Editable draft only",
  constraints: { externalExecutionBlocked: true, approvalRequired: true, humanReviewRequired: true, forbiddenActions: [] },
}

const controls = { featureFlagEnabled: true, globalKillSwitchOpen: true, tenantAllowlisted: true, budgetLimitAvailable: true, redactionApplied: true, auditLoggingEnabled: true, p0ScannerEnabled: true, contextAllowlistApplied: true }

test("blocks forbidden context fields and raw provider payload", () => {
  const forbiddenPack = { ...safePack, approvalId: "approval:1" } as unknown as LLMContextPack
  const contextResult = runGuardedLlmProvider({ request: { contextPack: forbiddenPack }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  const payloadResult = runGuardedLlmProvider({ request: { contextPack: safePack, rawProviderPayload: { body: "raw" } }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  assert.equal(contextResult.blockedReasons.includes("forbidden_context"), true)
  assert.equal(contextResult.blockedReasons.includes("context_key_not_allowlisted"), true)
  assert.equal(payloadResult.blockedReasons.includes("raw_provider_payload_forbidden"), true)
})

test("blocked provider findings never include value previews", () => {
  const result = runGuardedLlmProvider({ request: { contextPack: { ...safePack, sourceSummary: "approvalId: secret-value" } }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  assert.equal(result.blockedReasons.includes("forbidden_context"), true)
  assert.equal(JSON.stringify(result.findings).includes("secret-value"), false)
  assert.equal(JSON.stringify(result.findings).includes("valuePreview"), false)
})

test("context allowlist blocks extra nested constraint keys", () => {
  const pack = { ...safePack, constraints: { ...safePack.constraints, displayLabel: "safe extra key" } } as unknown as LLMContextPack
  const result = runGuardedLlmProvider({ request: { contextPack: pack }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  assert.equal(result.blockedReasons.includes("context_key_not_allowlisted"), true)
  assert.equal(result.findings?.some((finding) => finding.path === "$.constraints.displayLabel"), true)
})

test("context allowlist blocks invalid route and missing node summary", () => {
  const invalidRoute = { ...safePack, route: "not_a_route" } as unknown as LLMContextPack
  const missingSummary = { ...safePack, nodeSummary: undefined } as unknown as LLMContextPack
  const routeResult = runGuardedLlmProvider({ request: { contextPack: invalidRoute }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  const summaryResult = runGuardedLlmProvider({ request: { contextPack: missingSummary }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  assert.equal(routeResult.blockedReasons.includes("context_key_not_allowlisted"), true)
  assert.equal(summaryResult.blockedReasons.includes("context_key_not_allowlisted"), true)
})

test("provider boundary never creates Formal Approval or Execution", () => {
  const result = runGuardedLlmProvider({ request: { contextPack: safePack }, controls, policy: REAL_LLM_PROVIDER_POLICY_REQUIRED })
  const flat = JSON.stringify(result)
  assert.equal(flat.includes("formalNodeId"), false)
  assert.equal(flat.includes("approvalId"), false)
  assert.equal(flat.includes("executionId"), false)
  assert.equal(result.candidateOnly, true)
})

test("provider boundary source has no SDK network env API UI persistence or migration surface", async () => {
  for (const file of ["llmProviderBoundary.ts", "disabledLlmProvider.ts", "guardedLlmProvider.ts"]) {
    const source = await readFile(`app/lib/application/llmProvider/${file}`, "utf8")
    for (const forbidden of ["OpenAI", "Anthropic", "DeepSeek", "Gemini", "Ollama", "fetch(", "process.env", "API_KEY", "/api/", "/components/", "supabase", "migration"]) {
      assert.equal(source.includes(forbidden), false, `${file} must not include ${forbidden}`)
    }
  }
})
