/**
 * Action Draft Model
 *
 * Pure functions that build editable local action drafts from
 * detected tool requirements and WorkUnit context.
 *
 * Drafts are local-only in this PR — no server payload integration.
 * Editable fields can be modified in the UI without affecting
 * preview/approval state.
 *
 * No React, D1, routes, providers, or side effects.
 */

import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"
import type { DetectedToolRequirement, ToolActionKind } from "./toolRequirementModel"

export type EditableActionDraftField = {
  readonly key: string
  readonly label: string
  readonly kind: "text" | "textarea" | "code" | "datetime" | "recipients" | "tags"
  readonly value: string
  readonly required: boolean
}

export type LockedActionDraftField = {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly reason: string
}

export type ActionDraft = {
  readonly id: string
  readonly tool: string
  readonly actionKind: ToolActionKind
  readonly title: string
  readonly necessity: string
  readonly editableFields: readonly EditableActionDraftField[]
  readonly lockedFields: readonly LockedActionDraftField[]
  readonly safetyNotes: readonly string[]
  readonly contextUsed: readonly string[]
  readonly dirty: boolean
}

export type ActionDraftSet = {
  readonly drafts: readonly ActionDraft[]
  readonly primaryDraft: ActionDraft | null
}

export function buildActionDrafts(
  wu: InboxWorkUnit,
  requirements: readonly DetectedToolRequirement[],
): ActionDraftSet {
  const drafts = requirements
    .filter((r) => r.necessity === "required" || r.necessity === "recommended" || r.necessity === "blocked")
    .map((r) => buildSingleDraft(wu, r))

  return {
    drafts,
    primaryDraft: drafts.find((d) => d.necessity === "required") ?? drafts[0] ?? null,
  }
}

function buildSingleDraft(
  wu: InboxWorkUnit,
  req: DetectedToolRequirement,
): ActionDraft {
  switch (req.actionKind) {
    case "slack_reply": return buildSlackDraft(wu, req)
    case "github_issue": return buildGitHubDraft(wu, req)
    case "email_send": return buildEmailDraft(wu, req)
    case "calendar_create": return buildCalendarDraft(wu, req)
    case "database_update": return buildDatabaseDraft(wu, req)
  }
}

function buildSlackDraft(wu: InboxWorkUnit, req: DetectedToolRequirement): ActionDraft {
  return {
    id: "draft-slack",
    tool: "slack",
    actionKind: "slack_reply",
    title: "Slack Reply",
    necessity: req.necessity,
    editableFields: [
      { key: "message", label: "Message", kind: "textarea", value: wu.nextAction ?? wu.reason ?? "", required: true },
      { key: "channel", label: "Channel", kind: "text", value: "#general", required: false },
    ],
    lockedFields: [
      { key: "source", label: "Source", value: wu.sourceProvider ?? "slack", reason: "Derived from WorkUnit." },
      { key: "action_type", label: "Action Type", value: "slack_reply", reason: "Tool-detected." },
    ],
    safetyNotes: ["Slack reply has no external side effects — preview and approve before sending."],
    contextUsed: [wu.title ?? "", wu.evidence ?? ""],
    dirty: false,
  }
}

function buildGitHubDraft(wu: InboxWorkUnit, req: DetectedToolRequirement): ActionDraft {
  return {
    id: "draft-github",
    tool: "github",
    actionKind: "github_issue",
    title: "GitHub Issue",
    necessity: req.necessity,
    editableFields: [
      { key: "issue_title", label: "Issue Title", kind: "text", value: wu.title ?? "", required: true },
      { key: "issue_body", label: "Issue Body", kind: "textarea", value: wu.evidence ?? wu.reason ?? "", required: true },
    ],
    lockedFields: [
      { key: "repo", label: "Repository", value: wu.repository ?? "acme/api", reason: "Derived from WorkUnit." },
      { key: "action_type", label: "Action Type", value: "github_issue", reason: "Tool-detected." },
    ],
    safetyNotes: ["GitHub issue creation delayed — external execution disabled in this release."],
    contextUsed: [wu.title ?? "", wu.repository ?? ""],
    dirty: false,
  }
}

function buildEmailDraft(wu: InboxWorkUnit, req: DetectedToolRequirement): ActionDraft {
  return {
    id: "draft-email",
    tool: "email",
    actionKind: "email_send",
    title: "Email",
    necessity: req.necessity,
    editableFields: [
      { key: "subject", label: "Subject", kind: "text", value: wu.title ?? "", required: true },
      { key: "body", label: "Body", kind: "textarea", value: wu.evidence ?? wu.reason ?? "", required: true },
      { key: "recipients", label: "Recipients", kind: "recipients", value: wu.actor ?? "", required: false },
    ],
    lockedFields: [
      { key: "action_type", label: "Action Type", value: "email_send", reason: "Tool-detected." },
    ],
    safetyNotes: ["Email sending is disabled — approve only for audit record."],
    contextUsed: [wu.title ?? "", wu.actor ?? ""],
    dirty: false,
  }
}

function buildCalendarDraft(wu: InboxWorkUnit, req: DetectedToolRequirement): ActionDraft {
  return {
    id: "draft-calendar",
    tool: "calendar",
    actionKind: "calendar_create",
    title: "Calendar Event",
    necessity: req.necessity,
    editableFields: [
      { key: "event_title", label: "Event Title", kind: "text", value: wu.title ?? "", required: true },
      { key: "description", label: "Description", kind: "textarea", value: wu.evidence ?? wu.reason ?? "", required: false },
      { key: "due_date", label: "Due Date", kind: "datetime", value: wu.dueAt ?? "", required: false },
      { key: "attendees", label: "Attendees", kind: "text", value: wu.actor ?? "", required: false },
    ],
    lockedFields: [
      { key: "action_type", label: "Action Type", value: "calendar_create", reason: "Tool-detected." },
    ],
    safetyNotes: ["Calendar creation disabled — approve only for audit record."],
    contextUsed: [wu.title ?? "", wu.dueAt ?? ""],
    dirty: false,
  }
}

function buildDatabaseDraft(wu: InboxWorkUnit, req: DetectedToolRequirement): ActionDraft {
  return {
    id: "draft-database",
    tool: "database",
    actionKind: "database_update",
    title: "Database Update",
    necessity: req.necessity,
    editableFields: [
      { key: "mutation_note", label: "Mutation Note", kind: "textarea", value: wu.title ?? "", required: true },
    ],
    lockedFields: [
      { key: "action_type", label: "Action Type", value: "database_update", reason: "Tool-detected." },
    ],
    safetyNotes: [
      "Database mutations are blocked in this release.",
      "No database writes are performed.",
      "External execution remains disabled.",
    ],
    contextUsed: [wu.title ?? ""],
    dirty: false,
  }
}
