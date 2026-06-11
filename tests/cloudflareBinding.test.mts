import test from "node:test"
import assert from "node:assert/strict"
import {
  getControlDbBinding,
  getDefaultTenantDbBinding,
  getCloudflareD1Bindings,
} from "../app/lib/persistence/cloudflareBindings.ts"
import { FakeD1Database } from "./helpers/fakeD1.ts"
import type { AppEnv } from "../app/types/cloudflare-env"

// ─── Binding Extraction ────────────────────────────────────────

test("getControlDbBinding returns null when env is empty", () => {
  const result = getControlDbBinding({} as unknown as AppEnv)
  assert.equal(result, null)
})

test("getControlDbBinding returns null when binding is placeholder string", () => {
  const result = getControlDbBinding({ CONTROL_DB: "REPLACE_test" } as unknown as AppEnv)
  assert.equal(result, null)
})

test("getControlDbBinding returns null for non-D1 object", () => {
  const result = getControlDbBinding({ CONTROL_DB: { notPrepare: true } } as unknown as AppEnv)
  assert.equal(result, null)
})

test("getControlDbBinding returns FakeD1 when provided", () => {
  const fakeDb = new FakeD1Database()
  const result = getControlDbBinding({ CONTROL_DB: fakeDb } as unknown as AppEnv)
  assert.ok(result)
  assert.ok(typeof (result as unknown as Record<string, unknown>).prepare === "function")
})

test("getDefaultTenantDbBinding returns null when binding is missing", () => {
  const fakeDb = new FakeD1Database()
  const result = getDefaultTenantDbBinding({ CONTROL_DB: fakeDb } as unknown as AppEnv)
  assert.equal(result, null)
})

test("getDefaultTenantDbBinding returns FakeD1 with correct binding", () => {
  const fakeDb = new FakeD1Database()
  const result = getDefaultTenantDbBinding({ TENANT_DB_DEFAULT: fakeDb } as unknown as AppEnv)
  assert.ok(result)
})

test("getCloudflareD1Bindings returns both bindings", () => {
  const control = new FakeD1Database()
  const tenant = new FakeD1Database()
  const result = getCloudflareD1Bindings({
    CONTROL_DB: control,
    TENANT_DB_DEFAULT: tenant,
  } as unknown as AppEnv)
  assert.ok(result.controlDb)
  assert.ok(result.tenantDefaultDb)
})

test("getCloudflareD1Bindings returns nulls when missing", () => {
  const result = getCloudflareD1Bindings({} as unknown as AppEnv)
  assert.equal(result.controlDb, null)
  assert.equal(result.tenantDefaultDb, null)
})
