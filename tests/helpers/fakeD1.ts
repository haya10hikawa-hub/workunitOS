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
      let rowsWritten = 0
      if (table) {
        const { setClause, conditions } = this.buildUpdatePlan()
        for (const row of table.values()) {
          if (conditions.every((c) => FakeD1Statement.evalCondition(row, c))) {
            Object.assign(row, setClause)
            rowsWritten++
          }
        }
      }
      // rows_written mirrors D1's conditional-UPDATE semantics so callers can
      // detect compare-and-set claims (Phase 5B markUsed).
      return { success: true, meta: { rows_written: rowsWritten } }
    }

    return { success: true }
  }

  /**
   * Parse an UPDATE statement into a resolved SET map and WHERE conditions,
   * binding `?` placeholders positionally (SET placeholders precede WHERE ones,
   * matching SQL text order). Supports `col = ?`, `col = 'literal'`,
   * `col IS [NOT] NULL`, and `col {>,<,>=,<=} ?` conditions.
   */
  private buildUpdatePlan(): {
    setClause: Record<string, unknown>
    conditions: Array<{ col: string; op: string; value?: unknown }>
  } {
    const norm = this.sql.replace(/\s+/g, " ").trim()
    const lower = norm.toLowerCase()
    const setIdx = lower.indexOf(" set ")
    const whereIdx = lower.indexOf(" where ")
    const setStr = whereIdx >= 0 ? norm.slice(setIdx + 5, whereIdx) : norm.slice(setIdx + 5)
    const whereStr = whereIdx >= 0 ? norm.slice(whereIdx + 7) : ""

    let ph = 0
    const stripQuotes = (s: string): string => s.replace(/^'(.*)'$/, "$1")

    const setClause: Record<string, unknown> = {}
    for (const part of setStr.split(",")) {
      const m = part.trim().match(/^(\w+)\s*=\s*(.+)$/)
      if (!m) continue
      const rhs = m[2].trim()
      setClause[m[1]] = rhs === "?" ? this.values[ph++] : stripQuotes(rhs)
    }

    const conditions: Array<{ col: string; op: string; value?: unknown }> = []
    if (whereStr) {
      for (const raw of whereStr.split(/\s+and\s+/i)) {
        const part = raw.trim()
        let m: RegExpMatchArray | null
        if ((m = part.match(/^(\w+)\s+is\s+not\s+null$/i))) {
          conditions.push({ col: m[1], op: "notnull" })
        } else if ((m = part.match(/^(\w+)\s+is\s+null$/i))) {
          conditions.push({ col: m[1], op: "isnull" })
        } else if ((m = part.match(/^(\w+)\s*(>=|<=|=|>|<)\s*(.+)$/))) {
          const rhs = m[3].trim()
          conditions.push({ col: m[1], op: m[2], value: rhs === "?" ? this.values[ph++] : stripQuotes(rhs) })
        }
      }
    }
    return { setClause, conditions }
  }

  private static evalCondition(row: Record<string, unknown>, c: { col: string; op: string; value?: unknown }): boolean {
    const cell = row[c.col]
    if (c.op === "isnull") return cell === null || cell === undefined
    if (c.op === "notnull") return cell !== null && cell !== undefined
    if (c.op === "=") return String(cell) === String(c.value)
    if (cell === null || cell === undefined) return false
    const a = String(cell)
    const b = String(c.value)
    if (c.op === ">") return a > b
    if (c.op === "<") return a < b
    if (c.op === ">=") return a >= b
    if (c.op === "<=") return a <= b
    return false
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
