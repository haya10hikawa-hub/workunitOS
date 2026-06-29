/**
 * Phase 5C: Explicit approval ↔ action-preview binding.
 *
 * A verification/execution-like path must bind a specific approval to a specific
 * stored ActionPreview under tenant + workUnit scope. This removes the previous
 * "latest approval by workUnitId" ambiguity: the approval is resolved by the
 * exact actionPreviewId, and the pair is then verified field-by-field.
 *
 * This module is pure (no I/O). Callers load the stored ApprovalRecord (resolved
 * by actionPreviewId, tenant-scoped) and the stored ActionPreview, then pass them
 * here. Client-provided hashes/ids are never trusted — only stored server-side
 * facts and the trusted session/route context are compared.
 */

import type { TenantId } from "../tenant/types.ts"

/** Minimal stored-approval facts needed for binding (subset of ApprovalRecordRow). */
export type BoundApprovalFacts = {
  readonly id: string
  readonly tenantId: string
  readonly workUnitId: string
  readonly actionPreviewId: string
  readonly actionType: string
  readonly targetHash: string
  readonly payloadHash: string
  readonly status: string
  readonly expiresAt: string
  readonly usedAt?: string
}

/** Minimal stored-preview facts needed for binding (subset of ActionPreviewRow). */
export type BoundPreviewFacts = {
  readonly id: string
  readonly tenantId: string
  readonly workUnitId: string
  readonly targetHash: string
  readonly payloadHash: string
  readonly status?: string
  readonly expiresAt?: string
}

/** Trusted, server-derived verification context. */
export type ApprovalPreviewBindingContext = {
  readonly tenantId: TenantId
  readonly workUnitId: string
  readonly actionPreviewId: string
  readonly requestedActionType: string | null
  readonly now: string
}

/**
 * Verification outcome.
 *
 * - `verified`        → the exact approval/preview pair is valid.
 * - `not_ready`       → readiness failure (status/expiry/hash/action/missing); safe to surface
 *                        with a non-sensitive reason. Callers map this to a 200 not_ready body.
 * - `forbidden`       → tenant boundary violation. Callers map to 403.
 * - `invalid_request` → workUnit / binding integrity violation. Callers map to 400.
 *
 * No outcome ever carries hashes, tenantId, userId, role, payloads, or secrets.
 */
export type ApprovalPreviewBindingOutcome =
  | { readonly ok: true; readonly status: "verified"; readonly approvalId: string }
  | { readonly ok: false; readonly disposition: "not_ready"; readonly reason: string }
  | { readonly ok: false; readonly disposition: "forbidden" }
  | { readonly ok: false; readonly disposition: "invalid_request" }

function notReady(reason: string): ApprovalPreviewBindingOutcome {
  return { ok: false, disposition: "not_ready", reason }
}

/**
 * Verify that a stored approval is explicitly bound to a stored action preview,
 * under the trusted tenant + workUnit context.
 *
 * The approval is expected to have been resolved by `ctx.actionPreviewId`
 * (e.g. `approvalRepo.findByPreviewId(tenantCtx, actionPreviewId)`) — never by a
 * latest/workUnit-only lookup. The checks below re-assert that binding so the
 * pairing is explicit and independently testable.
 */
export function verifyApprovalPreviewBinding(
  ctx: ApprovalPreviewBindingContext,
  approval: BoundApprovalFacts | null,
  preview: BoundPreviewFacts | null,
): ApprovalPreviewBindingOutcome {
  // ── Approval existence + binding ───────────────────────────────
  if (!approval) return notReady("No approval found for this preview.")
  if (approval.tenantId !== ctx.tenantId) return { ok: false, disposition: "forbidden" }
  if (approval.workUnitId !== ctx.workUnitId) return { ok: false, disposition: "invalid_request" }
  // Explicit approval → preview binding (no preview-independent validation).
  if (approval.actionPreviewId !== ctx.actionPreviewId) return { ok: false, disposition: "invalid_request" }

  // ── Status / one-time-use / expiry ─────────────────────────────
  if (approval.status === "rejected") return notReady("Approval was rejected.")
  if (approval.status === "pending") return notReady("Approval is pending.")
  if (approval.status === "used" || approval.usedAt) return notReady("Approval has already been consumed.")
  if (approval.status !== "approved") return notReady("Approval is not in a valid state.")
  if (approval.expiresAt && new Date(approval.expiresAt) < new Date(ctx.now)) {
    return notReady("Approval has expired.")
  }

  // ── Preview existence + binding ────────────────────────────────
  if (!preview) return notReady("No stored preview found for the requested action.")
  if (preview.tenantId !== ctx.tenantId) return { ok: false, disposition: "forbidden" }
  if (preview.workUnitId !== ctx.workUnitId) return { ok: false, disposition: "invalid_request" }
  // The approval must reference exactly this preview.
  if (preview.id !== approval.actionPreviewId) return { ok: false, disposition: "invalid_request" }
  if (preview.status && preview.status !== "preview") return notReady("Action preview is not active.")
  if (!preview.expiresAt || !isValidFutureTimestamp(preview.expiresAt, ctx.now)) {
    return notReady("Action preview has expired.")
  }

  // ── Server-side hash binding (against stored preview) ──────────
  if (approval.targetHash !== preview.targetHash || approval.payloadHash !== preview.payloadHash) {
    return notReady("Preview hashes do not match approval hashes. The preview may have been modified after approval.")
  }

  // ── Action-type binding (when the caller asserts a type) ───────
  if (ctx.requestedActionType && approval.actionType && ctx.requestedActionType !== approval.actionType) {
    return notReady(`Action type mismatch: requested "${ctx.requestedActionType}" does not match approved "${approval.actionType}".`)
  }

  return { ok: true, status: "verified", approvalId: approval.id }
}

function isValidFutureTimestamp(value: string, now: string): boolean {
  const expiresAt = Date.parse(value)
  const current = Date.parse(now)
  return Number.isFinite(expiresAt) && Number.isFinite(current) && expiresAt > current
}
