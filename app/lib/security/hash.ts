/**
 * Canonical hash utilities for WorkUnit OS.
 *
 * All hashes used for approval binding must be deterministic, order-stable,
 * and free of volatile fields. This module provides the canonical
 * implementation used by ActionPreview, ActionApprovalRecord, and
 * verifyApproval.
 *
 * PRINCIPLES:
 *   - Object keys are sorted alphabetically before serialization.
 *   - undefined values are omitted (not serialized as null).
 *   - Volatile fields (timestamps, IDs) are excluded from payload hashing
 *     unless explicitly included via the target specification.
 *   - Hashes use SHA-256 for collision resistance.
 *   - All hashes go through canonical JSON serialization first.
 *
 * Phase 5E adds tenant-secret HMAC-SHA256 binding as an explicit, opt-in mode
 * (computeTenantHmacSha256Hash / verifyHashBinding). The plain SHA-256 path is
 * retained as the explicit legacy algorithm for existing records. These helpers
 * are low-level: tenantSecret is always an injected argument and is never read
 * from the runtime environment, logged, returned, or included in errors.
 */

import { createHash, createHmac, timingSafeEqual } from "crypto"

// ─── Target / Payload Canonicalization ──────────────────────────

export type CanonicalTarget = {
  provider: string
  destination: string
  label?: string
  channel?: string
  recipient?: string
  owner?: string
  repo?: string
  calendarId?: string
}

export type CanonicalPayload = {
  title?: string
  bodySnippet?: string
  body?: string
  labels?: string[]
  attendees?: string[]
  timeHint?: string
  detailFields?: Record<string, string>
}

/**
 * Canonicalize an action target for hashing.
 * Sorts keys and strips undefined fields.
 */
export function canonicalizeActionTarget(target: Record<string, unknown>): CanonicalTarget {
  return canonicalize(target) as CanonicalTarget
}

/**
 * Canonicalize an action payload for hashing.
 * Sorts keys and strips undefined fields.
 */
export function canonicalizeActionPayload(payload: Record<string, unknown>): CanonicalPayload {
  return canonicalize(payload) as CanonicalPayload
}

/**
 * Hash a canonical action target.
 */
export function hashActionTarget(target: CanonicalTarget | Record<string, unknown>): string {
  return hashField(canonicalize(target))
}

/**
 * Hash a canonical action payload.
 */
export function hashActionPayload(payload: CanonicalPayload | Record<string, unknown>): string {
  return hashField(canonicalize(payload))
}

// ─── Core Hashing ───────────────────────────────────────────────

/**
 * Hash any value using SHA-256 after canonical JSON serialization.
 * The input is canonicalized (keys sorted, undefined stripped) before hashing.
 * Returns a 64-character lowercase hex string.
 */
export function hashField(value: unknown): string {
  const canonical = JSON.stringify(canonicalize(value))
  return createHash("sha256").update(canonical, "utf8").digest("hex")
}

// ─── Phase 5E: Tenant-secret HMAC-SHA256 binding ────────────────

export type HashAlgorithm = "sha256" | "hmac-sha256"

/**
 * Error raised by tenant-secret hash binding. Its message is a stable code only —
 * it never includes the tenant secret or the hashed value.
 */
export class HashBindingError extends Error {
  public readonly code: "missing_tenant_secret"
  constructor(code: "missing_tenant_secret") {
    super(code)
    this.name = "HashBindingError"
    this.code = code
  }
}

/**
 * Explicit legacy SHA-256 digest over canonical JSON (64 lowercase hex).
 * Behaviourally identical to hashField — an explicit name for opt-in legacy use.
 */
export function computeLegacySha256Hash(value: unknown): string {
  return hashField(value)
}

/**
 * Tenant-secret HMAC-SHA256 digest over canonical JSON (64 lowercase hex).
 *
 * The tenantSecret is injected by the caller; this helper never reads the runtime environment.
 * Throws HashBindingError("missing_tenant_secret") when the secret is empty —
 * production must never silently fall back to a default/unkeyed digest. The raw
 * secret and the value are never included in the error or the result.
 */
export function computeTenantHmacSha256Hash(value: unknown, tenantSecret: string): string {
  if (typeof tenantSecret !== "string" || tenantSecret.length === 0) {
    throw new HashBindingError("missing_tenant_secret")
  }
  const canonical = JSON.stringify(canonicalize(value))
  return createHmac("sha256", tenantSecret).update(canonical, "utf8").digest("hex")
}

/** Constant-time comparison of two equal-length lowercase hex digests. */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}

export type VerifyHashBindingInput = {
  /** The (uncanonicalized) value to hash and compare. */
  value: unknown
  /** The stored digest to verify against. */
  storedDigest: string
  /** Injected tenant secret. When present, HMAC-SHA256 is attempted first. */
  tenantSecret?: string
  /** Allow an explicit legacy SHA-256 comparison for pre-HMAC records. */
  allowLegacySha256: boolean
}

export type VerifyHashBindingResult = {
  ok: boolean
  /** Which algorithm matched, or "none" when nothing matched. */
  matched: HashAlgorithm | "none"
}

/**
 * Verify a stored digest against a value.
 *
 * - When a non-empty tenantSecret is provided, HMAC-SHA256 is attempted first and,
 *   on match, reported as "hmac-sha256".
 * - A legacy SHA-256 digest is accepted ONLY when allowLegacySha256 is true, and is
 *   reported explicitly as "sha256" — it never silently passes as HMAC.
 * - No raw value or tenantSecret is ever returned or thrown.
 */
export function verifyHashBinding(input: VerifyHashBindingInput): VerifyHashBindingResult {
  if (typeof input.tenantSecret === "string" && input.tenantSecret.length > 0) {
    const hmac = computeTenantHmacSha256Hash(input.value, input.tenantSecret)
    if (constantTimeEqualHex(hmac, input.storedDigest)) return { ok: true, matched: "hmac-sha256" }
  }
  if (input.allowLegacySha256) {
    const legacy = computeLegacySha256Hash(input.value)
    if (constantTimeEqualHex(legacy, input.storedDigest)) return { ok: true, matched: "sha256" }
  }
  return { ok: false, matched: "none" }
}

// ─── Canonicalization ───────────────────────────────────────────

/**
 * Recursively sort object keys alphabetically and strip undefined values.
 * Arrays are left as-is. Primitives pass through.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(canonicalize)

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(value as Record<string, unknown>).sort()
  for (const key of keys) {
    const val = (value as Record<string, unknown>)[key]
    if (val === undefined) continue
    sorted[key] = canonicalize(val)
  }
  return sorted
}

// ─── Approval / Preview Match ───────────────────────────────────

import type { ActionPreview, ActionApprovalRecord } from "../domain/types.ts"

/**
 * Check whether an ActionPreview still matches its stored ApprovalRecord.
 * Returns false if:
 *   - targetHash differs (target was edited after approval)
 *   - payloadHash differs (payload was edited after approval)
 *   - approval is expired
 *   - approval is already used
 *   - approval status is not "approved"
 */
export function isApprovalStillValidForPreview(
  preview: ActionPreview,
  approval: ActionApprovalRecord,
  now = new Date().toISOString(),
): boolean {
  if (approval.status !== "approved") return false
  if (approval.usedAt) return false
  if (new Date(now) > new Date(approval.expiresAt)) return false
  if (approval.targetHash !== preview.targetHash) return false
  if (approval.payloadHash !== preview.payloadHash) return false
  return true
}
