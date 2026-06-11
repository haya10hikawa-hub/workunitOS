/**
 * D1 Row Helpers
 *
 * Safe conversion utilities for working with D1 result rows.
 * All JSON parse/stringify operations are wrapped in try/catch
 * and return sensible defaults on failure.
 */

// ─── JSON ───────────────────────────────────────────────────────

/** Safely parse a JSON column value. Returns defaultValue on failure. */
export function safeJsonParse<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue
  try {
    return JSON.parse(value) as T
  } catch {
    return defaultValue
  }
}

/** Safely stringify a value for JSON column storage. */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return "{}"
  }
}

// ─── Timestamps ─────────────────────────────────────────────────

/** Return an ISO timestamp string for "now". */
export function nowISO(): string {
  return new Date().toISOString()
}

// ─── Null Checkers ──────────────────────────────────────────────

/** Return the first truthy string, or default. */
export function orDefault(value: string | null | undefined, fallback: string): string {
  return value ?? fallback
}
