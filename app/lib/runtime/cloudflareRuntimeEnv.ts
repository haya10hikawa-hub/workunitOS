/**
 * Cloudflare Runtime Environment Bridge
 *
 * Provides a safe, testable way to access Cloudflare runtime environment
 * (including D1 bindings) from route handlers.
 *
 * LOCAL DEV / Next.js:
 *   - No Cloudflare runtime available → getRequestRuntimeEnv() returns null.
 *   - All persistence falls back to in-memory (if allowed) or disabled.
 *
 * CLOUDFLARE PAGES:
 *   - Deployment adapter (next-on-pages etc.) provides context.env.
 *   - This module provides a hook to pass that env into routes.
 *
 * TESTS:
 *   - setTestRuntimeEnvForRequest() injects fake env for testing.
 *   - resetTestRuntimeEnvForRequest() clears between tests.
 */

import type { AppEnv } from "../../types/cloudflare-env.ts"

// ─── Global Test State (NO production use) ──────────────────────

let __testRuntimeEnv: AppEnv | null = null

/**
 * Set a fake runtime env for the current test.
 * ONLY for test files. Never call in production routes.
 */
export function setTestRuntimeEnvForRequest(env: AppEnv | null): void {
  __testRuntimeEnv = env
}

/**
 * Reset fake runtime env between tests.
 */
export function resetTestRuntimeEnvForRequest(): void {
  __testRuntimeEnv = null
}

// ─── Runtime Env Access ─────────────────────────────────────────

/**
 * Get the Cloudflare runtime environment for the current request.
 *
 * Returns null when running locally (Next.js dev server) or when
 * no Cloudflare adapter has injected the env.
 *
 * In production on Cloudflare Pages, the deployment adapter
 * (next-on-pages, OpenNext, etc.) should call setRequestRuntimeEnvInProd
 * or provide env through request context.
 */
export function getRequestRuntimeEnv(): AppEnv | null {
  // Test mode: return explicitly set fake env
  if (__testRuntimeEnv !== null) return __testRuntimeEnv

  // Cloudflare Pages: check for global env (injected by adapter)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalEnv = (globalThis as any).__CLOUDFLARE_RUNTIME_ENV__
  if (globalEnv && typeof globalEnv === "object") return globalEnv as AppEnv

  // No runtime env available
  return null
}

// ─── Production Adapter Hook ────────────────────────────────────

/**
 * Store the Cloudflare runtime env for production request handling.
 *
 * Called once by the deployment adapter (next-on-pages, etc.) before
 * the Next.js app handles the request.
 *
 * The adapter should call this with context.env from the Cloudflare
 * Pages function handler.
 */
export function setRequestRuntimeEnvInProd(env: AppEnv): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).__CLOUDFLARE_RUNTIME_ENV__ = env
}
