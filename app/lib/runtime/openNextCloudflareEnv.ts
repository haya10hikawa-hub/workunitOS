/**
 * OpenNext Cloudflare Runtime Env Adapter
 *
 * Isolated adapter-specific logic for extracting Cloudflare runtime env
 * from the OpenNext Cloudflare request context.
 *
 * USAGE:
 *   In a Cloudflare Pages entrypoint (e.g., functions/[[path]].ts or
 *   middleware), call:
 *
 *     import { extractCloudflareEnv } from "@/app/lib/runtime/openNextCloudflareEnv"
 *     import { setRequestRuntimeEnvInProd } from "@/app/lib/runtime/cloudflareRuntimeEnv"
 *
 *     export const onRequest = async (context) => {
 *       const env = extractCloudflareEnv(context)
 *       if (env) setRequestRuntimeEnvInProd(env)
 *       return context.next()
 *     }
 *
 * LOCAL DEV:
 *   When running locally (Next.js dev server), no Cloudflare context
 *   exists. extractCloudflareEnv() returns null. The runtime env
 *   bridge falls back to in-memory or disabled mode.
 */

import type { CloudflareEnv } from "@/app/types/cloudflare-env" with { "resolution-mode": "import" }

// ─── OpenNext Context Type (minimal) ──────────────────────────────

/**
 * Minimal Cloudflare Pages request context.
 * OpenNext provides this shape via its runtime.
 */
interface OpenNextRequestContext {
  env?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next?: () => any
}

// ─── Extraction ──────────────────────────────────────────────────

/**
 * Extract Cloudflare env from an OpenNext request context.
 *
 * Returns null when:
 *   - Running locally (no context.env)
 *   - Context is not a Cloudflare Pages request
 *   - env is empty or undefined
 *
 * Does NOT validate bindings — that's the job of the binding helper.
 */
export function extractCloudflareEnv(
  context: unknown,
): CloudflareEnv | null {
  if (!context || typeof context !== "object") return null

  const ctx = context as OpenNextRequestContext
  if (!ctx.env || typeof ctx.env !== "object") return null

  return ctx.env as CloudflareEnv
}
