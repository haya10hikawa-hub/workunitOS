import type { ControlDbContext } from "../../../persistence/types.ts"
import type { D1DatabaseLike } from "../../../persistence/d1/types.ts"
import type { UserId } from "../../../tenant/types.ts"
import type { ControlAuthIdentityRow } from "./types.ts"

const INSERT_SQL = `INSERT INTO auth_identities (id, user_id, provider, provider_subject, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
const FIND_BY_PROVIDER_SUBJECT_SQL = `SELECT * FROM auth_identities WHERE provider = ? AND provider_subject = ?`
const FIND_BY_USER_SQL = `SELECT * FROM auth_identities WHERE user_id = ?`

export class ControlAuthIdentityRepository {
  private readonly db: D1DatabaseLike

  constructor(db: D1DatabaseLike) {
    this.db = db
  }

  async create(_ctx: ControlDbContext, row: ControlAuthIdentityRow): Promise<ControlAuthIdentityRow> {
    await this.db.prepare(INSERT_SQL).bind(row.id, row.userId, row.provider, row.providerSubject, row.email, row.createdAt, row.updatedAt).run()
    return row
  }

  async findByProviderSubject(_ctx: ControlDbContext, provider: string, providerSubject: string): Promise<ControlAuthIdentityRow | null> {
    const row = await this.db.prepare(FIND_BY_PROVIDER_SUBJECT_SQL).bind(provider, providerSubject).first<Record<string, unknown>>()
    return row ? mapIdentity(row) : null
  }

  async findByUserId(_ctx: ControlDbContext, userId: UserId): Promise<ControlAuthIdentityRow[]> {
    const rows = await this.db.prepare(FIND_BY_USER_SQL).bind(userId).all<Record<string, unknown>>()
    return rows.results.map(mapIdentity)
  }
}

function mapIdentity(row: Record<string, unknown>): ControlAuthIdentityRow {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? "") as UserId,
    provider: String(row.provider ?? ""),
    providerSubject: String(row.provider_subject ?? ""),
    email: row.email ? String(row.email) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  }
}
