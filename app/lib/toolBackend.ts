import { candidateToWorkUnitDraft } from "./workUnitDrafts.ts"
import { sanitizeSourceEvent } from "./sourceHoppers.ts"
import { evaluatePrivacyRegression } from "./workUnitSafety.ts"
import { createTaskDraft } from "./workUnitExecution.ts"
import { areExternalActionsEnabled, isExternalOperation } from "./security/externalActions.ts"
import {
  verifyApproval,
  defaultDenyApprovalStore,
} from "./security/actionApproval.ts"
import type { ApprovalStore } from "./security/actionApproval.ts"
import type { ApprovalActionType } from "./domain/types.ts"
import type { ExternalToolClients } from "./externalToolClients.ts"
import type { ToolBackendAdapter, ToolBackendRequest, ToolBackendResponse } from "../types/toolBackend.ts"
import type { TenantId } from "./tenant/types.ts"

const SOURCES: readonly ToolBackendRequest["source"][] = [
  "slack",
  "notion",
  "gmail",
  "google_drive",
  "google_calendar",
  "github",
]

export type ToolBackendRunOptions = {
  clients?: ExternalToolClients
  env?: NodeJS.ProcessEnv
  /** Server-side approval store. Defaults to defaultDenyApprovalStore. */
  approvalStore?: ApprovalStore
  /** Tenant ID for approval verification. */
  tenantId?: TenantId
  /** ActionPreview hash context for external execution verification. */
  previewHashContext?: {
    actionPreviewId: string
    targetHash: string
    payloadHash: string
  }
}

export function listToolBackendAdapters(): readonly ToolBackendAdapter[] {
  return SOURCES.map((source) => ({ source, operations: operationsFor(source), run: runToolBackendRequest }))
}

export async function runToolBackendRequest(
  request: ToolBackendRequest,
  options: ToolBackendRunOptions = {},
): Promise<ToolBackendResponse> {
  if (!request.id || !SOURCES.includes(request.source)) return fail(request.id, "invalid_request")
  if (request.operation === "ingest" || request.operation === "draft") return runIngest(request)
  if (request.operation === "create_task") return runTask(request)

  // Double guard: re-check external action kill switch inside the backend.
  if (isExternalOperation(request.operation) && !areExternalActionsEnabled(options.env)) {
    return fail(request.id, "external_actions_disabled")
  }

  if (request.operation === "create_issue") return runApprovedExternal(request, "github_issue", options)
  if (request.operation === "schedule") return runApprovedExternal(request, "calendar", options)
  if (request.operation === "reply")
    return runApprovedExternal(request, request.source === "gmail" ? "gmail_reply" : "slack_reply", options)

  return fail(request.id, "invalid_request")
}

function runIngest(request: ToolBackendRequest): ToolBackendResponse {
  if (!request.event || request.event.source !== request.source) return fail(request.id, "invalid_request")
  const candidate = sanitizeSourceEvent(request.event)
  if (!candidate) return fail(request.id, "invalid_request")
  const safety = evaluatePrivacyRegression([candidate])
  if (!safety.passed) return fail(request.id, "invalid_request")
  return ok(
    request.id,
    request.operation === "draft" ? candidateToWorkUnitDraft(candidate) : candidate,
    request.operation === "draft" ? "draft" : "hopper",
  )
}

function runTask(request: ToolBackendRequest): ToolBackendResponse {
  if (!request.draft) return fail(request.id, "invalid_request")
  const task = createTaskDraft(request.draft)
  return task ? ok(request.id, task, "task") : fail(request.id, "invalid_request")
}

async function runApprovedExternal(
  request: ToolBackendRequest,
  target: "github_issue" | "calendar" | "gmail_reply" | "slack_reply",
  options: ToolBackendRunOptions,
): Promise<ToolBackendResponse> {
  if (!request.draft) return fail(request.id, "invalid_request")

  // Server-side approval verification via ApprovalStore.
  // Requires real ActionPreview hash context from lifecycle endpoints.
  // Placeholder/draft-derived hashes are NEVER used for execution.
  const store = options.approvalStore ?? defaultDenyApprovalStore
  const tenantId = options.tenantId ?? "dev-tenant" as TenantId
  const actionType = approvalActionTypeForTarget(target)
  if (!request.approvalId) return fail(request.id, "approval_required")

  // Require real ActionPreview hash context
  const hashCtx = options.previewHashContext
  if (!hashCtx) {
    return fail(request.id, "approval_required")
  }

  const verification = await verifyApproval(store, {
    tenantId,
    workUnitId: request.draft.id,
    actionPreviewId: hashCtx.actionPreviewId,
    approvalId: request.approvalId,
    actionType,
    targetHash: hashCtx.targetHash,
    payloadHash: hashCtx.payloadHash,
    now: new Date().toISOString(),
  })

  if (!verification.ok) {
    return fail(request.id, verification.error)
  }

  // Phase 5B: atomically claim the approval (one-time use). verifyApproval was a
  // read; this compare-and-set is the write that actually wins the claim. If it
  // does not win (already used, expired, or a concurrent winner between the read
  // and this write), fail closed instead of proceeding.
  const claimed = await store.markApprovalUsed(verification.approvalId, new Date().toISOString())
  if (!claimed) {
    return fail(request.id, "approval_used")
  }

  return ok(request.id, { approved: true, target }, target, verification.approvalId)
}

function approvalActionTypeForTarget(target: "github_issue" | "calendar" | "gmail_reply" | "slack_reply"): ApprovalActionType {
  if (target === "calendar") return "calendar_event"
  return target
}

function operationsFor(source: ToolBackendRequest["source"]): readonly ToolBackendRequest["operation"][] {
  if (source === "github") return ["create_issue"]
  return source === "google_calendar" ? ["ingest", "draft", "schedule"] : ["ingest", "draft", "create_task", "reply"]
}

// ─── Response Helpers ───────────────────────────────────────────

function ok(
  requestId: string,
  result: unknown,
  target: ToolBackendResponse["target"],
  externalRef: string | null = null,
): ToolBackendResponse {
  return { ok: true, requestId, target, result, externalRef, errors: [] }
}

function fail(requestId: string | undefined, error: string | readonly string[]): ToolBackendResponse {
  return { ok: false, requestId: requestId ?? "unknown", errors: Array.isArray(error) ? [...error] : [error] }
}
