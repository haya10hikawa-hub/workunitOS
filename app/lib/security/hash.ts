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
 * TODO: once tenant secrets exist, consider HMAC-SHA256 with tenant-scoped
 *       keys to prevent cross-tenant hash collision attacks.
 */

import { createHash } from "crypto"

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
