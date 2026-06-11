import test from "node:test"
import assert from "node:assert/strict"
import { resolveLlmProviderConfig, resolveLlmProvider } from "../app/lib/llm/providerConfig.ts"

// ─── Provider Config: DeepSeek ──────────────────────────────────

test("production with deepseek config: mode is real", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "production",
    LLM_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: "sk-test",
  })
  assert.equal(config.mode, "real")
  assert.equal(config.allowMock, false)
  assert.equal(config.isProduction, true)
})

test("production without LLM_PROVIDER: mode is disabled", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "production",
    DEEPSEEK_API_KEY: "sk-test",
  })
  assert.equal(config.mode, "disabled")
})

test("production with deepseek but no key: mode is disabled", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "production",
    LLM_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: undefined,
  })
  assert.equal(config.mode, "disabled")
})

test("production with ALLOW_MOCK_LLM: mock still blocked", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "production",
    ALLOW_MOCK_LLM: "true",
  })
  assert.equal(config.mode, "disabled")
  assert.equal(config.allowMock, false)
})

test("development: mock takes priority over deepseek", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
    ALLOW_MOCK_LLM: "true",
    LLM_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: "sk-test",
  })
  // Mock wins in dev when both are configured
  assert.equal(config.mode, "mock")
})

test("development with deepseek config (no mock): mode is real", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
    LLM_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: "sk-test",
  })
  assert.equal(config.mode, "real")
  assert.equal(config.allowMock, false)
  assert.equal(config.isProduction, false)
})

test("development without any config: mode is disabled", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
  })
  assert.equal(config.mode, "disabled")
})

// ─── Provider Resolution: DeepSeek ──────────────────────────────

test("resolveLlmProvider returns null without key in dev", () => {
  const result = resolveLlmProvider({
    NODE_ENV: "development",
    LLM_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: undefined,
  })
  assert.equal(result, null)
})

test("resolveLlmProvider returns null when disabled", () => {
  const result = resolveLlmProvider({
    NODE_ENV: "development",
  })
  assert.equal(result, null)
})
