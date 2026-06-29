import { NextResponse } from "next/server.js"
import { getSessionErrorStatus, requireSession } from "../../../../../lib/security/session.ts"
import { safeError } from "../../../../../lib/security/safeErrors.ts"
import { writeAuditLog, type AuditEventKind } from "../../../../../lib/security/auditLog.ts"
import { resolveRouteRepositories } from "../../../../../lib/persistence/routeRepositories.ts"
import { areExternalActionsEnabled } from "../../../../../lib/security/externalActions.ts"
import type { TenantId } from "../../../../../lib/tenant/types.ts"
import { canCreatePreview } from "../../../../../lib/security/tenantAccess.ts"
import { verifyApprovalPreviewBinding } from "../../../../../lib/security/approvalPreviewBinding.ts"
import { validateCsrfOrigin } from "../../../../../lib/security/csrfProtection.ts"

// ─── Types ──────────────────────────────────────────────────────

type DryRunResponse = {
  ok: true
  mode: "dry_run"
  status: "verified" | "blocked" | "not_ready"
  reason: string
  workUnitId: string
  actionCount: number
  requestedActionType: string | null
}

// ─── Helpers ────────────────────────────────────────────────────

function audit(kind: AuditEventKind, requestId: string, extras?: Record<string, unknown>) {
  writeAuditLog({ kind, timestamp: new Date().toISOString(), requestId, ...extras })
}

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status })
}

function errorResponse(requestId: string, code: string, status: number): NextResponse {
  return json(safeError(requestId, code as Parameters<typeof safeError>[1]), status)
}

const FORBIDDEN_CLIENT_KEYS = [
  "approvalId", "targetHash", "payloadHash",
  "tenantId", "userId", "approvedByUserId", "approvedByPm",
  "role", "status", "usedAt",
  "tokens", "secret", "rawPayload", "rawBody",
]

function hasForbiddenClientKeys(body: Record<string, unknown>): boolean {
  return FORBIDDEN_CLIENT_KEYS.some((key) => key in body)
}

