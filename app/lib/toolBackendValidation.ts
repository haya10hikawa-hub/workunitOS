import type { ToolBackendRequest, ToolBackendOperation } from "../types/toolBackend.ts"

const VALID_SOURCES: readonly ToolBackendRequest["source"][] = [
  "slack",
  "notion",
  "gmail",
  "google_drive",
  "google_calendar",
  "github",
]

const VALID_OPERATIONS: readonly ToolBackendOperation[] = [
  "ingest",
  "draft",
  "create_issue",
  "create_task",
  "schedule",
  "reply",
]

const OPERATIONS_BY_SOURCE: Record<ToolBackendRequest["source"], readonly ToolBackendOperation[]> = {
  github: ["create_issue"],
  google_calendar: ["ingest", "draft", "schedule"],
  slack: ["ingest", "draft", "create_task", "reply"],
  notion: ["ingest", "draft", "create_task", "reply"],
  gmail: ["ingest", "draft", "create_task", "reply"],
  google_drive: ["ingest", "draft", "create_task", "reply"],
}

const MAX_STRING_LENGTH = 10_000
const MAX_ARRAY_LENGTH = 500

export type ValidationResult =
  | { ok: true; request: ToolBackendRequest }
  | { ok: false; error: string }

export function validateToolBackendRequest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid_request" }
  }

  const body = input as Record<string, unknown>

  // --- id ---
  if (typeof body.id !== "string" || body.id.length === 0 || body.id.length > MAX_STRING_LENGTH) {
    return { ok: false, error: "invalid_request" }
  }

  // --- source ---
  if (typeof body.source !== "string" || !isValidSource(body.source)) {
    return { ok: false, error: "invalid_request" }
  }
  const source = body.source

  // --- operation ---
  if (typeof body.operation !== "string" || !isValidOperation(body.operation)) {
    return { ok: false, error: "invalid_request" }
  }
  const operation = body.operation

  // --- operation/source combination ---
  if (!OPERATIONS_BY_SOURCE[source].includes(operation)) {
    return { ok: false, error: "invalid_request" }
  }

  // --- event required for ingest/draft ---
  if (operation === "ingest" || operation === "draft") {
    if (!body.event || typeof body.event !== "object" || Array.isArray(body.event)) {
      return { ok: false, error: "invalid_request" }
    }
    const event = body.event as Record<string, unknown>
    if (typeof event.id !== "string" || event.id.length === 0 || event.id.length > MAX_STRING_LENGTH) {
      return { ok: false, error: "invalid_request" }
    }
    if (typeof event.source !== "string" || event.source !== source) {
      return { ok: false, error: "invalid_request" }
    }
    if (!passesStringLengthLimits(event) || !passesArrayLengthLimits(event)) {
      return { ok: false, error: "invalid_request" }
    }
  }

  // --- draft required for create_issue, create_task, schedule, reply ---
  if (operation === "create_issue" || operation === "create_task" || operation === "schedule" || operation === "reply") {
    if (!body.draft || typeof body.draft !== "object" || Array.isArray(body.draft)) {
      return { ok: false, error: "invalid_request" }
    }
    const draft = body.draft as Record<string, unknown>
    if (typeof draft.id !== "string" || draft.id.length === 0 || draft.id.length > MAX_STRING_LENGTH) {
      return { ok: false, error: "invalid_request" }
    }
    if (typeof draft.title !== "string" || draft.title.length > MAX_STRING_LENGTH) {
      return { ok: false, error: "invalid_request" }
    }
    if (!passesStringLengthLimits(draft) || !passesArrayLengthLimits(draft)) {
      return { ok: false, error: "invalid_request" }
    }
  }

  // --- global payload string/array length guard ---
  if (!passesStringLengthLimits(body) || !passesArrayLengthLimits(body)) {
    return { ok: false, error: "invalid_request" }
  }

  // Build sanitized request — strip untrusted client fields
  // CLIENT-STRIPPED fields: approvedByPm, externalConfig (NEVER trusted)
  // CLIENT-ALLOWED fields: approvalId, actionPreviewId (only identifiers; hashes from server)
  const request: ToolBackendRequest = {
    id: body.id as string,
    source,
    operation,
    ...(body.event ? { event: body.event as ToolBackendRequest["event"] } : {}),
    ...(body.draft ? { draft: body.draft as ToolBackendRequest["draft"] } : {}),
    ...(typeof body.approvalId === "string" ? { approvalId: body.approvalId } : {}),
    ...(typeof body.actionPreviewId === "string" ? { actionPreviewId: body.actionPreviewId } : {}),
  }

  return { ok: true, request }
}

function isValidSource(value: string): value is ToolBackendRequest["source"] {
  return (VALID_SOURCES as readonly string[]).includes(value)
}

function isValidOperation(value: string): value is ToolBackendOperation {
  return (VALID_OPERATIONS as readonly string[]).includes(value)
}

function passesStringLengthLimits(obj: Record<string, unknown>): boolean {
  return Object.entries(obj).every(([, v]) => {
    if (typeof v === "string" && v.length > MAX_STRING_LENGTH) return false
    if (v && typeof v === "object" && !Array.isArray(v)) return passesStringLengthLimits(v as Record<string, unknown>)
    return true
  })
}

function passesArrayLengthLimits(obj: Record<string, unknown>): boolean {
  return Object.entries(obj).every(([, v]) => {
    if (Array.isArray(v) && v.length > MAX_ARRAY_LENGTH) return false
    if (v && typeof v === "object" && !Array.isArray(v)) return passesArrayLengthLimits(v as Record<string, unknown>)
    return true
  })
}
