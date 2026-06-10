import { candidateToWorkUnitDraft } from "./workUnitDrafts.ts"
import { sanitizeSourceEvent } from "./sourceHoppers.ts"
import { checkExternalSendApproval, evaluatePrivacyRegression } from "./workUnitSafety.ts"
import {
  createDefaultExternalToolClients,
  githubConfig,
  gmailConfig,
  googleCalendarConfig,
  slackConfig,
} from "./externalToolClients.ts"
import {
  createCalendarScheduleCandidate,
  createGitHubIssueDraft,
  createReplyDrafts,
  createTaskDraft,
} from "./workUnitExecution.ts"
import type { ExternalToolClients, ExternalToolResult } from "./externalToolClients.ts"
import type { CalendarScheduleCandidate, GitHubIssueDraft, ReplyDraft } from "./workUnitExecution.ts"
import type { SourceKind } from "../types/sourceHopper.ts"
import type { ToolBackendAdapter, ToolBackendRequest, ToolBackendResponse } from "../types/toolBackend.ts"

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
}

export function listToolBackendAdapters(): readonly ToolBackendAdapter[] {
  return SOURCES.map((source) => ({ source, operations: operationsFor(source), run: runToolBackendRequest }))
}

export async function runToolBackendRequest(request: ToolBackendRequest, options: ToolBackendRunOptions = {}): Promise<ToolBackendResponse> {
  if (!request.id || !SOURCES.includes(request.source)) return fail(request.id, "unknown_source")
  if (request.operation === "ingest" || request.operation === "draft") return runIngest(request)
  if (request.operation === "create_task") return runTask(request)
  if (request.operation === "create_issue") return runApprovedExternal(request, "github_issue", options)
  if (request.operation === "schedule") return runApprovedExternal(request, "calendar", options)
  if (request.operation === "reply") return runApprovedExternal(request, request.source === "gmail" ? "gmail_reply" : "slack_reply", options)
  return fail(request.id, "unknown_operation")
}

function runIngest(request: ToolBackendRequest): ToolBackendResponse {
  if (!request.event || request.event.source !== request.source) return fail(request.id, "event_source_mismatch")
  const candidate = sanitizeSourceEvent(request.event)
  if (!candidate) return fail(request.id, "invalid_event")
  const safety = evaluatePrivacyRegression([candidate])
  if (!safety.passed) return fail(request.id, safety.findings.map((finding) => finding.message))
  return ok(request.id, request.operation === "draft" ? candidateToWorkUnitDraft(candidate) : candidate, request.operation === "draft" ? "draft" : "hopper")
}

function runTask(request: ToolBackendRequest): ToolBackendResponse {
  if (!request.draft) return fail(request.id, "draft_required")
  const task = createTaskDraft(request.draft)
  return task ? ok(request.id, task, "task") : fail(request.id, "draft_not_executable")
}

async function runApprovedExternal(
  request: ToolBackendRequest,
  target: "github_issue" | "calendar" | "gmail_reply" | "slack_reply",
  options: ToolBackendRunOptions,
): Promise<ToolBackendResponse> {
  if (!request.draft) return fail(request.id, "draft_required")
  const approval = checkExternalSendApproval({
    action: target === "calendar" ? "schedule" : "post",
    source: sourceForApproval(request.source),
    payload: { id: request.draft.id, title: request.draft.title, target },
    approvedByPm: request.approvedByPm,
    approvalId: request.approvalId,
  })
  if (!approval.passed) return fail(request.id, approval.findings.map((finding) => finding.message))
  const draft = target === "github_issue"
    ? createGitHubIssueDraft(request.draft)
    : target === "calendar"
      ? createCalendarScheduleCandidate(request.draft)
      : createReplyDrafts(request.draft).find((reply) => reply.target === target)
  if (!draft) return fail(request.id, "draft_not_executable")

  try {
    const external = await executeExternal(target, draft, request, options)
    return ok(request.id, { draft, external }, target, external.externalRef)
  } catch (error) {
    return fail(request.id, error instanceof Error ? error.message : "external_tool_failed")
  }
}

function operationsFor(source: ToolBackendRequest["source"]): readonly ToolBackendRequest["operation"][] {
  if (source === "github") return ["create_issue"]
  return source === "google_calendar" ? ["ingest", "draft", "schedule"] : ["ingest", "draft", "create_task", "reply"]
}

function sourceForApproval(source: ToolBackendRequest["source"]): SourceKind {
  return source === "github" ? "google_drive" : source
}

async function executeExternal(
  target: "github_issue" | "calendar" | "gmail_reply" | "slack_reply",
  draft: GitHubIssueDraft | CalendarScheduleCandidate | ReplyDraft,
  request: ToolBackendRequest,
  options: ToolBackendRunOptions,
): Promise<ExternalToolResult> {
  const env = options.env ?? process.env
  const clients = options.clients ?? createDefaultExternalToolClients(env)
  if (target === "github_issue") {
    if (!clients.github) throw new Error("external_tool_not_configured:github")
    const config = githubConfig(request.externalConfig, env)
    if (!config) throw new Error("external_config_missing:github")
    return clients.github.createIssue({ draft: draft as GitHubIssueDraft, owner: config.owner, repo: config.repo })
  }
  if (target === "calendar") {
    if (!clients.googleCalendar) throw new Error("external_tool_not_configured:google_calendar")
    const config = googleCalendarConfig(request.externalConfig, env)
    if (!config) throw new Error("external_config_missing:google_calendar")
    return clients.googleCalendar.createEvent({ candidate: draft as CalendarScheduleCandidate, calendarId: config.calendarId, timeZone: config.timeZone })
  }
  if (target === "gmail_reply") {
    if (!clients.gmail) throw new Error("external_tool_not_configured:gmail")
    const config = gmailConfig(request.externalConfig, env)
    if (!config) throw new Error("external_config_missing:gmail")
    return clients.gmail.sendMessage({
      draft: draft as ReplyDraft,
      to: config.to,
      from: config.from,
      subject: config.subject ?? `Re: ${(draft as ReplyDraft).workUnitDraftId}`,
    })
  }
  if (!clients.slack) throw new Error("external_tool_not_configured:slack")
  const config = slackConfig(request.externalConfig, env)
  if (!config) throw new Error("external_config_missing:slack")
  return clients.slack.postMessage({ draft: draft as ReplyDraft, channel: config.channel, threadTs: config.threadTs })
}

function ok(requestId: string, result: unknown, target: ToolBackendResponse["target"], externalRef: string | null = null): ToolBackendResponse {
  return { ok: true, requestId, target, result, externalRef, errors: [] }
}

function fail(requestId: string | undefined, error: string | readonly string[]): ToolBackendResponse {
  return { ok: false, requestId: requestId ?? "unknown", errors: Array.isArray(error) ? [...error] : [error] }
}
