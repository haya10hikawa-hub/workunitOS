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

/**
 * Serialize a JSON column value for storage without double-encoding (Phase 5D).
 *
 * - nullish / empty   → "{}" (a create-time default for absent content)
 * - string            → stored verbatim (already JSON text)
 * - object/array      → stringified exactly once
 *
 * Does not mutate the input and never throws.
 */
export function toJsonColumn(value: unknown): string {
  if (value === undefined || value === null || value === "") return "{}"
  if (typeof value === "string") return value
  return safeJsonStringify(value)
}

/**
 * Read a stored JSON column as a verbatim string (Phase 5D).
 *
 * Returns the original string only when it parses as JSON, so content is
 * preserved exactly. Returns null when the column is missing, non-string, or
 * malformed — the caller treats a malformed row as unusable (fail-safe) rather
 * than fabricating a default/executable target or payload.
 *
 * Never returns parser error text and never echoes the raw stored content.
 */
export function readJsonColumn(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    JSON.parse(value)
    return value
  } catch {
    return null
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
