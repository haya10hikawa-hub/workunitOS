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

function buildKey(key: RateLimitKey): string {
  return `${key.routeFamily}:${key.tenantId}:${key.actorUserId}:${key.clientIp}`
}

export function checkRateLimit(key: RateLimitKey): RateLimitResult {
  const k = buildKey(key)
  const now = Date.now()
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

/** Returns current entry count for testing (non-production use). */
export function getRateLimitCount(key: RateLimitKey): number {
  const k = buildKey(key)
  return store.get(k)?.count ?? 0
}

/** Resets the in-memory store (for test isolation). */
export function resetRateLimitStore(): void {
  store.clear()
}
