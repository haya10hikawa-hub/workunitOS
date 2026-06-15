import { NextResponse } from "next/server.js"
import { getSessionErrorStatus, requireSession } from "../../../../lib/security/session.ts"
import { safeError } from "../../../../lib/security/safeErrors.ts"
import { writeAuditLog, type AuditEventKind } from "../../../../lib/security/auditLog.ts"
import { hashActionTarget, hashActionPayload } from "../../../../lib/security/hash.ts"
import { resolveRouteRepositories } from "../../../../lib/persistence/routeRepositories.ts"
import type { TenantId } from "../../../../lib/tenant/types.ts"
import type { ApprovalActionType } from "../../../../lib/domain/types.ts"
import { canCreatePreview } from "../../../../lib/security/tenantAccess.ts"

// ─── Helpers ────────────────────────────────────────────────────

const REQUEST_ID_HEADER = "x-request-id"

function resolveRequestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER) ?? `req:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
}

function audit(kind: AuditEventKind, requestId: string, extras?: Record<string, unknown>) {
  writeAuditLog({ kind, timestamp: new Date().toISOString(), requestId, ...extras })
}

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status })
}

function errorResponse(requestId: string, code: string, status: number): NextResponse {
  return json(safeError(requestId, code as Parameters<typeof safeError>[1]), status)
}

// ─── POST /api/workunit/:id/action-preview ─────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: workUnitId } = await params
  const requestId = resolveRequestId(request)

  audit("action_preview_create_requested", requestId, { workUnitId })

  // ── Session ──────────────────────────────────────────────────
  const sessionResult = await requireSession(request)
  if (!sessionResult.ok) {
    audit("action_preview_create_failed", requestId, { reason: "unauthorized" })
    return errorResponse(
      requestId,
      (sessionResult.reason === "forbidden" || sessionResult.reason === "invalid_tenant") ? "forbidden" : "unauthorized",
      getSessionErrorStatus(sessionResult.reason),
    )
  }
  const session = sessionResult.session

  // ── Resolve repositories ────────────────────────────────────
  const repoResult = await resolveRouteRepositories(session.tenantId as TenantId)
  if (!repoResult.ok) {
    audit("action_preview_create_failed", requestId, { reason: "persistence_not_available" })
    return errorResponse(requestId, "integration_missing", 503)
  }
  const { actionPreviews: repos, ctx } = repoResult.bundle

  // ── Parse body ───────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    audit("action_preview_create_failed", requestId, { reason: "invalid_json" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  // ── Validate ─────────────────────────────────────────────────
  const actionType = body.actionType as ApprovalActionType | undefined
  if (!actionType || !["slack_reply", "gmail_reply", "github_issue", "calendar_event", "internal_task"].includes(actionType)) {
    return errorResponse(requestId, "invalid_request", 400)
  }

  if (hasClientOwnedFields(body)) {
    audit("action_preview_create_failed", requestId, { reason: "client_provided_context" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  const targetPreview = (body.target ?? body.targetPreview ?? {}) as Record<string, unknown>
  const payloadPreview = (body.payload ?? body.payloadPreview ?? {}) as Record<string, unknown>

  // ── RBAC ─────────────────────────────────────────────────────
  if (!canCreatePreview(session)) {
    audit("action_preview_create_failed", requestId, { reason: "rbac_denied" })
    return errorResponse(requestId, "forbidden", 403)
  }

  // ── Generate canonical hashes ────────────────────────────────
  const targetHash = hashActionTarget(targetPreview)
  const payloadHash = hashActionPayload(payloadPreview)

  // ── Build + store via repository ─────────────────────────────
  const previewId = `preview:${workUnitId}:${actionType}:${Date.now()}`
  const previewRow = {
    id: previewId,
    tenantId: session.tenantId,
    workUnitId,
    actionType,
    targetPreview: JSON.stringify(targetPreview),
    payloadPreview: JSON.stringify(payloadPreview),
    requiresApproval: 1,
    status: "preview",
    targetHash,
    payloadHash,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  }

  await repos.create(ctx, previewRow)

  audit("action_preview_created", requestId, {
    workUnitId, actionPreviewId: previewId, actionType, targetHash, payloadHash,
  })

  return json({
    ok: true,
    requestId,
    preview: {
      id: previewId,
      workUnitId,
      actionType,
      targetPreview,
      payloadPreview,
      requiresApproval: true,
      status: "preview",
      createdAt: previewRow.createdAt,
      expiresAt: previewRow.expiresAt,
    },
  }, 201)
}

function hasClientOwnedFields(body: Record<string, unknown>): boolean {
  return ["targetHash", "payloadHash", "tenantId", "approvedByUserId", "status", "usedAt"].some((key) => key in body)
}
