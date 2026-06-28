/**
 * D1 Database Abstraction
 *
 * Defines minimal D1-compatible interfaces so repository implementations
 * can be written against a contract rather than Cloudflare's concrete types.
 *
 * This allows tests to use a fake implementation without requiring a
 * real Cloudflare D1 binding.
 */

// ─── Statement ──────────────────────────────────────────────────

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<{ success: boolean; meta?: { rows_written?: number } }>
}

// ─── Database ───────────────────────────────────────────────────

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike
}

// ─── Error ──────────────────────────────────────────────────────

export class D1RepositoryError extends Error {
  // Explicit field + assignment instead of a TypeScript parameter property, so the
  // file is compatible with Node's type strip-only mode (which rejects parameter
  // properties). Runtime shape is unchanged: `new D1RepositoryError(msg, cause)`
  // still exposes `cause` as a readonly instance property.
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "D1RepositoryError"
    this.cause = cause
  }
}
