import test from "node:test"
import assert from "node:assert/strict"
import { createDeepSeekProvider, createDeepSeekProviderFromEnv, DEEPSEEK_DEFAULTS } from "../app/lib/llm/deepseekProvider.ts"

// ─── Fetch Mock Helper ──────────────────────────────────────────

type FetchStub = (url: string | URL | Request, init?: RequestInit) => Promise<Response>

function withFetch(stub: FetchStub, fn: () => Promise<void> | void): Promise<void> {
  const prev = globalThis.fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = stub as any
  const result = fn()
  if (result instanceof Promise) {
    return result.finally(() => { globalThis.fetch = prev })
  }
  globalThis.fetch = prev
  return Promise.resolve()
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// ─── Create Provider ────────────────────────────────────────────

test("createDeepSeekProviderFromEnv returns null without API key", () => {
  assert.equal(createDeepSeekProviderFromEnv({}), null)
})

test("createDeepSeekProviderFromEnv returns provider with API key", () => {
  const result = createDeepSeekProviderFromEnv({ DEEPSEEK_API_KEY: "sk-test" })
  assert.ok(result)
})

test("createDeepSeekProviderFromEnv uses defaults when not set", () => {
  const result = createDeepSeekProviderFromEnv({ DEEPSEEK_API_KEY: "sk-test" })
  assert.ok(result)
})

// ─── API Call Behavior ──────────────────────────────────────────

test("deepseek provider sends Authorization Bearer header", () =>
  withFetch(async (_url, init) => {
    const headers = init?.headers as Record<string, string> | undefined
    assert.ok(headers)
    assert.equal(headers["Authorization"], "Bearer sk-test-key")
    return jsonResponse({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] })
  }, async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test-key", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    await provider.generateJson({ messages: [{ role: "user", content: "hello" }], stage: "extract_candidate" })
  }),
)

test("deepseek provider uses configured baseUrl", () =>
  withFetch(async (url) => {
    assert.ok(url.toString().includes("https://custom.deepseek.example.com"))
    return jsonResponse({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] })
  }, async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://custom.deepseek.example.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    await provider.generateJson({ messages: [{ role: "user", content: "x" }], stage: "extract_candidate" })
  }),
)

test("deepseek provider returns content and usage from valid response", () =>
  withFetch(async () => jsonResponse({
    choices: [{ message: { content: "test response" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 15, completion_tokens: 8 },
  }), async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    const response = await provider.generateJson({ messages: [{ role: "user", content: "x" }], stage: "extract_candidate" })
    assert.equal(response.content, "test response")
    assert.equal(response.finishReason, "stop")
    assert.ok(response.usage)
    assert.equal(response.usage!.promptTokens, 15)
    assert.equal(response.usage!.completionTokens, 8)
  }),
)

// ─── Error Handling ─────────────────────────────────────────────

test("deepseek provider throws on 401 without exposing raw body", () =>
  withFetch(async () => jsonResponse({ error: { message: "invalid api key", code: "invalid" } }, 401), async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-bad", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    try {
      await provider.generateJson({ messages: [{ role: "user", content: "x" }], stage: "extract_candidate" })
      assert.fail("Should have thrown")
    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      assert.match(msg, /provider_auth_error/)
      assert.equal(msg.includes("invalid api key"), false)
    }
  }),
)

test("deepseek provider throws on 429", () =>
  withFetch(async () => jsonResponse({}, 429), async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    try {
      await provider.generateJson({ messages: [{ role: "user", content: "x" }], stage: "extract_candidate" })
      assert.fail("Should have thrown")
    } catch (error) {
      assert.match((error as Error).message, /provider_rate_limited/)
    }
  }),
)

test("deepseek provider throws on 500 without exposing raw body", () =>
  withFetch(async () => jsonResponse({ error: "internal error details" }, 500), async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    try {
      await provider.generateJson({ messages: [{ role: "user", content: "x" }], stage: "extract_candidate" })
      assert.fail("Should have thrown")
    } catch (error) {
      const msg = (error as Error).message
      assert.match(msg, /provider_error:500/)
      assert.equal(msg.includes("internal error details"), false)
    }
  }),
)

test("deepseek provider throws on empty response", () =>
  withFetch(async () => jsonResponse({ choices: [] }), async () => {
    const provider = createDeepSeekProvider({
      apiKey: "sk-test", baseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-chat", timeoutMs: 5000,
    })
    try {
      await provider.generateJson({ messages: [{ role: "user", content: "x" }], stage: "extract_candidate" })
      assert.fail("Should have thrown")
    } catch (error) {
      assert.match((error as Error).message, /provider_empty_response/)
    }
  }),
)

// ─── Defaults ───────────────────────────────────────────────────

test("DEEPSEEK_DEFAULTS has expected values", () => {
  assert.equal(DEEPSEEK_DEFAULTS.baseUrl, "https://api.deepseek.com")
  assert.equal(DEEPSEEK_DEFAULTS.defaultModel, "deepseek-chat")
  assert.ok(DEEPSEEK_DEFAULTS.timeoutMs > 0)
})
