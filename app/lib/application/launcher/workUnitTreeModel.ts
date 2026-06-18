import type { LauncherWorkUnit } from "./workUnitSelectionModel.ts"

export type WorkUnitTreeGroupId =
  | "sources"
  | "subtasks"
  | "evidence"
  | "drafts"
  | "dependencies"
  | "approval_context"

export type WorkUnitTreeNode = {
  readonly id: string
  readonly label: string
  readonly groupId: WorkUnitTreeGroupId
  readonly x: number
  readonly y: number
  readonly tone: "primary" | "ready" | "review" | "muted"
}

export type WorkUnitTreeGroup = {
  readonly id: WorkUnitTreeGroupId
  readonly title: string
  readonly nodes: readonly WorkUnitTreeNode[]
}

export type WorkUnitTreeMap = {
  readonly center: WorkUnitTreeNode
  readonly groups: readonly WorkUnitTreeGroup[]
  readonly legend: readonly string[]
}

export function deriveWorkUnitTreeMap(workUnit: LauncherWorkUnit | null): WorkUnitTreeMap {
  const title = workUnit?.title ?? "Quarterly review presentation"
  const center = node("center", title, "subtasks", 50, 50, "primary")

  return {
    center,
    groups: [
      group("sources", "Sources", [
        node("source-report", "Quarterly Report Q2 (Sales & Revenue)", "sources", 51, 18, "ready"),
        node("source-feedback", "Customer Feedback Analysis (May)", "sources", 51, 23, "muted"),
        node("source-trend", "Market Trend Overview Q2", "sources", 51, 28, "muted"),
        node("source-roadmap", "Product Roadmap 2024 Q3-Q4", "sources", 51, 33, "review"),
      ]),
      group("subtasks", "Subtasks", [
        node("subtask-pr", "PR #289 Admin dashboard", "subtasks", 18, 38, "ready"),
        node("subtask-audit", "Audit system migration", "subtasks", 18, 43, "muted"),
        node("subtask-config", "Slack review deployment config", "subtasks", 18, 48, "muted"),
        node("subtask-customer", "Customer feedback analysis", "subtasks", 18, 53, "muted"),
        node("subtask-slides", "Slides & speaker notes", "subtasks", 18, 58, "review"),
        node("subtask-rehearsal", "Dry-run rehearsal", "subtasks", 18, 63, "review"),
      ]),
      group("evidence", "Evidence", [
        node("evidence-kpi", "KPI Dashboard (Q2)", "evidence", 21, 68, "ready"),
        node("evidence-nps", "NPS Trend Report", "evidence", 21, 73, "muted"),
        node("evidence-support", "Support Ticket Analysis", "evidence", 21, 78, "review"),
        node("evidence-competitive", "Competitive Landscape", "evidence", 21, 83, "review"),
        node("evidence-quotes", "Customer Quotes", "evidence", 21, 88, "review"),
      ]),
      group("drafts", "Drafts", [
        node("draft-slide", "Slide Deck (v3)", "drafts", 50, 76, "ready"),
        node("draft-speaker", "Speaker Notes (v2)", "drafts", 50, 81, "muted"),
        node("draft-summary", "Executive Summary (v1)", "drafts", 50, 86, "review"),
      ]),
      group("dependencies", "Dependencies", [
        node("dependency-docs", "PR #301 Update docs", "dependencies", 77, 67, "ready"),
        node("dependency-email", "Email draft (Exec team)", "dependencies", 77, 72, "muted"),
        node("dependency-design", "Design system update", "dependencies", 77, 77, "muted"),
        node("dependency-legal", "Legal review (TBD)", "dependencies", 77, 82, "review"),
      ]),
      group("approval_context", "Approval Context", [
        node("approval-purpose", "Purpose & Goal", "approval_context", 78, 39, "ready"),
        node("approval-audience", "Audience", "approval_context", 78, 44, "ready"),
        node("approval-criteria", "Decision Criteria", "approval_context", 78, 49, "ready"),
        node("approval-risks", "Risks & Concerns", "approval_context", 78, 54, "review"),
        node("approval-stakeholders", "Stakeholders", "approval_context", 78, 59, "muted"),
      ]),
    ],
    legend: ["Current", "Source", "Subtask", "Evidence", "Context", "Dependency", "Draft"],
  }
}

function group(id: WorkUnitTreeGroupId, title: string, nodes: readonly WorkUnitTreeNode[]): WorkUnitTreeGroup {
  return { id, title, nodes }
}

function node(
  id: string,
  label: string,
  groupId: WorkUnitTreeGroupId,
  x: number,
  y: number,
  tone: WorkUnitTreeNode["tone"],
): WorkUnitTreeNode {
  return {
    id,
    label,
    groupId,
    x: clampPercent(x),
    y: clampPercent(y),
    tone,
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(Math.max(value, 10), 90)
}
