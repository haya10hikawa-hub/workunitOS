import test from "node:test"
import assert from "node:assert/strict"
import { getModelRoute } from "../app/lib/llm/modelRouter.ts"
import { createDeepSeekProvider } from "../app/lib/llm/deepseekProvider.ts"
import type { LlmRequest } from "../app/lib/llm/types.ts"

// ─── Fetch Mock Helper ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFetch = (...args: any[]) => Promise<Response>

function withFetchStub(stub: AnyFetch, fn: () => Promise<void>): Promise<void> {
  const prev = globalThis.fetch
  globalThis.fetch = stub
  return fn().finally(() => { globalThis.fetch = prev })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// ─── Stage Model Resolution ─────────────────────────────────────

test("extract_candidate resolves to per-stage model from env", () => {
  const route = getModelRoute("extract_candidate", {
    DEEPSEEK_MODEL_EXTRACT: "deepseek-extract-v1",
  })
  assert.equal(route.model, "deepseek-extract-v1")
  assert.equal(route.stage, "extract_candidate")
  assert.ok(route.maxOutputTokens > 0)
})

test("generate_workunit_draft resolves to per-stage model from env", () => {
  const route = getModelRoute("generate_workunit_draft", {
    DEEPSEEK_MODEL_DRAFT: "deepseek-pro-v2",
  })
  assert.equal(route.model, "deepseek-pro-v2")
})

test("evaluate_workunit resolves to per-stage model from env", () => {
  const route = getModelRoute("evaluate_workunit", {
    DEEPSEEK_MODEL_EVALUATE: "deepseek-eval-lite",
  })
  assert.equal(route.model, "deepseek-eval-lite")
})

test("all stages fall back to DEEPSEEK_DEFAULT_MODEL", () => {
  const stages = ["extract_candidate", "generate_workunit_draft", "evaluate_workunit"] as const
  for (const stage of stages) {
    const route = getModelRoute(stage, {
      DEEPSEEK_DEFAULT_MODEL: "fallback-model",
    })
    assert.equal(route.model, "fallback-model")
  }
})

test("missing all models returns hardcoded default", () => {
  const route = getModelRoute("extract_candidate", {})
  assert.equal(route.model, "deepseek-chat")
})

// ─── Provider Request Body: Model Selection ─────────────────────

test("deepseek provider passes request.model in API body", () =>
  withFetchStub(async (_url, init) => {
    const capturedBody = (init as RequestInit)?.body?.toString() ?? ""
    const body = JSON.parse(capturedBody)
    assert.equal(body.model, "per-stage-model-v1")
    assert.equal(body.temperature, 0.3)
    assert.equal(body.max_tokens, 400)
    return jsonResponse({ choices: [{ message: { content: "test" }, finish_reason: "stop" }] })
  }, async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })

    const request: LlmRequest = {
      messages: [{ role: "user", content: "hello" }],
      model: "per-stage-model-v1",
      temperature: 0.3,
      maxTokens: 400,
      stage: "generate_workunit_draft",
    }

    await provider.generateJson(request)
  }),
)

test("deepseek provider uses defaultModel when request.model is missing", () =>
  withFetchStub(async (_url, init) => {
    const capturedBody = (init as RequestInit)?.body?.toString() ?? ""
    const body = JSON.parse(capturedBody)
    assert.equal(body.model, "my-default-model")
    return jsonResponse({ choices: [{ message: { content: "test" }, finish_reason: "stop" }] })
  }, async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "my-default-model", timeoutMs: 5000,
    })

    await provider.generateJson({
      messages: [{ role: "user", content: "x" }],
      stage: "extract_candidate",
    })
  }),
)

// ─── Full Integration: getModelRoute → request body ─────────────

test("getModelRoute model ends up in provider request body", async () => {
  const draftRoute = getModelRoute("generate_workunit_draft", {
    DEEPSEEK_MODEL_DRAFT: "deepseek-pro-v2",
  })

  let capturedBody = ""

  await withFetchStub(async (_url, init) => {
    capturedBody = (init as RequestInit)?.body?.toString() ?? ""
    return jsonResponse({ choices: [{ message: { content: "test" }, finish_reason: "stop" }] })
  }, async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })

    await provider.generateJson({
      messages: [{ role: "user", content: "test draft" }],
      model: draftRoute.model,
      temperature: draftRoute.temperature,
      maxTokens: draftRoute.maxOutputTokens,
      stage: "generate_workunit_draft",
    })
  })

  const body = JSON.parse(capturedBody)
  assert.equal(body.model, "deepseek-pro-v2")
  assert.equal(body.temperature, draftRoute.temperature)
  assert.equal(body.max_tokens, draftRoute.maxOutputTokens)
})

// ─── Mock Provider Compatibility ────────────────────────────────

test("mock provider accepts model param without error", async () => {
  const { createMockLlmProvider, STANDARD_MOCK_RESPONSES } = await import("../app/lib/llm/mockProvider.ts")
  const provider = createMockLlmProvider(STANDARD_MOCK_RESPONSES)

  const response = await provider.generateJson({
    messages: [{ role: "user", content: "x" }],
    model: "custom-model",
    temperature: 0.7,
    maxTokens: 2000,
    stage: "generate_workunit_draft",
  })

  assert.ok(response.content.length > 0)
  assert.equal(response.finishReason, "stop")
})
