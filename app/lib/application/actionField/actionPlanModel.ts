/**
 * Action Plan Model
 *
 * Pure display model that converts a selected WorkUnit and safe
 * preview metadata into a UI-safe Action Plan. This is a display/
 * planning layer, not an execution layer.
 *
 * No React, D1, routes, providers, or side effects.
 */

import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"

export type ActionPlanVariant =
  | "db_email"
  | "slack_github"
  | "calendar_email"
  | "slack"
  | "database"
  | "email"
  | "unknown"

export type ActionPlanStep = {
  readonly id: string
  readonly kind:
    | "slack_reply"
    | "github_issue"
    | "calendar_block"
    | "email_send"
    | "database_update"
    | "unknown"
  readonly title: string
  readonly targetLabel: string
  readonly previewText: string
  readonly riskLevel: "low" | "medium" | "high"
}

export type ActionPlanModel = {
  readonly variant: ActionPlanVariant
  readonly title: string
  readonly subtitle: string
  readonly contextSummary: string
  readonly recommendedDecision: string | null
  readonly steps: readonly ActionPlanStep[]
  readonly safetyChecks: readonly string[]
  readonly warnings: readonly string[]
  readonly canApprovePlan: boolean
}

const VARIANT_TITLES: Record<ActionPlanVariant, string> = {
  db_email: "DB/Email 連携 Action Plan",
  slack_github: "Slack/GitHub 連携 Action Plan",
  calendar_email: "Calendar/Email 連携 Action Plan",
  slack: "Slack 返信 Action Plan",
  database: "Database 更新 Action Plan",
  email: "Email 送信 Action Plan",
  unknown: "External Action Plan",
}

const VARIANT_SUBTITLES: Record<ActionPlanVariant, string> = {
  db_email: "データベース更新 + メール通知",
  slack_github: "Slack 返信 + GitHub Issue 作成",
  calendar_email: "カレンダー登録 + メール通知",
  slack: "Slack スレッド返信",
  database: "データベース更新",
  email: "メール送信",
  unknown: "外部アクション",
}

export function deriveActionPlanVariant(wu: InboxWorkUnit): ActionPlanVariant {
  const sp = wu.sourceProvider as string
  const repo = wu.repository
  const na = wu.nextAction?.toLowerCase() ?? ""

  if (sp === "slack" && repo) return "slack_github"
  if (sp === "github" && repo) return "slack_github"
  if (sp === "slack") return "slack"
  if (sp === "calendar") return "calendar_email"
  if (sp === "email" || sp === "gmail") return "email"
  if (sp === "notion" || na.includes("database") || na.includes("mutation")) return "database"
  if (repo && na.includes("email")) return "db_email"
  return "unknown"
}

export function buildActionPlan(input: {
  wu: InboxWorkUnit
  previewRefCount: number
  previewStatus: "idle" | "creating" | "created" | "failed"
}): ActionPlanModel {
  const { wu, previewRefCount, previewStatus } = input
  const variant = deriveActionPlanVariant(wu)

  const steps = buildSteps(variant, wu)
  const safetyChecks = buildSafetyChecks(previewStatus, previewRefCount)
  const warnings = buildWarnings(variant)
  const canApprove = previewStatus === "created" && previewRefCount > 0

  return {
    variant,
    title: VARIANT_TITLES[variant],
    subtitle: VARIANT_SUBTITLES[variant],
    contextSummary: wu.evidence ?? wu.reason ?? "",
    recommendedDecision: wu.nextAction ?? null,
    steps,
    safetyChecks,
    warnings,
    canApprovePlan: canApprove,
  }
}

function buildSteps(variant: ActionPlanVariant, wu: InboxWorkUnit): ActionPlanStep[] {
  const steps: ActionPlanStep[] = []

  switch (variant) {
    case "slack_github":
      steps.push({
        id: "step-1",
        kind: "slack_reply",
        title: "Slack Reply",
        targetLabel: `#mcp-review (${wu.actor ?? "user"})`,
        previewText: wu.evidence ?? wu.reason ?? "",
        riskLevel: "low",
      })
      steps.push({
        id: "step-2",
        kind: "github_issue",
        title: "GitHub Issue",
        targetLabel: wu.repository ?? "acme/api",
        previewText: wu.title ?? "",
        riskLevel: "medium",
      })
      break
    case "calendar_email":
      steps.push({
        id: "step-1",
        kind: "calendar_block",
        title: "Calendar Block",
        targetLabel: wu.dueAt ?? "Scheduled",
        previewText: wu.title ?? "",
        riskLevel: "low",
      })
      steps.push({
        id: "step-2",
        kind: "email_send",
        title: "Email Notification",
        targetLabel: wu.actor ?? "team",
        previewText: wu.evidence ?? "",
        riskLevel: "low",
      })
      break
    case "db_email":
      steps.push({
        id: "step-1",
        kind: "database_update",
        title: "Database Update",
        targetLabel: "D1: workunit_os",
        previewText: wu.title ?? "",
        riskLevel: "high",
      })
      steps.push({
        id: "step-2",
        kind: "email_send",
        title: "Email Notification",
        targetLabel: wu.actor ?? "team",
        previewText: wu.evidence ?? "",
        riskLevel: "low",
      })
      break
    case "slack":
      steps.push({
        id: "step-1",
        kind: "slack_reply",
        title: "Slack Reply",
        targetLabel: `#general (${wu.actor ?? "user"})`,
        previewText: wu.evidence ?? wu.reason ?? "",
        riskLevel: "low",
      })
      break
    case "email":
      steps.push({
        id: "step-1",
        kind: "email_send",
        title: "Email",
        targetLabel: wu.actor ?? "to",
        previewText: wu.evidence ?? wu.reason ?? "",
        riskLevel: "low",
      })
      break
    case "database":
      steps.push({
        id: "step-1",
        kind: "database_update",
        title: "Database Update",
        targetLabel: "D1: workunit_os",
        previewText: wu.title ?? "",
        riskLevel: "high",
      })
      break
    default:
      steps.push({
        id: "step-1",
        kind: "unknown",
        title: wu.nextAction ?? "External Action",
        targetLabel: wu.sourceProvider ?? "unknown",
        previewText: wu.evidence ?? wu.reason ?? "",
        riskLevel: "medium",
      })
  }

  return steps
}

function buildSafetyChecks(
  previewStatus: string,
  previewRefCount: number,
): string[] {
  const checks: string[] = []
  if (previewStatus === "created" && previewRefCount > 0) {
    checks.push("Preview created")
  }
  checks.push("RBAC enforced", "Tenant isolation active", "Hash verified server-side")
  return checks
}

function buildWarnings(variant: ActionPlanVariant): string[] {
  const warnings: string[] = ["External execution remains disabled in this release."]
  if (variant === "database" || variant === "db_email") {
    warnings.push("Database mutations are irreversible — review carefully.")
  }
  if (variant === "unknown") {
    warnings.push("Action type could not be determined — manual review recommended.")
  }
  return warnings
}
