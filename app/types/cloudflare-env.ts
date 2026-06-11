/**
 * Cloudflare Environment Types
 *
 * Defines type-safe access to Cloudflare runtime bindings.
 * Uses the project's existing D1DatabaseLike abstraction rather
 * than importing Cloudflare runtime types directly.
 */

import type { D1DatabaseLike } from "../lib/persistence/d1/types"

// ─── Application Bindings ──────────────────────────────────────

/**
 * Cloudflare Pages/Workers runtime environment.
 * Bindings are populated from wrangler.toml [[d1_databases]].
 */
export interface CloudflareEnv {
  CONTROL_DB?: D1DatabaseLike
  TENANT_DB_DEFAULT?: D1DatabaseLike

  // Environment variables (from wrangler.toml [vars])
  PERSISTENCE_MODE?: string
  LLM_PROVIDER?: string
  DEEPSEEK_API_KEY?: string
  EXTERNAL_ACTIONS_ENABLED?: string
  ALLOW_LEGACY_INGEST_FALLBACK?: string
}

/**
 * Application environment that may include Cloudflare bindings.
 * Accepts both Cloudflare runtime env and plain objects (for testing).
 */
export type AppEnv = CloudflareEnv & Record<string, unknown>
