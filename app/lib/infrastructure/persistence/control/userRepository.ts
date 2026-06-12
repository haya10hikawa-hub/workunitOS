import type { ControlDbContext } from "../../../persistence/types.ts"
import type { D1DatabaseLike } from "../../../persistence/d1/types.ts"
import type { UserId } from "../../../tenant/types.ts"
import type { ControlUserRow } from "./types.ts"

const INSERT_SQL = `INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
const FIND_BY_ID_SQL = `SELECT * FROM users WHERE id = ?`
const FIND_BY_EMAIL_SQL = `SELECT * FROM users WHERE email = ?`

export class ControlUserRepository {
  private readonly db: D1DatabaseLike

  constructor(db: D1DatabaseLike) {
    this.db = db
  }

  async create(_ctx: ControlDbContext, row: ControlUserRow): Promise<ControlUserRow> {
    await this.db.prepare(INSERT_SQL).bind(row.id, row.email, row.displayName, row.avatarUrl, row.createdAt, row.updatedAt).run()
    return row
  }

  async findById(_ctx: ControlDbContext, id: UserId): Promise<ControlUserRow | null> {
    const row = await this.db.prepare(FIND_BY_ID_SQL).bind(id).first<Record<string, unknown>>()
    return row ? mapUser(row) : null
  }

  async findByEmail(_ctx: ControlDbContext, email: string): Promise<ControlUserRow | null> {
    const row = await this.db.prepare(FIND_BY_EMAIL_SQL).bind(email).first<Record<string, unknown>>()
    return row ? mapUser(row) : null
  }
}

function mapUser(row: Record<string, unknown>): ControlUserRow {
  return {
    id: String(row.id) as UserId,
    email: String(row.email ?? ""),
    displayName: row.display_name ? String(row.display_name) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  }
}
