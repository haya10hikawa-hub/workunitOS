import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"

export type ActionTool = "slack" | "github" | "email" | "calendar" | "database"
export type ToolNecessity = "required" | "recommended" | "optional" | "not_needed" | "blocked"
export type ToolActionKind = "slack_reply" | "github_issue" | "email_send" | "calendar_create" | "database_update"

export type DetectedToolRequirement = {
  readonly tool: ActionTool
  readonly actionKind: ToolActionKind
  readonly necessity: ToolNecessity
  readonly confidence: "high" | "medium" | "low"
  readonly reason: string
}

export type ToolRequirementSummary = {
  readonly slack: DetectedToolRequirement
  readonly github: DetectedToolRequirement
  readonly email: DetectedToolRequirement
  readonly calendar: DetectedToolRequirement
  readonly database: DetectedToolRequirement
  readonly primaryAction: ToolActionKind
  readonly allRequired: readonly DetectedToolRequirement[]
}

export function detectToolRequirements(wu: InboxWorkUnit): ToolRequirementSummary {
  const sp = wu.sourceProvider as string
  const na = wu.nextAction?.toLowerCase() ?? ""
  const kind = wu.kind
  const title = wu.title.toLowerCase()

  const slack = detectSlack(wu, sp, na, kind)
  const github = detectGitHub(wu, sp, na, kind, title)
  const email = detectEmail(wu, sp, na, kind)
  const calendar = detectCalendar(wu, sp, na, kind)
  const database = detectDatabase(wu, sp, na)

  const all = [slack, github, email, calendar, database]
  const required = all.filter((t) => t.necessity === "required")
  const primary = required[0]?.actionKind ?? slack.actionKind
  return { slack, github, email, calendar, database, primaryAction: primary, allRequired: required }
}

function detectSlack(
  _wu: InboxWorkUnit, sp: string, na: string, kind: string,
): DetectedToolRequirement {
  if (sp === "slack") return { tool: "slack", actionKind: "slack_reply", necessity: "required", confidence: "high", reason: "Slack source detected." }
  if (na.includes("respond") || na.includes("reply") || na.includes("slack")) return { tool: "slack", actionKind: "slack_reply", necessity: "required", confidence: "medium", reason: "Reply action implied." }
  if (kind === "missed_response") return { tool: "slack", actionKind: "slack_reply", necessity: "recommended", confidence: "medium", reason: "Missed response WorkUnit." }
  return { tool: "slack", actionKind: "slack_reply", necessity: "optional", confidence: "low", reason: "No Slack signals detected." }
}

function detectGitHub(
  _wu: InboxWorkUnit, sp: string, na: string, kind: string,
): DetectedToolRequirement {
  if (sp === "github" && (_wu.repository || kind === "blocker" || kind === "assigned_issue")) return { tool: "github", actionKind: "github_issue", necessity: "required", confidence: "high", reason: "GitHub WorkUnit — issue tracking needed." }
  if (na.includes("issue") || na.includes("pr")) return { tool: "github", actionKind: "github_issue", necessity: "recommended", confidence: "medium", reason: "Issue/PR action implied." }
  if (_wu.repository) return { tool: "github", actionKind: "github_issue", necessity: "recommended", confidence: "medium", reason: "Repository present — GitHub recommended." }
  return { tool: "github", actionKind: "github_issue", necessity: "optional", confidence: "low", reason: "No GitHub signals." }
}

function detectEmail(
  _wu: InboxWorkUnit, sp: string, na: string, kind: string,
): DetectedToolRequirement {
  if (sp === "email" || sp === "gmail") return { tool: "email", actionKind: "email_send", necessity: "required", confidence: "high", reason: "Email source detected." }
  if (na.includes("email") || na.includes("notify") || na.includes("send")) return { tool: "email", actionKind: "email_send", necessity: "recommended", confidence: "medium", reason: "Notification action implied." }
  if (kind === "deadline" && sp === "calendar") return { tool: "email", actionKind: "email_send", necessity: "recommended", confidence: "medium", reason: "Calendar deadline — email notification recommended." }
  return { tool: "email", actionKind: "email_send", necessity: "optional", confidence: "low", reason: "No email signals." }
}

function detectCalendar(
  _wu: InboxWorkUnit, sp: string, na: string, kind: string,
): DetectedToolRequirement {
  if (sp === "calendar") return { tool: "calendar", actionKind: "calendar_create", necessity: "required", confidence: "high", reason: "Calendar source detected." }
  if (kind === "deadline" && _wu.dueAt) return { tool: "calendar", actionKind: "calendar_create", necessity: "recommended", confidence: "medium", reason: "Deadline with due date." }
  if (na.includes("calendar") || na.includes("schedule") || na.includes("deadline")) return { tool: "calendar", actionKind: "calendar_create", necessity: "recommended", confidence: "medium", reason: "Schedule action implied." }
  return { tool: "calendar", actionKind: "calendar_create", necessity: "not_needed", confidence: "high", reason: "No calendar signals." }
}

function detectDatabase(
  _wu: InboxWorkUnit, sp: string, na: string,
): DetectedToolRequirement {
  if (sp === "notion" || na.includes("mutation") || na.includes("upsert")) return { tool: "database", actionKind: "database_update", necessity: "blocked", confidence: "high", reason: "Database mutation blocked." }
  return { tool: "database", actionKind: "database_update", necessity: "blocked", confidence: "high", reason: "Database updates blocked by default." }
}