// ─── POST /api/workunit/:id/execution/dry-run ──────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: workUnitId } = await params
  const requestId = `dry-run:${workUnitId}:${Date.now()}`

  const csrf = validateCsrfOrigin(request)
  if (!csrf.ok) return errorResponse(requestId, csrf.reason, 403)

  audit("execution_dry_run_requested", requestId, { workUnitId })

  // ── 1. Session ───────────────────────────────────────────────
  const sessionResult = await requireSession(request)
  if (!sessionResult.ok) {
    audit("execution_dry_run_failed", requestId, { reason: "unauthorized" })
    return errorResponse(
      requestId,
      (sessionResult.reason === "forbidden" || sessionResult.reason === "invalid_tenant") ? "forbidden" : "unauthorized",
      getSessionErrorStatus(sessionResult.reason),
    )
  }
  const session = sessionResult.session

  // ── 2. Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    audit("execution_dry_run_failed", requestId, { reason: "invalid_json" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  // ── 3. Validate shape ────────────────────────────────────────
  if (typeof body.workUnitId !== "string" || body.workUnitId !== workUnitId) {
    audit("execution_dry_run_failed", requestId, { reason: "workunit_mismatch" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  if (hasForbiddenClientKeys(body)) {
    audit("execution_dry_run_failed", requestId, { reason: "client_provided_context" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  const previewRefs: Array<{ actionId: string; previewId: string }> =
    Array.isArray(body.previewRefs)
      ? (body.previewRefs as unknown[]).filter(
          (ref): ref is { actionId: string; previewId: string } =>
            typeof (ref as Record<string, unknown>).actionId === "string" &&
            typeof (ref as Record<string, unknown>).previewId === "string",
        )
      : []

  const requestedActionType: string | null =
    typeof body.requestedActionType === "string" ? body.requestedActionType : null

  // ── 4. RBAC ──────────────────────────────────────────────────
  if (!canCreatePreview(session)) {
    audit("execution_dry_run_failed", requestId, { reason: "rbac_denied" })
    return errorResponse(requestId, "forbidden", 403)
  }

  // ── 5. Resolve repositories ──────────────────────────────────
  const repoResult = await resolveRouteRepositories(session.tenantId as TenantId)
  if (!repoResult.ok) {
    audit("execution_dry_run_failed", requestId, { reason: "persistence_not_available" })
    return errorResponse(requestId, "integration_missing", 503)
  }
  const {
    actionPreviews: previewRepo,
    approvalRecords: approvalRepo,
    ctx,
  } = repoResult.bundle

  // ── 6. Load stored previews + approvals ──────────────────────
  const previewIds = previewRefs.map((ref) => ref.previewId)
  if (previewIds.length === 0) {
    audit("execution_dry_run_blocked", requestId, { reason: "preview_ref_required" })
    return successResponse(workUnitId, previewRefs.length, requestedActionType, "not_ready", "A stored preview reference is required before dry-run verification.", requestId)
  }

  // ── 7. Explicit approval ↔ preview binding (Phase 5C) ────────
  // No latest/workUnit-only approval lookup. For each referenced preview, resolve
  // the approval bound to THAT exact preview (by actionPreviewId, tenant-scoped)
  // and verify the pair. The request is ready only if some referenced preview has
  // a fully-bound, valid approval.
  let verified = false
  let firstFailure: ReturnType<typeof verifyApprovalPreviewBinding> | null = null
  const now = new Date().toISOString()

  for (const previewId of previewIds) {
    const [approval, preview] = await Promise.all([
      approvalRepo.findByPreviewId(ctx, previewId),
      previewRepo.findById(ctx, previewId),
    ])
    const outcome = verifyApprovalPreviewBinding(
      { tenantId: session.tenantId as TenantId, workUnitId, actionPreviewId: previewId, requestedActionType, now },
      approval,
      preview,
    )
    if (outcome.ok) {
      verified = true
      break
    }
    if (!firstFailure) firstFailure = outcome
  }

  if (!verified) {
    const failure = firstFailure ?? { ok: false as const, disposition: "not_ready" as const, reason: "No approval found for this preview." }
    if (failure.ok === false && failure.disposition === "forbidden") {
      audit("execution_dry_run_failed", requestId, { reason: "tenant_mismatch" })
      return errorResponse(requestId, "forbidden", 403)
    }
    if (failure.ok === false && failure.disposition === "invalid_request") {
      audit("execution_dry_run_failed", requestId, { reason: "binding_mismatch" })
      return errorResponse(requestId, "invalid_request", 400)
    }
    const reason = failure.ok === false && failure.disposition === "not_ready" ? failure.reason : "Not ready."
    audit("execution_dry_run_blocked", requestId, { reason: "binding_not_ready" })
    return successResponse(workUnitId, previewRefs.length, requestedActionType, "not_ready", reason, requestId)
  }

  // ── 8. Check kill switch ─────────────────────────────────────
  if (!areExternalActionsEnabled()) {
    audit("execution_dry_run_blocked", requestId, { reason: "kill_switch_active" })
    return successResponse(workUnitId, previewRefs.length, requestedActionType, "blocked", "External execution is disabled by kill switch.", requestId)
  }

  // ── 9. Verified ──────────────────────────────────────────────
  // IMPORTANT: dry-run NEVER marks approval as used
  // Approval remains available for real execution if/when enabled
  audit("execution_dry_run_verified", requestId, {
    workUnitId,
    actionCount: previewRefs.length,
    actionType: requestedActionType,
  })

  return successResponse(workUnitId, previewRefs.length, requestedActionType, "verified", "Execution would be allowed.", requestId)
}

// ─── Response builder ──────────────────────────────────────────

function successResponse(
  workUnitId: string,
  actionCount: number,
  requestedActionType: string | null,
  status: DryRunResponse["status"],
  reason: string,
  requestId: string,
): NextResponse {
  const body: DryRunResponse = {
    ok: true,
    mode: "dry_run",
    status,
    reason,
    workUnitId,
    actionCount,
    requestedActionType,
  }
  return json({ ...body, requestId }, 200)
}
