import { NextResponse } from "next/server.js"
import { listToolBackendAdapters, runToolBackendRequest } from "../../../lib/toolBackend.ts"
import { validateToolBackendRequest } from "../../../lib/toolBackendValidation.ts"
import { areExternalActionsEnabled, isExternalOperation } from "../../../lib/security/externalActions.ts"
import { getSafeErrorStatus, safeError, toSafeErrorCode } from "../../../lib/security/safeErrors.ts"
import { getSessionErrorStatus, requireSession } from "../../../lib/security/session.ts"
import { hasPermission } from "../../../lib/security/rbac.ts"
import { writeAuditLog, type AuditEventKind } from "../../../lib/security/auditLog.ts"
import type { WorkUnitPermission } from "../../../lib/security/policy.ts"
import type { ToolBackendOperation } from "../../../types/toolBackend.ts"

// LLM pipeline imports
import { processWorkSignal } from "../../../lib/llm/processWorkSignal.ts"
import { resolveLlmProvider, resolveLlmProviderConfig } from "../../../lib/llm/providerConfig.ts"
import { createExternalSignal } from "../../../lib/domain/types.ts"
import type { TenantId } from "../../../lib/tenant/types.ts"

// Approval store import
import { resolveApprovalStore, resolveRepositoryBackedApprovalStore } from "../../../lib/security/approvalStoreResolver.ts"

// Repository resolver (for preview hash context resolution)
import { resolveRouteRepositories } from "../../../lib/persistence/routeRepositories.ts"

// TODO: tenant boundary — validate that the requested source belongs to the caller's tenant
// TODO: rate limiting — enforce per-tenant and per-endpoint rate limits
// TODO: CSRF / session hardening — validate origin, referrer, CSRF token

// ─── Operation → Permission Mapping ─────────────────────────────

const OPERATION_PERMISSION: Record<ToolBackendOperation, WorkUnitPermission> = {
  ingest:       "workunit.create",
  draft:        "workunit.create",
  create_task:  "workunit.create",
  reply:        "workunit.execute_external_action",
  schedule:     "workunit.execute_external_action",
  create_issue: "workunit.execute_external_action",
}

// ─── Helpers ────────────────────────────────────────────────────

const REQUEST_ID_HEADER = "x-request-id"

function resolveRequestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER) ?? `req:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
}

function audit(kind: AuditEventKind, requestId: string, extras?: Partial<Parameters<typeof writeAuditLog>[0]>) {
  writeAuditLog({
    kind,
    timestamp: new Date().toISOString(),
    requestId,
    ...extras,
  })
}

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status })
}

function errorResponse(requestId: string, code: ReturnType<typeof safeError>["error"], status: number): NextResponse {
  return json(safeError(requestId, code), status)
}

// ─── GET ────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    adapters: listToolBackendAdapters().map(({ source, operations }) => ({ source, operations })),
  })
}

// ─── POST ───────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = resolveRequestId(request)

  // ── 1. Audit: request received ────────────────────────────────
  audit("tool_request_received", requestId)

  // ── 2. Session boundary ───────────────────────────────────────
  const sessionResult = await requireSession(request)
  if (!sessionResult.ok) {
    audit("auth_required", requestId, { reason: sessionResult.reason })
    return errorResponse(
      requestId,
      (sessionResult.reason === "forbidden" || sessionResult.reason === "invalid_tenant") ? "forbidden" : "unauthorized",
      getSessionErrorStatus(sessionResult.reason),
    )
  }
  const session = sessionResult.session

  // ── 3. Parse JSON as unknown ──────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    audit("tool_request_rejected", requestId, { reason: "invalid_json" })
    return errorResponse(requestId, "invalid_request", 400)
  }

  // ── 4. Runtime validation ─────────────────────────────────────
  const validation = validateToolBackendRequest(body)
  if (!validation.ok) {
    audit("tool_request_rejected", requestId, { reason: "validation_failed" })
    return errorResponse(requestId, "invalid_request", 400)
  }
  audit("tool_request_validated", requestId)
  const { request: validated } = validation

  // ── 5. RBAC — map operation to required permission ────────────
  const requiredPermission = OPERATION_PERMISSION[validated.operation]
  if (!hasPermission(session, requiredPermission)) {
    audit("rbac_denied", requestId, {
      actorId: session.userId,
      tenantId: session.tenantId,
      reason: `missing_permission:${requiredPermission}`,
    })
    return errorResponse(requestId, "forbidden", 403)
  }

  // ── 6. LLM Ingest Path ────────────────────────────────────────
  if (validated.operation === "ingest" && validated.event) {
    const providerResult = resolveLlmProvider()
    const config = resolveLlmProviderConfig()

    if (!providerResult) {
      // Legacy fallback: only if explicitly allowed
      if (!config.allowLegacyFallback) {
        audit("llm_processing_blocked", requestId, { reason: "no_llm_provider" })
        return errorResponse(requestId, "integration_missing", 503)
      }
      // Fall through to legacy backend
      audit("llm_processing_blocked", requestId, { reason: "no_llm_provider_fallback_to_legacy" })
    } else {
      audit("llm_processing_started", requestId)

      const signal = createExternalSignal({
        id: validated.event.id ?? validated.id,
        tenantId: session.tenantId as TenantId,
        sourceType: (validated.source === "github" ? "github" : validated.source) as Parameters<typeof createExternalSignal>[0]["sourceType"],
        sourceRef: {
          source: (validated.source === "github" ? "github" : validated.source) as Parameters<typeof createExternalSignal>[0]["sourceRef"]["source"],
          externalId: validated.event.id ?? validated.id,
          capturedAt: validated.event.timestamp ?? new Date().toISOString(),
        },
        metadata: validated.event as unknown as Record<string, unknown>,
      })

      const result = await processWorkSignal(providerResult.provider, signal, session.tenantId as TenantId, { createdBy: "ai" })

      if (!result.ok) {
        // Map LLM pipeline errors to safe API errors
        const mapped = mapLlmError(result.error)
        audit(mapped.auditKind, requestId, { operation: "ingest", reason: result.error })
        return errorResponse(requestId, mapped.code, mapped.status)
      }

      audit("llm_processing_completed", requestId, { operation: "ingest" })

      return json({
        ok: true,
        requestId,
        target: "hopper",
        result: {
          candidate: result.candidate,
          draft: result.draft,
          evaluation: result.evaluation,
        },
        sanitizedSignal: result.sanitizedSignal,
        warnings: result.warnings,
        riskFlags: result.riskFlags,
        errors: [],
      }, 200)
    }
  }

  // ── 7. Kill switch for external operations ────────────────────
  if (isExternalOperation(validated.operation)) {
    if (!areExternalActionsEnabled()) {
      audit("external_action_blocked", requestId, {
        operation: validated.operation,
        reason: "kill_switch_off",
      })
      return errorResponse(requestId, "external_actions_disabled", 403)
    }
  }

  // NOTE: validated request has already stripped approvedByPm and externalConfig.
  // The client cannot authorize external execution or choose arbitrary targets.

  // ── 8. Execute (legacy backend) ───────────────────────────────
  try {
    let approvalStore = resolveApprovalStore(session.tenantId as TenantId)

    // Resolve preview hash context for external operations
    let previewHashContext: { actionPreviewId: string; targetHash: string; payloadHash: string } | undefined
    if (isExternalOperation(validated.operation) && validated.approvalId && validated.actionPreviewId) {
      const repoResult = await resolveRouteRepositories(session.tenantId as TenantId)
      if (!repoResult.ok) {
        audit("execution_approval_failed" as AuditEventKind, requestId, {
          operation: validated.operation,
          reason: `persistence_not_available`,
        })
        return errorResponse(requestId, "integration_missing", 503)
      }
      const { actionPreviews: previewRepo, approvalRecords: approvalRepo, ctx } = repoResult.bundle
      const storedPreview = await previewRepo.findById(ctx, validated.actionPreviewId)
      if (!storedPreview) {
        audit("execution_approval_failed" as AuditEventKind, requestId, {
          operation: validated.operation,
          reason: `preview_not_found:${validated.actionPreviewId}`,
        })
        return errorResponse(requestId, "approval_required", 403)
      }
      previewHashContext = {
        actionPreviewId: validated.actionPreviewId,
        targetHash: storedPreview.targetHash as string,
        payloadHash: storedPreview.payloadHash as string,
      }
      approvalStore = resolveRepositoryBackedApprovalStore(approvalRepo, ctx)
    }

    const result = await runToolBackendRequest(validated, {
      approvalStore,
      tenantId: session.tenantId as TenantId,
      previewHashContext,
    })
    if (!result.ok) {
      const safeCode = toSafeErrorCode(result.errors[0] ?? "internal_error")
      const status = getSafeErrorStatus(safeCode)
      audit(safeCode as AuditEventKind, requestId, { operation: validated.operation, reason: safeCode })
      return json(safeError(requestId, safeCode), status)
    }
    return json(result, 200)
  } catch {
    audit("internal_error", requestId, { operation: validated.operation })
    return errorResponse(requestId, "internal_error", 500)
  }
}

// ─── LLM Error Mapping ──────────────────────────────────────────

function mapLlmError(error: string): { code: ReturnType<typeof safeError>["error"]; status: number; auditKind: AuditEventKind } {
  switch (error) {
    case "unsafe_input":
      return { code: "invalid_request", status: 400, auditKind: "llm_processing_blocked" }
    case "invalid_llm_output":
      return { code: "internal_error", status: 500, auditKind: "llm_processing_failed" }
    case "token_budget_exceeded":
      return { code: "rate_limited", status: 429, auditKind: "llm_budget_exceeded" }
    default:
      return { code: "internal_error", status: 500, auditKind: "llm_processing_failed" }
  }
}
