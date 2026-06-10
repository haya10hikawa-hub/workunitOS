import type { WorkUnitDraft } from "../types/sourceHopper"
import { missingWorkUnitFields } from "./workUnitDrafts.ts"

export type ExecutionTarget = "github_issue" | "task" | "calendar" | "slack_reply" | "gmail_reply"
export type ExecutionStatus = "pending_approval" | "approved" | "rejected" | "succeeded" | "failed"

export type GitHubIssueDraft = {
  id: string
  workUnitDraftId: string
  title: string
  body: string
  labels: string[]
  requiresApproval: true
}

export type TaskDraft = {
  id: string
  workUnitDraftId: string
  title: string
  checklist: string[]
  due: string | null
  owner: string
}

export type CalendarScheduleCandidate = {
  id: string
  workUnitDraftId: string
  title: string
  timeHint: string
  attendees: string[]
  description: string
  requiresApproval: true
}

export type ReplyDraft = {
  id: string
  workUnitDraftId: string
  target: "slack_reply" | "gmail_reply"
  recipient: string
  body: string
  requiresApproval: true
}

export type ExecutionApproval = {
  id: string
  workUnitDraftId: string
  target: ExecutionTarget
  status: "pending" | "approved" | "rejected"
  decidedBy: "PM" | null
  reason: string | null
  updatedAt: string
}

export type ExecutionResultLog = {
  id: string
  workUnitDraftId: string
  target: ExecutionTarget
  status: ExecutionStatus
  message: string
  externalRef: string | null
  createdAt: string
}

export type CompletionCriteria = {
  workUnitDraftId: string
  doneWhen: string[]
  blockers: string[]
  isComplete: boolean
}

export function createGitHubIssueDraft(draft: WorkUnitDraft): GitHubIssueDraft | null {
  if (!isExecutableDraft(draft)) return null
  return {
    id: `${draft.id}:github_issue`,
    workUnitDraftId: draft.id,
    title: draft.title.trim(),
    body: buildIssueBody(draft),
    labels: ["workunit", draft.urgency >= 8 ? "urgent" : "normal"],
    requiresApproval: true,
  }
}

export function createTaskDraft(draft: WorkUnitDraft): TaskDraft | null {
  if (!isExecutableDraft(draft)) return null
  return {
    id: `${draft.id}:task`,
    workUnitDraftId: draft.id,
    title: draft.nextAction.trim(),
    checklist: draft.tasks.length ? draft.tasks : [draft.nextAction],
    due: normalizeDeadline(draft.deadline),
    owner: draft.actors[0] ?? "PM",
  }
}

export function createCalendarScheduleCandidate(draft: WorkUnitDraft): CalendarScheduleCandidate | null {
  const due = normalizeDeadline(draft.deadline)
  if (!isExecutableDraft(draft) || !due) return null
  return {
    id: `${draft.id}:calendar`,
    workUnitDraftId: draft.id,
    title: draft.title.trim(),
    timeHint: due,
    attendees: draft.actors,
    description: draft.nextAction,
    requiresApproval: true,
  }
}

export function createReplyDrafts(draft: WorkUnitDraft): ReplyDraft[] {
  if (!isExecutableDraft(draft)) return []
  return sourceTargets(draft).map((target) => ({
    id: `${draft.id}:${target}`,
    workUnitDraftId: draft.id,
    target,
    recipient: draft.actors[0] ?? "Unknown",
    body: `確認しました。${draft.nextAction}`,
    requiresApproval: true,
  }))
}

export function createExecutionApproval(
  draft: WorkUnitDraft,
  target: ExecutionTarget,
  now = new Date().toISOString(),
): ExecutionApproval {
  return {
    id: `${draft.id}:${target}:approval`,
    workUnitDraftId: draft.id,
    target,
    status: "pending",
    decidedBy: null,
    reason: null,
    updatedAt: now,
  }
}

export function decideExecutionApproval(
  approval: ExecutionApproval,
  approved: boolean,
  reason: string | null,
  now = new Date().toISOString(),
): ExecutionApproval {
  return {
    ...approval,
    status: approved ? "approved" : "rejected",
    decidedBy: "PM",
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
    updatedAt: now,
  }
}

export function recordExecutionResult(
  draft: WorkUnitDraft,
  target: ExecutionTarget,
  approval: ExecutionApproval,
  externalRef: string | null,
  now = new Date().toISOString(),
): ExecutionResultLog {
  const approved = approval.workUnitDraftId === draft.id && approval.target === target && approval.status === "approved"
  return {
    id: `${draft.id}:${target}:result:${now}`,
    workUnitDraftId: draft.id,
    target,
    status: approved ? (externalRef ? "succeeded" : "failed") : "pending_approval",
    message: approved ? (externalRef ? "Execution completed." : "Execution failed: missing externalRef.") : "Blocked: PM approval required.",
    externalRef: approved ? externalRef : null,
    createdAt: now,
  }
}

export function createCompletionCriteria(
  draft: WorkUnitDraft,
  logs: readonly ExecutionResultLog[] = [],
): CompletionCriteria {
  const doneWhen = ["PM approved required execution", "External execution result is logged", "All draft tasks are resolved"]
  const blockers = missingWorkUnitFields(draft)
  const isComplete = blockers.length === 0 && draft.tasks.length > 0 && logs.some((log) => log.status === "succeeded")
  return { workUnitDraftId: draft.id, doneWhen, blockers, isComplete }
}

function isExecutableDraft(draft: WorkUnitDraft): boolean {
  return draft.status === "accepted" && missingWorkUnitFields(draft).length === 0
}

function normalizeDeadline(deadline: string): string | null {
  const value = deadline.trim()
  return value && value !== "unspecified" ? value : null
}

function sourceTargets(draft: WorkUnitDraft): ("slack_reply" | "gmail_reply")[] {
  const ids = draft.sourceCandidateIds.join(" ")
  return [ids.includes("slack:") ? "slack_reply" : null, ids.includes("gmail:") ? "gmail_reply" : null].filter(
    (target): target is "slack_reply" | "gmail_reply" => !!target,
  )
}

function buildIssueBody(draft: WorkUnitDraft): string {
  return [
    `Situation: ${draft.situation}`,
    `Problem: ${draft.problem}`,
    `Next Action: ${draft.nextAction}`,
    `Deadline: ${draft.deadline}`,
    `Sources: ${draft.sources.join(", ")}`,
  ].join("\n")
}
