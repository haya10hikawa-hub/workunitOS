import { NextResponse } from "next/server.js"
import { getSessionErrorStatus, requireSession } from "../../../../lib/security/session.ts"
import { safeError } from "../../../../lib/security/safeErrors.ts"
import { writeAuditLog, type AuditEventKind } from "../../../../lib/security/auditLog.ts"
import { resolveRouteRepositories } from "../../../../lib/persistence/routeRepositories.ts"
import type { TenantId } from "../../../../lib/tenant/types.ts"
import { canApprovePreview, canCreatePreview } from "../../../../lib/security/tenantAccess.ts"

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

// ─── POST /api/workunit/:id/approval ───────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: workUnitId } = await params
  const requestId = resolveRequestId(request)

  audit("approval_create_requested", requestId, { workUnitId })

  // ── Session ──────────────────────────────────────────────────
  const sessionResult = await requireSession(request)
  if (!sessionResult.ok) {
    audit("approval_create_failed", requestId, { reason: "unauthorized" })
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
    audit("approval_create_failed", requestId, { reason: "persistence_not_available" })
    return errorResponse(requestId, "integration_missing", 503)
  }
  const { actionPreviews: previewRepo, approvalRecords: approvalRepo, ctx } = repoResult.bundle

  // ── Parse body ───────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    audit("approval_create_failed", requestId, { reason: "invalid_json" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  // ── Validate ─────────────────────────────────────────────────
  const actionPreviewId = typeof body.actionPreviewId === "string" ? body.actionPreviewId : null
  const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null

  if (!actionPreviewId || !decision) {
    audit("approval_create_failed", requestId, { reason: "missing_fields" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  if (hasClientOwnedFields(body)) {
    audit("approval_create_failed", requestId, { reason: "client_provided_context" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  // ── RBAC ─────────────────────────────────────────────────────
  if (!canApprovePreview(session)) {
    audit("approval_create_failed", requestId, { reason: "rbac_denied" })
    return errorResponse(requestId, "forbidden", 403)
  }

  // ── Lookup stored preview via repository ────────────────────
  const preview = await previewRepo.findById(ctx, actionPreviewId)
  if (!preview) {
    audit("approval_lookup_failed", requestId, { actionPreviewId, reason: "not_found" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  if (preview.workUnitId !== workUnitId) {
    audit("approval_create_failed", requestId, { actionPreviewId, reason: "workunit_mismatch" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  // ── Create approval (hashes from stored preview) ─────────────
  const now = new Date().toISOString()
  const approvalId = `approval:${workUnitId}:${preview.actionType}:${Date.now()}`

  const approvalRow = {
    id: approvalId,
    tenantId: session.tenantId,
    workUnitId,
    actionPreviewId,
    actionType: preview.actionType,
    targetHash: preview.targetHash,
    payloadHash: preview.payloadHash,
    status: decision === "approve" ? "approved" as const : "rejected" as const,
    approvedByUserId: decision === "approve" ? session.userId : undefined,
    createdAt: now,
    approvedAt: decision === "approve" ? now : undefined,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    usedAt: undefined,
  }

  await approvalRepo.create(ctx, approvalRow)

  // ── Audit ────────────────────────────────────────────────────
  audit(decision === "approve" ? "approval_created" : "approval_rejected", requestId, {
    workUnitId, actionPreviewId, approvalId,
    actionType: preview.actionType, targetHash: preview.targetHash,
    payloadHash: preview.payloadHash, actorId: session.userId,
  })

  return json({
    ok: true,
    requestId,
    approval: {
      id: approvalRow.id, workUnitId, actionPreviewId,
      actionType: preview.actionType, status: approvalRow.status,
      targetHash: preview.targetHash, payloadHash: preview.payloadHash,
      expiresAt: approvalRow.expiresAt, createdAt: approvalRow.createdAt,
    },
  }, 201)
}

// ─── GET ────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: workUnitId } = await params

  const sessionResult = await requireSession(request)
  if (!sessionResult.ok) {
    return NextResponse.json(
      safeError("na", (sessionResult.reason === "forbidden" || sessionResult.reason === "invalid_tenant") ? "forbidden" : "unauthorized"),
      { status: getSessionErrorStatus(sessionResult.reason) },
    )
  }

  if (!canCreatePreview(sessionResult.session)) {
    return NextResponse.json(safeError("na", "forbidden" as Parameters<typeof safeError>[1]), { status: 403 })
  }

  const repoResult = await resolveRouteRepositories(sessionResult.session.tenantId as TenantId)
  if (!repoResult.ok) {
    return errorResponse("na", "integration_missing", 503)
  }
  const { actionPreviews: previewRepo, ctx } = repoResult.bundle
  const rows = await previewRepo.findByWorkUnitId(ctx, workUnitId)

  return NextResponse.json({ ok: true, previews: rows })
}

function hasClientOwnedFields(body: Record<string, unknown>): boolean {
  return [
    "targetHash",
    "payloadHash",
    "tenantId",
    "userId",
    "approvedByUserId",
    "approvedByPm",
    "status",
    "usedAt",
  ].some((key) => key in body)
}
