import test from "node:test"
import assert from "node:assert/strict"
import { DevAuthAdapter } from "../app/lib/application/auth/devAuthAdapter.ts"
import { JwtAuthAdapter } from "../app/lib/application/auth/jwtAuthAdapter.ts"
import { NoopProductionAuthAdapter } from "../app/lib/application/auth/noopProductionAuthAdapter.ts"
import { resolveAuthAdapter } from "../app/lib/application/auth/resolveAuthAdapter.ts"
import { signHs256Jwt } from "./helpers/jwt.ts"

async function withEnv(key: string, value: string | undefined, fn: () => Promise<void>) {
  const prev = process.env[key]
  try {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
    await fn()
  } finally {
    if (prev === undefined) delete process.env[key]
    else process.env[key] = prev
  }
}

test("dev adapter returns identity only when ALLOW_DEV_SESSION=true", async () => {
  await withEnv("NODE_ENV", "development", async () => {
    await withEnv("ALLOW_DEV_SESSION", "true", async () => {
      const result = await new DevAuthAdapter().verify(new Request("http://localhost"))
      assert.equal(result.ok, true)
      if (result.ok) assert.equal(result.identity.provider, "dev")
    })
  })
})

test("dev adapter rejects when flag is missing", async () => {
  await withEnv("NODE_ENV", "development", async () => {
    await withEnv("ALLOW_DEV_SESSION", undefined, async () => {
      const result = await new DevAuthAdapter().verify(new Request("http://localhost"))
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.reason, "missing_credentials")
    })
  })
})

test("noop production adapter returns adapter_not_configured", async () => {
  const result = await new NoopProductionAuthAdapter().verify(new Request("http://localhost"))
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, "adapter_not_configured")
})

test("resolver never defaults to dev in production", async () => {
  await withEnv("NODE_ENV", "production", async () => {
    await withEnv("AUTH_ADAPTER", undefined, async () => {
      const result = await resolveAuthAdapter().verify(new Request("http://localhost"))
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.reason, "adapter_not_configured")
    })
  })
})

test("AUTH_ADAPTER=dev safe-fails in production", async () => {
  await withEnv("NODE_ENV", "production", async () => {
    await withEnv("AUTH_ADAPTER", "dev", async () => {
      await withEnv("ALLOW_DEV_SESSION", "true", async () => {
        const result = await resolveAuthAdapter().verify(new Request("http://localhost"))
        assert.equal(result.ok, false)
        if (!result.ok) assert.equal(result.reason, "adapter_not_configured")
      })
    })
  })
})

test("jwt adapter returns verified identity for a valid token", async () => {
  await withEnv("JWT_AUTH_SECRET", "jwt-secret", async () => {
    const token = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local", name: "JWT User" }, "jwt-secret")
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, true)
    if (result.ok) assert.deepEqual(result.identity, { provider: "jwt", providerSubject: "jwt-user", email: "jwt@example.local", displayName: "JWT User", avatarUrl: undefined })
  })
})

test("jwt adapter handles missing, malformed, invalid, and expired tokens safely", async () => {
  await withEnv("JWT_AUTH_SECRET", "jwt-secret", async () => {
    const expired = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local", exp: Math.floor(Date.now() / 1000) - 60 }, "jwt-secret")
    const invalidSig = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local" }, "wrong-secret")
    const requests = [
      new Request("http://localhost"),
      new Request("http://localhost", { headers: { Authorization: "Bearer" } }),
      new Request("http://localhost", { headers: { Authorization: `Bearer ${invalidSig}` } }),
      new Request("http://localhost", { headers: { Authorization: `Bearer ${expired}` } }),
    ]
    for (const request of requests) {
      const result = await new JwtAuthAdapter().verify(request)
      assert.equal(result.ok, false)
      if (!result.ok) assert.match(result.reason, /missing_credentials|invalid_credentials/)
      assert.equal(JSON.stringify(result).includes("Bearer"), false)
    }
  })
})

test("jwt adapter rejects missing claims and missing config, and ignores tenant or role claims", async () => {
  await withEnv("JWT_AUTH_SECRET", undefined, async () => {
    const missingConfig = await new JwtAuthAdapter().verify(new Request("http://localhost"))
    assert.equal(missingConfig.ok, false)
    if (!missingConfig.ok) assert.equal(missingConfig.reason, "adapter_not_configured")
  })
  await withEnv("JWT_AUTH_SECRET", "jwt-secret", async () => {
    const noSub = await signHs256Jwt({ email: "jwt@example.local" }, "jwt-secret")
    const noEmail = await signHs256Jwt({ sub: "jwt-user" }, "jwt-secret")
    const claimsToken = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local", tenantId: "evil-tenant", role: "owner" }, "jwt-secret")
    const noSubResult = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${noSub}` } }))
    const noEmailResult = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${noEmail}` } }))
    const claimsResult = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${claimsToken}` } }))
    assert.equal(noSubResult.ok, false)
    assert.equal(noEmailResult.ok, false)
    assert.equal(claimsResult.ok, true)
    if (claimsResult.ok) {
      assert.equal(claimsResult.identity.provider, "jwt")
      assert.equal(claimsResult.identity.providerSubject, "jwt-user")
      assert.equal(claimsResult.identity.email, "jwt@example.local")
      assert.equal("tenantId" in claimsResult.identity, false)
      assert.equal("role" in claimsResult.identity, false)
    }
  })
})

test("resolver supports AUTH_ADAPTER=jwt only when jwt config is present", async () => {
  await withEnv("NODE_ENV", "production", async () => {
    await withEnv("AUTH_ADAPTER", "jwt", async () => {
      await withEnv("JWT_AUTH_SECRET", undefined, async () => {
        const result = await resolveAuthAdapter().verify(new Request("http://localhost"))
        assert.equal(result.ok, false)
        if (!result.ok) assert.equal(result.reason, "adapter_not_configured")
      })
    })
  })
})
