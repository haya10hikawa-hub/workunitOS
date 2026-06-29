/**
 * DeepSeek LLM Provider
 *
 * Implements the LlmProvider interface for the DeepSeek API.
 * DeepSeek is OpenAI-compatible for chat completions.
 *
 * SAFETY:
 *   - API key passed via config, never hardcoded.
 *   - Raw prompts and responses are NOT logged.
 *   - Errors are mapped to safe types — raw provider bodies are
 *     never exposed to callers.
 *   - Uses AbortController for timeout enforcement.
 */

import type { LlmProvider, LlmRequest, LlmResponse } from "./types.ts"

// ─── Config ──────────────────────────────────────────────────────

export type DeepSeekProviderConfig = {
  apiKey: string
  baseUrl: string
  defaultModel: string
  timeoutMs: number
}

export const DEEPSEEK_DEFAULTS = {
  baseUrl: "https://api.deepseek.com",
  defaultModel: "deepseek-chat",
  timeoutMs: 15_000,
} as const

/**
 * Reject provider base URLs that point at internal / link-local / metadata
 * endpoints (red-team C-06: `DEEPSEEK_BASE_URL` was used unvalidated, enabling
 * SSRF to e.g. http://169.254.169.254 with the API key attached). HTTPS is
 * required; plain HTTP is only tolerated for localhost during development.
 */
export function isSafeProviderBaseUrl(value: string, opts: { allowLocalhost?: boolean } = {}): boolean {
  let url: URL
  try { url = new URL(value) } catch { return false }

  const host = url.hostname.toLowerCase()
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]"

  if (url.protocol !== "https:") {
    if (!(url.protocol === "http:" && isLoopback && opts.allowLocalhost)) return false
  }
  if (isLoopback) return Boolean(opts.allowLocalhost)

  // Block private / link-local IPv4 literals and the cloud metadata address.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map((n) => parseInt(n, 10))
    if (a === 10 || a === 127 || a === 0) return false
    if (a === 169 && b === 254) return false           // link-local incl. 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
  }
  // Block IPv6 private/link-local literals.
  if (host.startsWith("[")) {
    if (host.startsWith("[fe80") || host.startsWith("[fc") || host.startsWith("[fd") || host === "[::]") return false
  }
  return true
}

/**
 * Create a DeepSeek provider from config.
 */
export function createDeepSeekProvider(config: DeepSeekProviderConfig): LlmProvider {
  return {
    async generateJson(request: LlmRequest): Promise<LlmResponse> {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

      try {
        const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: request.model ?? config.defaultModel,
            messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: request.maxTokens,
            temperature: request.temperature,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const status = response.status
          // NEVER expose raw response body
          if (status === 401 || status === 403) {
            throw new Error("provider_auth_error")
          }
          if (status === 429) {
            throw new Error("provider_rate_limited")
          }
          throw new Error(`provider_error:${status}`)
        }

        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }

        const choice = data.choices?.[0]
        if (!choice?.message?.content) {
          throw new Error("provider_empty_response")
        }

        return {
          content: choice.message.content,
          finishReason: choice.finish_reason === "stop" ? "stop" : choice.finish_reason === "length" ? "length" : "error",
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
          } : undefined,
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error("provider_timeout")
        }
        throw error
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

/**
 * Create a DeepSeek provider from environment variables.
 * Returns null if required config is missing.
 */
export function createDeepSeekProviderFromEnv(env: {
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_BASE_URL?: string
  DEEPSEEK_DEFAULT_MODEL?: string
  LLM_TIMEOUT_MS?: string
} = process.env as Record<string, string | undefined>): LlmProvider | null {
  const apiKey = env.DEEPSEEK_API_KEY
  if (!apiKey) return null

  const baseUrl = env.DEEPSEEK_BASE_URL ?? DEEPSEEK_DEFAULTS.baseUrl
  // SSRF guard: refuse to construct a provider pointed at an unsafe base URL.
  const allowLocalhost = (env as { NODE_ENV?: string }).NODE_ENV !== "production"
  if (!isSafeProviderBaseUrl(baseUrl, { allowLocalhost })) return null

  return createDeepSeekProvider({
    apiKey,
    baseUrl,
    defaultModel: env.DEEPSEEK_DEFAULT_MODEL ?? DEEPSEEK_DEFAULTS.defaultModel,
    timeoutMs: parseTimeout(env.LLM_TIMEOUT_MS, DEEPSEEK_DEFAULTS.timeoutMs),
  })
}

function parseTimeout(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
