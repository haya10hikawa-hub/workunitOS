/**
 * Adopted Approval Drawer Variant Model
 *
 * Pure functions that map safe WorkUnit metadata to approval drawer
 * display variants. No React, no D1, no hashes, no secrets.
 */

import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"
import type { ToolRequirementSummary } from "./toolRequirementModel"

export type ApprovalDrawerVariant =
  | "db_email"
  | "slack_github"
  | "calendar_email"
  | "slack"
  | "database"
  | "email"

export type ActionFieldViewerVariant = ApprovalDrawerVariant | "fallback"

export type ApprovalDrawerVariantInfo = {
  variant: ApprovalDrawerVariant
  title: string
  actions: ApprovalDrawerActionInfo[]
}

export type ApprovalDrawerActionInfo = {
  label: string
  icon: string
  accent: string
  destinationLabel: string
  destination: string
  primaryField: string
  tags: string[]
  bodyPreview: string
}

const VARIANT_TITLES: Record<ApprovalDrawerVariant, string> = {
  db_email: "DB/Email連携 承認ドロワー詳細",
  slack_github: "Slack/GitHub連携 承認ドロワー詳細",
  calendar_email: "Calendar/Email連携 承認ドロワー詳細",
  slack: "Slack返信 承認ドロワー詳細",
  database: "Database更新 承認ドロワー詳細",
  email: "Email送信 承認ドロワー詳細",
}

export function deriveApprovalDrawerVariant(wu: InboxWorkUnit): ApprovalDrawerVariant {
  const sp = wu.sourceProvider as string
  const repo = wu.repository
  const na = wu.nextAction?.toLowerCase() ?? ""

  // Composite: Slack + GitHub
  if (sp === "slack" && repo) return "slack_github"
  if (sp === "github" && (na.includes("reply") || na.includes("slack"))) return "slack_github"

  // Composite: Calendar + Email
  if (sp === "calendar") return "calendar_email"
  if (na.includes("calendar") || na.includes("deadline") || na.includes("schedule")) return "calendar_email"

  // Single: Slack
  if (sp === "slack") return "slack"
  if (na.includes("respond") || na.includes("reply")) return "slack"

  // Single: Email
  if (sp === "email" || sp === "gmail") return "email"
  if (na.includes("email") || na.includes("send")) return "email"

  // Single: Database
  if (sp === "notion" || na.includes("database") || na.includes("mutation") || na.includes("upsert")) return "database"

  // Composite: DB + Email (internal task / note with email notification)
  if (repo && na.includes("email")) return "db_email"

  // Default
  return "slack"
}

export function buildApprovalDrawerVariantInfo(wu: InboxWorkUnit): ApprovalDrawerVariantInfo {
  const variant = deriveApprovalDrawerVariant(wu)
  return {
    variant,
    title: VARIANT_TITLES[variant],
    actions: buildActionInfos(variant, wu),
  }
}

function buildActionInfos(variant: ApprovalDrawerVariant, wu: InboxWorkUnit): ApprovalDrawerActionInfo[] {
  switch (variant) {
    case "slack_github":
      return [
        buildSlackAction(wu),
        buildGitHubAction(wu),
      ]
    case "calendar_email":
      return [
        buildCalendarAction(wu),
        buildEmailAction(wu),
      ]
    case "db_email":
      return [
        buildDatabaseAction(wu),
        buildEmailAction(wu),
      ]
    case "slack":
      return [buildSlackAction(wu)]
    case "email":
      return [buildEmailAction(wu)]
    case "database":
      return [buildDatabaseAction(wu)]
  }
}

function buildSlackAction(wu: InboxWorkUnit): ApprovalDrawerActionInfo {
  return {
    label: "Slack Thread Reply",
    icon: "SL",
    accent: "#69ff47",
    destinationLabel: "Channel / Thread",
    destination: "#mcp-review",
    primaryField: "Reply Preview",
    tags: ["reply", "owner-confirm", "visible-to-channel"],
    bodyPreview: wu.evidence ?? wu.reason ?? "",
  }
}

function buildGitHubAction(wu: InboxWorkUnit): ApprovalDrawerActionInfo {
  return {
    label: "GitHub Issue",
    icon: "GH",
    accent: "#5aa7f7",
    destinationLabel: "Repository",
    destination: wu.repository ?? "WorkUnit/Core-Platform",
    primaryField: "Issue Title",
    tags: ["workunit-auto", "high-priority"],
    bodyPreview: wu.title ?? "",
  }
}

function buildCalendarAction(wu: InboxWorkUnit): ApprovalDrawerActionInfo {
  return {
    label: "Calendar Event",
    icon: "CL",
    accent: "#ff6b6b",
    destinationLabel: "Calendar",
    destination: "Primary Calendar",
    primaryField: "Event Title",
    tags: ["deadline", "schedule"],
    bodyPreview: wu.title ?? "",
  }
}

function buildEmailAction(wu: InboxWorkUnit): ApprovalDrawerActionInfo {
  return {
    label: "Email Notification",
    icon: "EM",
    accent: "#ffb454",
    destinationLabel: "Recipients",
    destination: wu.actor ?? "team@example.com",
    primaryField: "Subject",
    tags: ["customer-facing", "approval-required"],
    bodyPreview: wu.evidence ?? wu.reason ?? "",
  }
}

function buildDatabaseAction(wu: InboxWorkUnit): ApprovalDrawerActionInfo {
  return {
    label: "Database Update",
    icon: "DB",
    accent: "#b8ff9b",
    destinationLabel: "Connection / Table",
    destination: "D1: workunit_os",
    primaryField: "Mutation",
    tags: ["write", "audit-log", "rollback-ready"],
    bodyPreview: wu.title ?? "",
  }
}

// ─── Tool-based variant derivation ──────────────────────────

export function deriveVariantFromTools(tools: ToolRequirementSummary): ApprovalDrawerVariant {
  const variant = deriveActionFieldViewerVariant({ toolRequirements: tools })
  return variant === "fallback" ? "slack" : variant
}

export function deriveActionFieldViewerVariant(params: {
  readonly toolRequirements: ToolRequirementSummary
}): ActionFieldViewerVariant {
  const { toolRequirements: tools } = params
  const slack = isReviewable(tools, "slack")
  const github = isReviewable(tools, "github")
  const calendar = isReviewable(tools, "calendar")
  const email = isReviewable(tools, "email")
  const database = isActiveDatabaseReview(tools)

  if (slack && github) return "slack_github"
  if (calendar && email) return "calendar_email"
  if (database && email) return "db_email"
  if (email) return "email"
  if (database) return "database"
  if (slack) return "slack"
  return "fallback"
}

function isReviewable(tools: ToolRequirementSummary, tool: ToolRequirementSummary["allTools"][number]["tool"]): boolean {
  return tools.reviewableTools.some((req) => req.tool === tool)
}

function isActiveDatabaseReview(tools: ToolRequirementSummary): boolean {
  if (!isReviewable(tools, "database")) return false
  if (tools.database.necessity !== "blocked") return true
  return !tools.database.reason.toLowerCase().includes("blocked by default")
}
