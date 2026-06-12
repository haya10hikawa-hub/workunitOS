import type { TenantMembershipStatus, TenantRole } from "../../../domain/auth/types.ts"
import type { ControlDbContext } from "../../../persistence/types.ts"
import type { D1DatabaseLike } from "../../../persistence/d1/types.ts"
import type { TenantId, UserId } from "../../../tenant/types.ts"
import type { ControlTenantMembershipRow } from "./types.ts"

const INSERT_SQL = `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
const FIND_BY_USER_AND_TENANT_SQL = `SELECT * FROM tenant_memberships WHERE user_id = ? AND tenant_id = ?`
const LIST_BY_USER_SQL = `SELECT * FROM tenant_memberships WHERE user_id = ?`
const LIST_BY_TENANT_SQL = `SELECT * FROM tenant_memberships WHERE tenant_id = ?`
const UPDATE_STATUS_SQL = `UPDATE tenant_memberships SET status = ?, updated_at = ? WHERE id = ?`

export class ControlMembershipRepository {
  private readonly db: D1DatabaseLike

  constructor(db: D1DatabaseLike) {
    this.db = db
  }

  async create(_ctx: ControlDbContext, row: ControlTenantMembershipRow): Promise<ControlTenantMembershipRow> {
    await this.db.prepare(INSERT_SQL).bind(row.id, row.tenantId, row.userId, row.role, row.status, row.createdAt, row.updatedAt).run()
    return row
  }

  async findByUserAndTenant(_ctx: ControlDbContext, userId: UserId, tenantId: TenantId): Promise<ControlTenantMembershipRow | null> {
    const row = await this.db.prepare(FIND_BY_USER_AND_TENANT_SQL).bind(userId, tenantId).first<Record<string, unknown>>()
    return row ? mapMembership(row) : null
  }

  async listByUser(_ctx: ControlDbContext, userId: UserId): Promise<ControlTenantMembershipRow[]> {
    const rows = await this.db.prepare(LIST_BY_USER_SQL).bind(userId).all<Record<string, unknown>>()
    return rows.results.map(mapMembership)
  }

  async listByTenant(_ctx: ControlDbContext, tenantId: TenantId): Promise<ControlTenantMembershipRow[]> {
    const rows = await this.db.prepare(LIST_BY_TENANT_SQL).bind(tenantId).all<Record<string, unknown>>()
    return rows.results.map(mapMembership)
  }

  async updateStatus(_ctx: ControlDbContext, id: string, status: TenantMembershipStatus, updatedAt: string): Promise<ControlTenantMembershipRow | null> {
    await this.db.prepare(UPDATE_STATUS_SQL).bind(status, updatedAt, id).run()
    const row = await this.db.prepare(`SELECT * FROM tenant_memberships WHERE id = ?`).bind(id).first<Record<string, unknown>>()
    return row ? mapMembership(row) : null
  }
}

function mapMembership(row: Record<string, unknown>): ControlTenantMembershipRow {
  return {
    id: String(row.id ?? ""),
    tenantId: String(row.tenant_id ?? "") as TenantId,
    userId: String(row.user_id ?? "") as UserId,
    role: String(row.role ?? "viewer") as TenantRole,
    status: String(row.status ?? "invited") as TenantMembershipStatus,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  }
}
