/**
 * Persistence Mode Configuration
 *
 * Centralized persistence mode selection. The route and backend code
 * delegates to this module rather than embedding env checks directly.
 *
 * RULES:
 *   - PRODUCTION: in-memory is NEVER allowed. D1 only if configured.
 *   - DEVELOPMENT: in-memory only when ALLOW_IN_MEMORY_PERSISTENCE=true.
 *     D1 only when PERSISTENCE_MODE=d1.
 *   - Default: disabled (no persistence).
 */

// ─── Mode ────────────────────────────────────────────────────────

export type PersistenceMode = "in_memory" | "d1" | "disabled"

export type PersistenceConfig = {
  mode: PersistenceMode
  isProduction: boolean
  isInMemoryAllowed: boolean
  isD1Requested: boolean
}

/**
 * Resolve the persistence mode from environment.
 */
export function resolvePersistenceConfig(
  env: {
    NODE_ENV?: string
    ALLOW_IN_MEMORY_PERSISTENCE?: string
    PERSISTENCE_MODE?: string
  } = process.env as Record<string, string | undefined>,
): PersistenceConfig {
  const isProduction = env.NODE_ENV === "production"
  const allowInMemory = env.ALLOW_IN_MEMORY_PERSISTENCE === "true"
  const isD1Requested = env.PERSISTENCE_MODE === "d1"

  // Production: in-memory NEVER allowed
  if (isProduction) {
    return {
      mode: isD1Requested ? "d1" : "disabled",
      isProduction: true,
      isInMemoryAllowed: false,
      isD1Requested,
    }
  }

  // Development: in-memory only when explicitly enabled
  if (allowInMemory) {
    return {
      mode: "in_memory",
      isProduction: false,
      isInMemoryAllowed: true,
      isD1Requested,
    }
  }

  // Development: D1 when requested
  if (isD1Requested) {
    return {
      mode: "d1",
      isProduction: false,
      isInMemoryAllowed: false,
      isD1Requested: true,
    }
  }

  return {
    mode: "disabled",
    isProduction: false,
    isInMemoryAllowed: false,
    isD1Requested: false,
  }
}
