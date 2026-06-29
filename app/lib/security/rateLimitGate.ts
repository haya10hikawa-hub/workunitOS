/**
 * Phase 5A: Rate Limit Gate
 *
 * Minimal in-memory rate limiter for /api/workunit/tools.
 * Checks before expensive LLM/tool work.
 *
 * Key includes: tenantId + actorUserId + IP + route family.
 *
 * ⚠️ Alpha/dev-safe only (in-memory).
 * Production durable limiter required before commercial SaaS.
 */

export type RateLimitResult = { readonly ok: true } | { readonly ok: false; readonly reason: "rate_limited" }

export type RateLimitKey = {
  readonly tenantId: string
  readonly actorUserId: string
  readonly clientIp: string
  readonly routeFamily: string
}

type RateLimitEntry = { count: number; readonly windowStart: number }

const store = new Map<string, RateLimitEntry>()

const MAX_REQUESTS = 60 // per window
const WINDOW_MS = 60_000 // 1 minute
const MAX_STORE_ENTRIES = 10_000

function buildKey(key: RateLimitKey): string {
  return `${key.routeFamily}:${key.tenantId}:${key.actorUserId}:${key.clientIp}`
}

export function checkRateLimit(key: RateLimitKey): RateLimitResult {
  const k = buildKey(key)
  const now = Date.now()
  pruneExpiredEntries(now)
  const entry = store.get(k)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(k, { count: 1, windowStart: now })
    return { ok: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { ok: false, reason: "rate_limited" }
  }

  entry.count++
  return { ok: true }
}

export function getTrustedClientIp(request: Request): string {
  const cloudflareIp = request.headers.get("CF-Connecting-IP")?.trim()
  if (cloudflareIp && cloudflareIp.length <= 64 && /^[0-9a-f:.]+$/i.test(cloudflareIp)) return cloudflareIp
  return "unknown"
}

function pruneExpiredEntries(now: number): void {
  if (store.size < MAX_STORE_ENTRIES) return
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key)
  }
  if (store.size >= MAX_STORE_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart)
    for (let index = 0; index < Math.ceil(oldest.length / 10); index += 1) store.delete(oldest[index][0])
  }
}

/** Returns current entry count for testing (non-production use). */
export function getRateLimitCount(key: RateLimitKey): number {
  const k = buildKey(key)
  return store.get(k)?.count ?? 0
}

/** Resets the in-memory store (for test isolation). */
export function resetRateLimitStore(): void {
  store.clear()
}
