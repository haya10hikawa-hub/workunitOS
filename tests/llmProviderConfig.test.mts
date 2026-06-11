import test from "node:test"
import assert from "node:assert/strict"
import { resolveLlmProviderConfig, resolveLlmProvider } from "../app/lib/llm/providerConfig.ts"

// ─── Provider Config ────────────────────────────────────────────

test("production: mode is disabled even with ALLOW_MOCK_LLM=true", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "production",
    ALLOW_MOCK_LLM: "true",
  })
  assert.equal(config.mode, "disabled")
  assert.equal(config.allowMock, false)
  assert.equal(config.isProduction, true)
})

test("development without flag: mode is disabled", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
    ALLOW_MOCK_LLM: undefined,
  })
  assert.equal(config.mode, "disabled")
  assert.equal(config.allowMock, false)
})

test("development with ALLOW_MOCK_LLM=true: mode is mock", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
    ALLOW_MOCK_LLM: "true",
  })
  assert.equal(config.mode, "mock")
  assert.equal(config.allowMock, true)
  assert.equal(config.isProduction, false)
})

test("development with ALLOW_MOCK_LLM=false: mode is disabled", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
    ALLOW_MOCK_LLM: "false",
  })
  assert.equal(config.mode, "disabled")
})

test("legacy fallback flag is read correctly", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
    ALLOW_LEGACY_INGEST_FALLBACK: "true",
  })
  assert.equal(config.allowLegacyFallback, true)
})

test("legacy fallback defaults to false", () => {
  const config = resolveLlmProviderConfig({
    NODE_ENV: "development",
  })
  assert.equal(config.allowLegacyFallback, false)
})

// ─── Provider Resolution ────────────────────────────────────────

test("resolveLlmProvider returns null in production", () => {
  const result = resolveLlmProvider({
    NODE_ENV: "production",
    ALLOW_MOCK_LLM: "true",
  })
  assert.equal(result, null)
})

test("resolveLlmProvider returns null without flag", () => {
  const result = resolveLlmProvider({
    NODE_ENV: "development",
    ALLOW_MOCK_LLM: undefined,
  })
  assert.equal(result, null)
})

test("resolveLlmProvider returns mock provider with flag", () => {
  const result = resolveLlmProvider({
    NODE_ENV: "development",
    ALLOW_MOCK_LLM: "true",
  })
  assert.ok(result)
  assert.equal(result.mode, "mock")
  assert.ok(result.provider)
})
