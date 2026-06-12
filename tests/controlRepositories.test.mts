import test from "node:test"
import assert from "node:assert/strict"
import { resolveControlRepositories } from "../app/lib/infrastructure/persistence/control/controlRepositoryResolver.ts"
import type { TenantId, UserId } from "../app/lib/tenant/types.ts"
import { FakeD1Database } from "./helpers/fakeD1.ts"

test("control repository resolver fails safely when control db is unavailable", () => {
  const result = resolveControlRepositories()
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error, "control_db_not_configured")
    assert.equal(result.status, 503)
  }
})

test("control repositories create and find users, tenants, memberships, and auth identities", async () => {
  const db = new FakeD1Database()
  const result = resolveControlRepositories({ d1Binding: db })
  assert.equal(result.ok, true)
  if (!result.ok) return

  const { users, tenants, memberships, authIdentities, ctx } = result.bundle
  const now = new Date().toISOString()

  await users.create(ctx, {
    id: "user-1" as UserId,
    email: "user@example.local",
    displayName: "User One",
    avatarUrl: "https://example.local/avatar.png",
    createdAt: now,
    updatedAt: now,
  })
  await tenants.create(ctx, {
    id: "tenant-1" as TenantId,
    name: "Tenant One",
    slug: "tenant-one",
    createdAt: now,
    updatedAt: now,
  })
  await memberships.create(ctx, {
    id: "membership-1",
    tenantId: "tenant-1" as TenantId,
    userId: "user-1" as UserId,
    role: "manager",
    status: "active",
    createdAt: now,
    updatedAt: now,
  })
  await authIdentities.create(ctx, {
    id: "identity-1",
    userId: "user-1" as UserId,
    provider: "oidc",
    providerSubject: "subject-1",
    email: "user@example.local",
    createdAt: now,
    updatedAt: now,
  })

  const userById = await users.findById(ctx, "user-1" as UserId)
  const userByEmail = await users.findByEmail(ctx, "user@example.local")
  const tenantById = await tenants.findById(ctx, "tenant-1" as TenantId)
  const tenantBySlug = await tenants.findBySlug(ctx, "tenant-one")
  const membership = await memberships.findByUserAndTenant(ctx, "user-1" as UserId, "tenant-1" as TenantId)
  const membershipsByUser = await memberships.listByUser(ctx, "user-1" as UserId)
  const membershipsByTenant = await memberships.listByTenant(ctx, "tenant-1" as TenantId)
  const identityBySubject = await authIdentities.findByProviderSubject(ctx, "oidc", "subject-1")
  const identitiesByUser = await authIdentities.findByUserId(ctx, "user-1" as UserId)

  assert.equal(userById?.email, "user@example.local")
  assert.equal(userByEmail?.displayName, "User One")
  assert.equal(tenantById?.slug, "tenant-one")
  assert.equal(tenantBySlug?.name, "Tenant One")
  assert.equal(membership?.role, "manager")
  assert.equal(membershipsByUser.length, 1)
  assert.equal(membershipsByTenant.length, 1)
  assert.equal(identityBySubject?.provider, "oidc")
  assert.equal(identitiesByUser.length, 1)
  assert.equal("token" in (identityBySubject ?? {}), false)
})

test("control membership repository updates membership status", async () => {
  const db = new FakeD1Database()
  const result = resolveControlRepositories({ d1Binding: db })
  assert.equal(result.ok, true)
  if (!result.ok) return

  const { memberships, ctx } = result.bundle
  const now = new Date().toISOString()
  await memberships.create(ctx, {
    id: "membership-2",
    tenantId: "tenant-2" as TenantId,
    userId: "user-2" as UserId,
    role: "viewer",
    status: "invited",
    createdAt: now,
    updatedAt: now,
  })

  const updated = await memberships.updateStatus(ctx, "membership-2", "active", now)
  assert.equal(updated?.status, "active")
})
