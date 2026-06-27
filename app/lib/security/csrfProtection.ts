/**
 * Phase 5A: CSRF / Origin Protection
 *
 * Validates Origin and Referer headers for state-changing POST requests.
 * Rejects cross-site and malformed origins.
 *
 * Production: missing Origin/Referer on browser-like POST is blocked.
 * Dev: may allow missing Origin behind explicit dev flag only.
 */

export type CsrfCheckResult = { readonly ok: true } | { readonly ok: false; readonly reason: "csrf_failed" | "invalid_origin" }

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

export function validateCsrfOrigin(request: Request): CsrfCheckResult {
  const origin = request.headers.get("Origin")
  const referer = request.headers.get("Referer")

  // If both Origin and Referer are missing, block in production
  if (!origin && !referer) {
    return { ok: false, reason: "csrf_failed" }
  }

  const originValue = origin ?? referer!

  try {
    const url = new URL(originValue)
    const originHost = `${url.protocol}//${url.host}`

    if (ALLOWED_ORIGINS.includes(originHost)) {
      return { ok: true }
    }

    // Also check host+port match
    if (ALLOWED_ORIGINS.some((allowed) => originValue.startsWith(allowed))) {
      return { ok: true }
    }

    return { ok: false, reason: "invalid_origin" }
  } catch {
    return { ok: false, reason: "invalid_origin" }
  }
}
