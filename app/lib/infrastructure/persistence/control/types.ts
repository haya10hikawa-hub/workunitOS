import type { TenantMembershipStatus, TenantRole } from "../../../domain/auth/types.ts"
import type { TenantId, UserId } from "../../../tenant/types.ts"

export type ControlUserRow = {
  id: UserId
  email: string
  displayName?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export type ControlTenantRow = {
  id: TenantId
  name: string
  slug: string
  status?: "active" | "suspended" | "deleted"
  createdAt: string
  updatedAt: string
}

export type ControlTenantMembershipRow = {
  id: string
  tenantId: TenantId
  userId: UserId
  role: TenantRole
  status: TenantMembershipStatus
  createdAt: string
  updatedAt: string
}

export type ControlAuthIdentityRow = {
  id: string
  userId: UserId
  provider: string
  providerSubject: string
  email?: string
  createdAt: string
  updatedAt: string
}
