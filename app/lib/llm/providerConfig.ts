/**
 * LLM Provider Configuration
 *
 * Centralized provider selection rules. The route delegates to this
 * module rather than embedding env checks directly.
 *
 * RULES:
 *   - PRODUCTION: mock is NEVER allowed. Real provider (DeepSeek) is
 *     used when LLM_PROVIDER=deepseek and DEEPSEEK_API_KEY is set.
 *   - DEVELOPMENT: mock is allowed when ALLOW_MOCK_LLM=true.
 *     Real provider when LLM_PROVIDER=deepseek and key exists.
 *     Otherwise disabled.
 *   - Legacy fallback: when mode is "disabled" and the legacy ingest
 *     path is available, the route may fall through. Controlled by
 *     ALLOW_LEGACY_INGEST_FALLBACK.
 */

import { createMockLlmProvider } from "./mockProvider.ts"
import { createDeepSeekProviderFromEnv } from "./deepseekProvider.ts"
import type { LlmProvider } from "./types.ts"

// ─── Mode ────────────────────────────────────────────────────────

export type LlmProviderMode = "disabled" | "mock" | "real"

export type LlmProviderConfig = {
  mode: LlmProviderMode
  allowMock: boolean
  allowLegacyFallback: boolean
  isProduction: boolean
}

/**
 * Resolve the current provider configuration from environment.
 */
export function resolveLlmProviderConfig(
  env: {
    NODE_ENV?: string
    ALLOW_MOCK_LLM?: string
    ALLOW_LEGACY_INGEST_FALLBACK?: string
    LLM_PROVIDER?: string
    DEEPSEEK_API_KEY?: string
  } = process.env as Record<string, string | undefined>,
): LlmProviderConfig {
  const isProduction = env.NODE_ENV === "production"
  const allowMock = env.ALLOW_MOCK_LLM === "true"
  const allowLegacyFallback = env.ALLOW_LEGACY_INGEST_FALLBACK === "true"
  const hasRealProvider = env.LLM_PROVIDER === "deepseek" && !!env.DEEPSEEK_API_KEY

  // Production: mock NEVER allowed; real only if configured
  if (isProduction) {
    return {
      mode: hasRealProvider ? "real" : "disabled",
      allowMock: false,
      allowLegacyFallback,
      isProduction: true,
    }
  }

  // Development: mock takes priority, then real, then disabled
  if (allowMock) {
    return {
      mode: "mock",
      allowMock: true,
      allowLegacyFallback,
      isProduction: false,
    }
  }

  if (hasRealProvider) {
    return {
      mode: "real",
      allowMock: false,
      allowLegacyFallback,
      isProduction: false,
    }
  }

  return {
    mode: "disabled",
    allowMock: false,
    allowLegacyFallback,
    isProduction: false,
  }
}

/**
 * Resolve an LLM provider instance from the config.
 */
export function resolveLlmProvider(
  env?: Parameters<typeof resolveLlmProviderConfig>[0],
): { provider: LlmProvider; mode: LlmProviderMode } | null {
  const config = resolveLlmProviderConfig(env)

  switch (config.mode) {
    case "mock":
      return { provider: createMockLlmProvider(), mode: "mock" }
    case "real": {
      const provider = createDeepSeekProviderFromEnv(env as Record<string, string | undefined>)
      if (!provider) return null
      return { provider, mode: "real" }
    }
    case "disabled":
      return null
  }
}
