/**
 * Fake D1 Implementation for Testing
 *
 * Simulates D1DatabaseLike and D1PreparedStatementLike enough
 * to test repository SQL patterns without requiring Cloudflare.
 *
 * SIMPLIFIED MODEL: Each "table" is a Map<string, Record<string, unknown>>.
 * The INSERT handler stores the full row with all bind values mapped
 * to SQL column names (from the INSERT statement). The first bind value
 * is always the row's ID.
 *
 * NOTE: Column mapping is determined by the INSERT statement that was
 * first prepared for each table. If different INSERT statements are used
 * for the same table, reset() should be called between tests.
 */

import type { D1DatabaseLike, D1PreparedStatementLike } from "../../app/lib/persistence/d1/types.ts"

// ─── Statement ──────────────────────────────────────────────────

class FakeD1Statement implements D1PreparedStatementLike {
  private sql: string
  private store: Map<string, Map<string, Record<string, unknown>>>
  private tableName: string
  private values: unknown[] = []

  constructor(
    sql: string,
    store: Map<string, Map<string, Record<string, unknown>>>,
    tableName: string,
  ) {
    this.sql = sql
    this.store = store
    this.tableName = tableName
  }

  bind(...values: unknown[]): this {
    this.values = values
    return this
  }

  async first<T = unknown>(): Promise<T | null> {
    const table = this.store.get(this.tableName)
    if (!table) return null
    if (this.values.length > 0) {
      const whereCols = this.extractWhereColumns()
      if (whereCols.length > 0 && !(whereCols.length === 1 && whereCols[0] === "id")) {
        // Scan table for matching column value
        for (const row of table.values()) {
          if (whereCols.every((col, index) => String(row[col]) === String(this.values[index]))) {
            return row as unknown as T
          }
        }
        return null
      }
      // Default: lookup by primary key
      return (table.get(String(this.values[0])) ?? null) as unknown as T
    }
    return null
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    const table = this.store.get(this.tableName)
    if (!table) return { results: [] }

    // Filter by WHERE column if present
    const whereCols = this.extractWhereColumns()
    if (whereCols.length > 0 && this.values.length > 0) {
      const filtered = Array.from(table.values()).filter(
        (row) => whereCols.every((col, index) => String(row[col]) === String(this.values[index]))
      )
      return { results: this.applyLimit(filtered, whereCols.length) as unknown as T[] }
    }

    return { results: this.applyLimit(Array.from(table.values()), 0) as unknown as T[] }
  }

  async run(): Promise<{ success: boolean; meta?: { rows_written?: number } }> {
    const lower = this.sql.toLowerCase().trimStart()

    if (lower.startsWith("insert")) {
      let table = this.store.get(this.tableName)
      if (!table) {
        table = new Map()
        this.store.set(this.tableName, table)
      }
      const row = this.buildInsertRow()
      if (this.values.length > 0) {
        table.set(String(this.values[0]), row)
      }
      return { success: true, meta: { rows_written: 1 } }
    }

    if (lower.startsWith("update")) {
      const table = this.store.get(this.tableName)
      if (table && this.values.length >= 2) {
        const id = String(this.values[this.values.length - 1])
        const existing = table.get(id)
        if (existing) {
          const updated = { ...existing }
          if (lower.includes("status") && lower.includes("used_at")) {
            updated["status"] = "used"
            updated["used_at"] = this.values[0]
          } else if (lower.includes("status") && lower.includes("updated_at")) {
            updated["status"] = this.values[0]
            updated["updated_at"] = this.values[1]
          } else if (lower.includes("status")) {
            updated["status"] = this.values[0]
          }
          table.set(id, updated)
        }
      }
      return { success: true }
    }

    return { success: true }
  }

  // ── Private ────────────────────────────────────────────────

  private buildInsertRow(): Record<string, unknown> {
    const cols = this.extractColumns()
    const row: Record<string, unknown> = {}
    for (let i = 0; i < cols.length; i++) {
      row[cols[i]] = this.values[i]
    }
    return row
  }

  private extractWhereColumns(): string[] {
    const normalizedSql = this.sql.replace(/\s+/g, " ")
    const match = normalizedSql.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|$)/i)
    if (!match) return []
    return match[1]
      .split(/\s+and\s+/i)
      .map((part) => part.match(/(\w+)\s*=/i)?.[1] ?? null)
      .filter((value): value is string => value !== null)
  }

  private extractColumns(): string[] {
    const match = this.sql.match(/\(([^)]+)\)\s*values/i)
    if (!match) return this.values.map((_, i) => `col${i}`)
    return match[1].split(",").map((c) => c.trim())
  }

  private applyLimit(rows: Record<string, unknown>[], offset: number): Record<string, unknown>[] {
    if (!/limit\s+\?/i.test(this.sql)) return rows
    const rawLimit = this.values[offset]
    const limit = typeof rawLimit === "number" ? rawLimit : Number.parseInt(String(rawLimit ?? ""), 10)
    return Number.isFinite(limit) && limit >= 0 ? rows.slice(0, limit) : rows
  }
}

// ─── Database ───────────────────────────────────────────────────

export class FakeD1Database implements D1DatabaseLike {
  private store = new Map<string, Map<string, Record<string, unknown>>>()

  prepare(query: string): D1PreparedStatementLike {
    const tableMatch = query.match(/from\s+(\w+)/i)
      ?? query.match(/insert\s+into\s+(\w+)/i)
      ?? query.match(/update\s+(\w+)/i)
    const tableName = tableMatch?.[1] ?? "unknown"
    return new FakeD1Statement(query, this.store, tableName)
  }

  reset(): void {
    this.store.clear()
  }

  debugTable(tableName: string): Record<string, unknown>[] {
    return Array.from(this.store.get(tableName)?.values() ?? []).map((row) => ({ ...row }))
  }
}
