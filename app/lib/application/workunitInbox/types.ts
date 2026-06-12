/**
 * WorkUnit Inbox Types
 *
 * Defines the normalized signal and inbox WorkUnit models.
 * These are independent of raw external API responses.
 * Real integrations will produce NormalizedToolSignal objects.
 */

// ─── Providers ──────────────────────────────────────────────────

export type NormalizedToolProvider = "github" | "slack" | "calendar"

export type NormalizedToolSignalType =
  | "github_pr_review_requested"
  | "github_issue_assigned"
  | "github_issue_blocked"
  | "slack_mention_request"
  | "calendar_deadline"

// ─── Signal ─────────────────────────────────────────────────────

export type WorkUnitPriority = "low" | "medium" | "high"

export type NormalizedToolSignal = {
  id: string
  tenantId: string
  provider: NormalizedToolProvider
  signalType: NormalizedToolSignalType
  title: string
  summary: string
  sourceUrl?: string
  actor?: string
  assignee?: string
  repository?: string
  priorityHint?: WorkUnitPriority
  dueAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Inbox WorkUnit ─────────────────────────────────────────────

export type InboxWorkUnitKind =
  | "missed_response"
  | "review_waiting"
  | "blocker"
  | "deadline"
  | "assigned_issue"

export type InboxWorkUnitStatus =
  | "open"
  | "useful"
  | "not_useful"
  | "later"
  | "done"

export type InboxWorkUnit = {
  id: string
  signalId: string
  tenantId: string
  title: string
  kind: InboxWorkUnitKind
  priority: WorkUnitPriority
  sourceProvider: NormalizedToolProvider
  reason: string
  evidence: string
  nextAction: string
  sourceUrl?: string
  actor?: string
  assignee?: string
  repository?: string
  dueAt?: string
  createdAt: string
  status: InboxWorkUnitStatus
}
