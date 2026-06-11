import test from "node:test"
import assert from "node:assert/strict"
import {
  getRequestRuntimeEnv,
  setTestRuntimeEnvForRequest,
  resetTestRuntimeEnvForRequest,
} from "../app/lib/runtime/cloudflareRuntimeEnv.ts"
import { resolveRouteRepositories } from "../app/lib/persistence/routeRepositories.ts"
import { resetInMemoryReposForTests } from "../app/lib/persistence/repositoryResolver.ts"
import { FakeD1Database } from "./helpers/fakeD1.ts"
import type { TenantId } from "../app/lib/tenant/types.ts"
import type { AppEnv } from "../app/types/cloudflare-env"

const tenantId = "test-tenant" as TenantId

// ─── Runtime Env Bridge ─────────────────────────────────────────

test("getRequestRuntimeEnv returns null when no env set", () => {
  resetTestRuntimeEnvForRequest()
  assert.equal(getRequestRuntimeEnv(), null)
})

test("getRequestRuntimeEnv returns fake env when set in tests", () => {
  resetTestRuntimeEnvForRequest()
  const fakeEnv = { SOME_VAR: "value" } as AppEnv
  setTestRuntimeEnvForRequest(fakeEnv)
  assert.equal(getRequestRuntimeEnv(), fakeEnv)
})

test("resetTestRuntimeEnvForRequest clears fake env", () => {
  setTestRuntimeEnvForRequest({} as AppEnv)
  resetTestRuntimeEnvForRequest()
  assert.equal(getRequestRuntimeEnv(), null)
})

// ─── Route Repository Helper ────────────────────────────────────

test("resolveRouteRepositories returns repos with in-memory flag", async () => {
  resetInMemoryReposForTests()
  resetTestRuntimeEnvForRequest()

  const envBackup = process.env.NODE_ENV
  const persistBackup = process.env.ALLOW_IN_MEMORY_PERSISTENCE
  try {
    process.env.NODE_ENV = "development"
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = "true"

    const result = await resolveRouteRepositories(tenantId)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.ok(result.bundle.actionPreviews)
      assert.ok(result.bundle.approvalRecords)
    }
  } finally {
    process.env.NODE_ENV = envBackup
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = persistBackup
  }
})

test("resolveRouteRepositories returns integration_missing without D1 bindings", async () => {
  resetInMemoryReposForTests()
  resetTestRuntimeEnvForRequest()

  const envBackup = process.env.NODE_ENV
  const persistBackup = process.env.ALLOW_IN_MEMORY_PERSISTENCE
  const modeBackup = process.env.PERSISTENCE_MODE
  try {
    process.env.NODE_ENV = "development"
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = "false"
    process.env.PERSISTENCE_MODE = "d1"

    const result = await resolveRouteRepositories(tenantId)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error, "integration_missing")
      assert.equal(result.status, 503)
    }
  } finally {
    process.env.NODE_ENV = envBackup
    process.env.ALLOW_IN_MEMORY_PERSISTENCE = persistBackup
    process.env.PERSISTENCE_MODE = modeBackup
  }
})

test("resolveRouteRepositories returns D1 repos with fake runtime env", async () => {
  resetInMemoryReposForTests()
  resetTestRuntimeEnvForRequest()

  const fakeDb = new FakeD1Database()
  const tenants = new Map()
  tenants.set(tenantId, {
    tenant: { id: tenantId, status: "active" },
    dbRef: { tenant_id: tenantId, database_name: "test-db", status: "active" },
  })

  // Set up fake Cloudflare runtime env with D1 bindings
  setTestRuntimeEnvForRequest({
    CONTROL_DB: fakeDb,
    TENANT_DB_DEFAULT: fakeDb,
  } as unknown as AppEnv)

  const envBackup = process.env.NODE_ENV
  const modeBackup = process.env.PERSISTENCE_MODE
  try {
    process.env.NODE_ENV = "development"
    process.env.PERSISTENCE_MODE = "d1"

    const result = await resolveRouteRepositories(tenantId)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.ok(result.bundle.actionPreviews)
      assert.ok(result.bundle.approvalRecords)
    }
  } finally {
    process.env.NODE_ENV = envBackup
    process.env.PERSISTENCE_MODE = modeBackup
    resetTestRuntimeEnvForRequest()
  }
})
