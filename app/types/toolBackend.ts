import type { SourceHopperEvent, SourceKind, WorkUnitDraft } from "./sourceHopper.ts"
import type { ExecutionTarget } from "../lib/workUnitExecution.ts"

export type ToolBackendOperation = "ingest" | "draft" | "create_issue" | "create_task" | "schedule" | "reply"

export type ToolBackendExternalConfig = {
  github?: {
    owner: string
    repo: string
  }
  slack?: {
    channel: string
    threadTs?: string
  }
  gmail?: {
    to: string
    from?: string
    subject?: string
  }
  googleCalendar?: {
    calendarId: string
    timeZone?: string
  }
}

export type ToolBackendRequest = {
  id: string
  source: SourceKind | "github"
  operation: ToolBackendOperation
  event?: SourceHopperEvent
  draft?: WorkUnitDraft
  approvedByPm?: boolean
  approvalId?: string
  externalConfig?: ToolBackendExternalConfig
}

export type ToolBackendAdapter = {
  source: ToolBackendRequest["source"]
  operations: readonly ToolBackendOperation[]
  run: (request: ToolBackendRequest) => Promise<ToolBackendResponse> | ToolBackendResponse
}

export type ToolBackendResponse = {
  ok: boolean
  requestId: string
  target?: ExecutionTarget | "hopper" | "draft"
  result?: unknown
  externalRef?: string | null
  errors: string[]
}
