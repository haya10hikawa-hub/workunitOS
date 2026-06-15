import type { DashboardPreviewGroup } from "@/lib/application/actionField/dashboardPreviewClient"

export type DashboardWorkUnitStatus = "READY" | "NEEDS REVIEW" | "BLOCKED" | "DRAFT" | "ERROR"
export type DashboardGateState = "completed" | "incomplete" | "blocked"

export type DashboardWorkUnit = {
  id: string
  source: "slack" | "email" | "jira" | "calendar" | "news" | "salesforce"
  title: string
  roi: number
  status: DashboardWorkUnitStatus
}

export type DashboardReadinessGate = {
  label: string
  state: DashboardGateState
}

export type DashboardTraceLog = {
  level: "INFO" | "READY" | "NEEDS REVIEW" | "NEEDS OWNER" | "NOT READY" | "STATUS" | "ACTION"
  message: string
  time: string
}

export type DashboardEvidenceCapsule = {
  provider: string
  target: string
  summary: string
  confidence: "High" | "Medium" | "Low"
}

export const dashboardWorkUnits: DashboardWorkUnit[] = [
  { id: "enterprise-update", source: "slack", title: "Enterprise Update Response Pack", roi: 92.0, status: "READY" },
  { id: "client-x-delta", source: "email", title: "Client X Project Delta Feedback", roi: 88.5, status: "NEEDS REVIEW" },
  { id: "bug-1045", source: "jira", title: "BUG-1045 - Authentication Failure", roi: 84.0, status: "BLOCKED" },
  { id: "qbr", source: "calendar", title: "Quarterly Business Review", roi: 79.0, status: "DRAFT" },
  { id: "competitor-launch", source: "news", title: "Competitor Product Launch", roi: 78.5, status: "READY" },
  { id: "salesforce-error", source: "salesforce", title: "Salesforce Integration Error", roi: 0.0, status: "ERROR" },
]

export const decisionOptions = ["Accept", "Defer", "Reject", "Ask Owner"] as const

export const evidenceCapsule: DashboardEvidenceCapsule = {
  provider: "Slack",
  target: "Slack / #enterprise-updates",
  summary: "Hey @channel, roadmap update signals Phase 1-3 this week.",
  confidence: "High",
}

export function getReadinessGates(previewReady: boolean, approved: boolean): DashboardReadinessGate[] {
  return [
    { label: "Source Verified", state: "completed" },
    { label: "Owner Confirmed", state: "completed" },
    { label: "Decision Selected", state: "incomplete" },
    { label: "Action Preview Created", state: previewReady ? "completed" : "incomplete" },
    { label: "Approval Completed", state: approved ? "completed" : "incomplete" },
    { label: "External Execution Allowed", state: previewReady && approved ? "incomplete" : "blocked" },
  ]
}

export function isExternalExecutionBlocked(gates: DashboardReadinessGate[]): boolean {
  return gates.some((gate) => gate.label !== "External Execution Allowed" && gate.state !== "completed")
}

export function getDecisionTraceLogs(): DashboardTraceLog[] {
  return [
    { level: "INFO", message: "Decomposed Push Candidates initialized.", time: "10:39:01 AM" },
    { level: "READY", message: "1. Verify Source Info (Owner: PM | This Week)", time: "10:39:04 AM" },
    { level: "NEEDS REVIEW", message: "2. Confirm Owner (Owner: PM | This Week)", time: "10:39:07 AM" },
    { level: "NEEDS OWNER", message: "3. Determine Acceptance (Owner: PM | This Week)", time: "10:39:10 AM" },
    { level: "NOT READY", message: "4. Prepare External Action (Owner: PM | Next Week)", time: "10:39:12 AM" },
    { level: "STATUS", message: "Execution blocked until action preview is created", time: "10:39:14 AM" },
    { level: "STATUS", message: "and approval is completed.", time: "10:39:14 AM" },
    { level: "ACTION", message: "Awaiting user decision...", time: "10:39:15 AM" },
  ]
}

/**
 * Legacy / demo-only preview group for the deprecated ActionFieldEntryPanel.
 *
 * NOT used in the active dashboard CTA path. The adopted dashboard derives its
 * preview group from the selected real WorkUnit via
 * {@link buildPreviewGroupFromSelectedWorkUnit} in selectedWorkUnitPreviewModel.ts.
 *
 * @deprecated Use {@link buildPreviewGroupFromSelectedWorkUnit} for live previews.
 *             This function remains only for tests and the legacy ActionFieldEntryPanel.
 */
export function getPrimaryActionPreviewGroup(): DashboardPreviewGroup {
  return {
    workUnitId: "WU-20250608-001",
    workUnitTitle: "Enterprise Update Response Pack",
    source: evidenceCapsule.target,
    actions: [
      {
        id: "action-slack-enterprise-update",
        type: "slack_reply",
        tool: "slack",
        title: "Prepare Slack reply for enterprise update response.",
        fields: {
          target: evidenceCapsule.target,
          messagePreview: evidenceCapsule.summary,
          messageBody: "Roadmap update signals Phase 1-3 this week. Preparing response pack for PM approval.",
        },
      },
    ],
  }
}
