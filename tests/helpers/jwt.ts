type JwtPayload = Record<string, unknown>

export async function signHs256Jwt(payload: JwtPayload, secret: string, includeDefaultExpiry = true): Promise<string> {
  const claims = includeDefaultExpiry && payload.exp === undefined
    ? { ...payload, exp: Math.floor(Date.now() / 1000) + 300 }
    : payload
  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const encodedPayload = encodeBase64Url(JSON.stringify(claims))
  const signature = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  )
  return `${encodedHeader}.${encodedPayload}.${encodeBytesBase64Url(new Uint8Array(signature))}`
}

function encodeBase64Url(value: string): string {
  return encodeBytesBase64Url(new TextEncoder().encode(value))
}

function encodeBytesBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}
