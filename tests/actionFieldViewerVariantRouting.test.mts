import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  deriveActionFieldViewerVariant,
  type ActionFieldViewerVariant,
} from "../app/lib/application/actionField/adoptedApprovalDrawerModel.ts"
import type {
  ActionTool,
  DetectedToolRequirement,
  ToolNecessity,
  ToolRequirementSummary,
} from "../app/lib/application/actionField/toolRequirementModel.ts"

const actionKindByTool: Record<ActionTool, DetectedToolRequirement["actionKind"]> = {
  slack: "slack_reply", github: "github_issue", email: "email_send",
  calendar: "calendar_create", database: "database_update",
}

function requirement(tool: ActionTool, necessity: ToolNecessity, reason = "test"): DetectedToolRequirement {
  return { tool, actionKind: actionKindByTool[tool], necessity, confidence: "high", reason }
}

function summary(overrides: Partial<Record<ActionTool, ToolNecessity>> = {}, databaseReason = "Database updates blocked by default."): ToolRequirementSummary {
  const allTools = (["slack", "github", "email", "calendar", "database"] as const).map((tool) =>
    requirement(tool, overrides[tool] ?? (tool === "calendar" || tool === "email" ? "not_needed" : tool === "database" ? "blocked" : "optional"), tool === "database" ? databaseReason : "test"),
  )
  const byTool = Object.fromEntries(allTools.map((tool) => [tool.tool, tool])) as Record<ActionTool, DetectedToolRequirement>
  const requiredTools = allTools.filter((tool) => tool.necessity === "required")
  const recommendedTools = allTools.filter((tool) => tool.necessity === "recommended")
  const reviewableTools = allTools.filter((tool) => tool.necessity === "required" || tool.necessity === "recommended" || tool.necessity === "blocked")
  return { ...byTool, primaryAction: requiredTools[0]?.actionKind ?? "slack_reply", allTools, requiredTools, recommendedTools, reviewableTools, allRequired: requiredTools }
}

function route(tools: ToolRequirementSummary): ActionFieldViewerVariant {
  return deriveActionFieldViewerVariant({ toolRequirements: tools })
}

test("routes all supported Action Field Viewer variants by precedence", () => {
  assert.equal(route(summary({ slack: "required", github: "required" })), "slack_github")
  assert.equal(route(summary({ calendar: "required", email: "recommended" })), "calendar_email")
  assert.equal(route(summary({ database: "blocked", email: "required" }, "Database mutation blocked.")), "db_email")
  assert.equal(route(summary({ email: "required" })), "email")
  assert.equal(route(summary({ database: "blocked" }, "Database mutation blocked.")), "database")
  assert.equal(route(summary({ slack: "required" })), "slack")
  assert.equal(route(summary()), "fallback")
})

test("composite variants beat single-action variants", () => {
  assert.equal(route(summary({ slack: "required", github: "recommended", email: "required" })), "slack_github")
  assert.equal(route(summary({ calendar: "recommended", email: "required", slack: "required" })), "calendar_email")
  assert.equal(route(summary({ database: "blocked", email: "recommended", slack: "required" }, "Database mutation blocked.")), "db_email")
})

test("adopted viewer source keeps approval-only wording and safety boundaries", async () => {
  const source = await readFile("app/components/workunit-os/adopted/AdoptedActionFieldPanel.tsx", "utf8")
  for (const key of ["slack_github", "calendar_email", "db_email", "email", "database", "slack"]) assert.equal(source.includes(key), true)
  for (const renderer of ["SlackGithubApprovalVariant", "CalendarEmailApprovalVariant", "DbEmailApprovalVariant", "EmailApprovalVariant", "DatabaseApprovalVariant", "SlackVariantContent"]) assert.equal(source.includes(renderer), true)
  assert.equal(source.includes("Approve and Send/Execute"), false)
  assert.equal(source.includes("Approve Draft"), true)
  assert.equal(source.includes("/api/workunit/tools"), false)
  assert.equal(source.includes("markApprovalUsed"), false)
  for (const forbidden of ["approvalId", "targetHash", "payloadHash", "tenantId", "userId", "approvedByUserId", "usedAt", "token", "secret", "rawPayload"]) assert.equal(source.includes(forbidden), false)
})
