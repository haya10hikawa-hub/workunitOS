import test from "node:test"
import assert from "node:assert/strict"
import { JwtAuthAdapter } from "../app/lib/application/auth/jwtAuthAdapter.ts"
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

test("valid JWT returns VerifiedAuthIdentity", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const token = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local", name: "JWT User" }, "test-secret")
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, true)
    if (result.ok) assert.deepEqual(result.identity, {
      provider: "jwt",
      providerSubject: "jwt-user",
      email: "jwt@example.local",
      displayName: "JWT User",
      avatarUrl: undefined,
    })
  })
})

test("missing token returns missing_credentials", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost"))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, "missing_credentials")
  })
})

test("malformed Bearer header returns invalid_credentials", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: "Token abc" } }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, "invalid_credentials")
  })
})

test("invalid signature returns invalid_credentials", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const token = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local" }, "wrong-secret")
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, "invalid_credentials")
  })
})

test("expired token returns invalid_credentials", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const token = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local", exp: Math.floor(Date.now() / 1000) - 60 }, "test-secret")
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, "invalid_credentials")
  })
})

test("token without exp returns invalid_credentials", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const token = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local" }, "test-secret", false)
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, "invalid_credentials")
  })
})

test("missing sub or email returns invalid_credentials", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const missingSub = await signHs256Jwt({ email: "jwt@example.local" }, "test-secret")
    const missingEmail = await signHs256Jwt({ sub: "jwt-user" }, "test-secret")
    const subResult = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${missingSub}` } }))
    const emailResult = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${missingEmail}` } }))
    assert.equal(subResult.ok, false)
    assert.equal(emailResult.ok, false)
    if (!subResult.ok) assert.equal(subResult.reason, "invalid_credentials")
    if (!emailResult.ok) assert.equal(emailResult.reason, "invalid_credentials")
  })
})

test("missing JWT_AUTH_SECRET returns adapter_not_configured", async () => {
  await withEnv("JWT_AUTH_SECRET", undefined, async () => {
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: "Bearer abc.def.ghi" } }))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, "adapter_not_configured")
  })
})

test("tenantId and role claims are ignored", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const token = await signHs256Jwt({ sub: "jwt-user", email: "jwt@example.local", tenantId: "evil-tenant", role: "owner" }, "test-secret")
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, true)
    assert.equal(JSON.stringify(result).includes("evil-tenant"), false)
    assert.equal(JSON.stringify(result).includes("\"role\""), false)
  })
})

test("token is not included in error output", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    const token = "not-a-real-token"
    const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
    assert.equal(result.ok, false)
    assert.equal(JSON.stringify(result).includes(token), false)
  })
})

test("invalid base64 and oversized bearer tokens fail closed without throwing", async () => {
  await withEnv("JWT_AUTH_SECRET", "test-secret", async () => {
    for (const token of ["abc.%.sig", "eyJhbGciOiJIUzI1NiJ9.!!!!.x", `${"a".repeat(20_000)}.e30.x`]) {
      const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: `Bearer ${token}` } }))
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.reason, "invalid_credentials")
    }
  })
})

test("production JWT adapter requires strong secret, issuer, and audience", async () => {
  await withEnv("NODE_ENV", "production", async () => {
    await withEnv("JWT_AUTH_SECRET", "short-secret", async () => {
      await withEnv("JWT_AUTH_ISSUER", undefined, async () => {
        await withEnv("JWT_AUTH_AUDIENCE", undefined, async () => {
          const result = await new JwtAuthAdapter().verify(new Request("http://localhost", { headers: { Authorization: "Bearer abc.def.ghi" } }))
          assert.equal(result.ok, false)
          if (!result.ok) assert.equal(result.reason, "adapter_not_configured")
        })
      })
    })
  })
})
