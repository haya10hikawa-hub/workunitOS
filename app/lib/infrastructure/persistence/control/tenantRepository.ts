import type { ControlDbContext } from "../../../persistence/types.ts"
import type { D1DatabaseLike } from "../../../persistence/d1/types.ts"
import type { TenantId } from "../../../tenant/types.ts"
import type { ControlTenantRow } from "./types.ts"

const INSERT_SQL = `INSERT INTO tenants (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
const FIND_BY_ID_SQL = `SELECT * FROM tenants WHERE id = ?`
const FIND_BY_SLUG_SQL = `SELECT * FROM tenants WHERE slug = ?`

export class ControlTenantRepository {
  private readonly db: D1DatabaseLike

  constructor(db: D1DatabaseLike) {
    this.db = db
  }

  async create(_ctx: ControlDbContext, row: ControlTenantRow): Promise<ControlTenantRow> {
    await this.db.prepare(INSERT_SQL).bind(row.id, row.name, row.slug, row.createdAt, row.updatedAt).run()
    return row
  }

  async findById(_ctx: ControlDbContext, id: TenantId): Promise<ControlTenantRow | null> {
    const row = await this.db.prepare(FIND_BY_ID_SQL).bind(id).first<Record<string, unknown>>()
    return row ? mapTenant(row) : null
  }

  async findBySlug(_ctx: ControlDbContext, slug: string): Promise<ControlTenantRow | null> {
    const row = await this.db.prepare(FIND_BY_SLUG_SQL).bind(slug).first<Record<string, unknown>>()
    return row ? mapTenant(row) : null
  }
}

function mapTenant(row: Record<string, unknown>): ControlTenantRow {
  return {
    id: String(row.id) as TenantId,
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  }
}
