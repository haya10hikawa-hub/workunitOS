/**
 * LLM Provider Configuration
 *
 * Centralized provider selection rules. The route delegates to this
 * module rather than embedding env checks directly.
 *
 * RULES:
 *   - PRODUCTION: all providers are disabled until the guarded real-provider
 *     boundary is approved and wired end to end.
 *   - DEVELOPMENT: mock is allowed when ALLOW_MOCK_LLM=true.
 *     Real providers remain disabled.
 *   - Legacy fallback: when mode is "disabled" and the legacy ingest
 *     path is available, the route may fall through. Controlled by
 *     ALLOW_LEGACY_INGEST_FALLBACK.
 */

import { createMockLlmProvider } from "./mockProvider.ts"
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
  // Production: all provider execution is blocked until the readiness gate is wired.
  if (isProduction) {
    return {
      mode: "disabled",
      allowMock: false,
      allowLegacyFallback,
      isProduction: true,
    }
  }

  // Development: mock is the only executable provider.
  if (allowMock) {
    return {
      mode: "mock",
      allowMock: true,
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
    case "real":
      return null
    case "disabled":
      return null
  }
}
