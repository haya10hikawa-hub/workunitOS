/**
 * Cloudflare D1 Binding Helpers
 *
 * Safely extract D1 bindings from the runtime environment.
 * Returns typed success/failure — never throws raw binding errors.
 */

import type { D1DatabaseLike } from "./d1/types.ts"
import type { AppEnv } from "../../types/cloudflare-env.ts"

// ─── Binding Names ──────────────────────────────────────────────

export const CONTROL_DB_BINDING = "CONTROL_DB" as const
export const TENANT_DB_DEFAULT_BINDING = "TENANT_DB_DEFAULT" as const

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Get the control (registry) D1 database binding.
 * Returns null if missing or if the value is a placeholder string.
 */
export function getControlDbBinding(env: AppEnv): D1DatabaseLike | null {
  return extractBinding(env, CONTROL_DB_BINDING)
}

/**
 * Get the default tenant D1 database binding.
 * Returns null if missing or if the value is a placeholder string.
 */
export function getDefaultTenantDbBinding(env: AppEnv): D1DatabaseLike | null {
  return extractBinding(env, TENANT_DB_DEFAULT_BINDING)
}

/**
 * Get all D1 bindings needed for production persistence.
 */
export function getCloudflareD1Bindings(env: AppEnv): {
  controlDb: D1DatabaseLike | null
  tenantDefaultDb: D1DatabaseLike | null
} {
  return {
    controlDb: getControlDbBinding(env),
    tenantDefaultDb: getDefaultTenantDbBinding(env),
  }
}

// ─── Internal ───────────────────────────────────────────────────

function extractBinding(env: AppEnv, name: string): D1DatabaseLike | null {
  const value = env[name]
  if (!value) return null

  // Reject placeholder strings
  if (typeof value === "string") {
    if (value.startsWith("REPLACE_")) return null
    return null // Strings are not D1 bindings
  }

  // Accept D1DatabaseLike objects (real bindings or FakeD1Database in tests)
  if (typeof value === "object" && value !== null) {
    if ("prepare" in value && typeof (value as Record<string, unknown>).prepare === "function") {
      return value as D1DatabaseLike
    }
  }

  return null
}
