/**
 * Security P1 — persistent audit logging.
 *
 * Bridges the in-process `writeAuditLog` event vocabulary to the durable,
 * tenant-scoped D1AuditLogRepository. Wiring rules:
 *   - FAIL-OPEN: a logging failure must never break the primary request path
 *     (the append is wrapped in try/catch and errors are swallowed).
 *   - TENANT-SCOPED: the append always binds ctx.tenantId.
 *   - actorUserId is stored in the dedicated actor column, never duplicated into
 *     metadata.
 *   - requestId is sanitized (control chars stripped, length-capped) before
 *     persistence.
 *   - metadata is REDACTED: allowlisted keys only, primitive values only, each
 *     capped in length; tokens/secrets/raw payloads/hashes are dropped.
 */

import type { AuditEvent } from "./auditLog.ts"
import type { AuditLogRepository } from "../persistence/repositories.ts"
import type { TenantDbContext, AuditLogRow } from "../persistence/types.ts"

// Only these metadata keys (lowercased) may be persisted. Everything else is
// dropped. Deliberately excludes targetHash/payloadHash, actor ids, and any
// payload/secret material.
const ALLOWED_AUDIT_METADATA_KEYS: ReadonlySet<string> = new Set([
  "workunitid",
  "actionpreviewid",
  "approvalid",
  "actiontype",
  "decision",
  "operation",
  "source",
  "reason",
])

// Substrings that mark a key as never-persistable, even if it somehow appears.
const FORBIDDEN_KEY_SUBSTRINGS = [
  "token", "secret", "authorization", "cookie", "password", "apikey",
  "accesstoken", "refreshtoken", "rawpayload", "rawbody", "providerpayload",
  "sendablebody", "payload", "body", "hash",
]

const MAX_METADATA_VALUE_LENGTH = 256
const MAX_REQUEST_ID_LENGTH = 200
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g")

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Redact audit metadata for persistence: allowlist keys, drop forbidden keys,
 * keep primitives only, and cap string length. Never logs nested objects/arrays
 * or raw payloads. Returns a JSON string or undefined when empty.
 */
export function toSafeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  if (!metadata) return undefined
  const safe: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(metadata)) {
    const norm = normalizeKey(key)
    if (!ALLOWED_AUDIT_METADATA_KEYS.has(norm)) continue
    if (FORBIDDEN_KEY_SUBSTRINGS.some((bad) => norm.includes(bad))) continue
    if (typeof value === "string") {
      safe[key] = value.replace(CONTROL_CHARS, "").slice(0, MAX_METADATA_VALUE_LENGTH)
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value
    }
    // Objects / arrays / functions are intentionally dropped (no nested payloads).
  }
  const keys = Object.keys(safe)
  return keys.length > 0 ? JSON.stringify(safe) : undefined
}

function sanitizeRequestId(requestId: string | undefined): string | undefined {
  if (!requestId) return undefined
  const cleaned = requestId.replace(CONTROL_CHARS, "").trim().slice(0, MAX_REQUEST_ID_LENGTH)
  return cleaned.length > 0 ? cleaned : undefined
}

function toAuditLogRow(ctx: TenantDbContext, event: AuditEvent): AuditLogRow {
  return {
    id: `audit:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
    tenantId: ctx.tenantId,
    eventKind: event.kind,
    actorId: event.actorId as AuditLogRow["actorId"],
    requestId: sanitizeRequestId(event.requestId),
    workUnitId: event.workUnitId,
    reason: event.reason,
    metadata: toSafeAuditMetadata(event.metadata),
    occurredAt: event.timestamp ?? new Date().toISOString(),
  }
}

/**
 * Persist a security-relevant audit event, tenant-scoped and fail-open.
 *
 * A failure to write the audit row is swallowed so the primary request path is
 * never blocked by audit logging.
 */
export async function recordAuditEvent(
  auditLogs: AuditLogRepository,
  ctx: TenantDbContext,
  event: AuditEvent,
): Promise<void> {
  try {
    await auditLogs.append(ctx, toAuditLogRow(ctx, event))
  } catch {
    // Fail-open: never let audit persistence break the request.
  }
}
