/**
 * Signal → WorkUnit Transformation
 *
 * Deterministic mapping from NormalizedToolSignal to InboxWorkUnit.
 * No LLM, no external APIs — pure business logic.
 */

import type {
  NormalizedToolSignal,
  NormalizedToolSignalType,
  InboxWorkUnit,
  InboxWorkUnitKind,
  WorkUnitPriority,
} from "./types.ts"

// ─── Mapping ────────────────────────────────────────────────────

const SIGNAL_TO_KIND: Record<NormalizedToolSignalType, InboxWorkUnitKind> = {
  github_pr_review_requested: "review_waiting",
  github_issue_assigned: "assigned_issue",
  github_issue_blocked: "blocker",
  slack_mention_request: "missed_response",
  calendar_deadline: "deadline",
}

const DEFAULT_PRIORITY: Record<NormalizedToolSignalType, WorkUnitPriority> = {
  github_pr_review_requested: "high",
  github_issue_assigned: "medium",
  github_issue_blocked: "high",
  slack_mention_request: "medium",
  calendar_deadline: "high",
}

function resolvePriority(signal: NormalizedToolSignal): WorkUnitPriority {
  if (signal.priorityHint) return signal.priorityHint
  return DEFAULT_PRIORITY[signal.signalType] ?? "medium"
}

// ─── Evidence + Next Action ─────────────────────────────────────

function buildEvidenceAndAction(signal: NormalizedToolSignal): { evidence: string; nextAction: string } {
  switch (signal.signalType) {
    case "github_pr_review_requested":
      return {
        evidence: `PR "${signal.title}" is waiting for review`,
        nextAction: `Review PR: ${signal.title}`,
      }
    case "github_issue_blocked":
      return {
        evidence: `Blocked: ${signal.summary}`,
        nextAction: `Unblock or clarify blocker for ${signal.title}`,
      }
    case "github_issue_assigned":
      return {
        evidence: `Assigned to you: ${signal.summary}`,
        nextAction: `Start working on ${signal.title}`,
      }
    case "slack_mention_request":
      return {
        evidence: `${signal.actor ?? "Someone"} asked: "${signal.summary}"`,
        nextAction: `Respond to ${signal.actor ?? "the request"} on Slack`,
      }
    case "calendar_deadline":
      return {
        evidence: `Deadline approaching: ${signal.summary}`,
        nextAction: `Prepare for ${signal.title}`,
      }
  }
}

// ─── Transform ──────────────────────────────────────────────────

export function transformSignalToInboxWorkUnit(signal: NormalizedToolSignal): InboxWorkUnit {
  const kind = SIGNAL_TO_KIND[signal.signalType]
  const priority = resolvePriority(signal)
  const { evidence, nextAction } = buildEvidenceAndAction(signal)

  return {
    id: `wu:${signal.id}`,
    signalId: signal.id,
    tenantId: signal.tenantId,
    title: signal.title,
    kind,
    priority,
    sourceProvider: signal.provider,
    reason: kind.replace(/_/g, " "),
    evidence,
    nextAction,
    sourceUrl: signal.sourceUrl,
    actor: signal.actor,
    assignee: signal.assignee,
    repository: signal.repository,
    dueAt: signal.dueAt,
    createdAt: signal.createdAt,
    status: "open",
  }
}

export function transformSignalsToInboxWorkUnits(signals: NormalizedToolSignal[]): InboxWorkUnit[] {
  const priorityOrder: Record<WorkUnitPriority, number> = { high: 0, medium: 1, low: 2 }
  return signals
    .map(transformSignalToInboxWorkUnit)
    .sort((a, b) => {
      const pa = priorityOrder[a.priority]
      const pb = priorityOrder[b.priority]
      if (pa !== pb) return pa - pb
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}
