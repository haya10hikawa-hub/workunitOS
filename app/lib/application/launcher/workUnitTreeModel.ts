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
  const title = workUnit?.title ?? "No WorkUnit selected"
  const center = node("center", title, "subtasks", 50, 50, "primary")

  return {
    center,
    groups: [
      group("sources", "Sources", [
        node("source-primary", workUnit?.source ?? "Fallback source", "sources", 22, 22, "ready"),
        node("source-owner", workUnit?.ownerLabel ?? "PM", "sources", 36, 16, "muted"),
      ]),
      group("subtasks", "Subtasks", [
        node("subtask-review", "Review context", "subtasks", 62, 18, "ready"),
        node("subtask-decision", "PM decision", "subtasks", 76, 30, "review"),
      ]),
      group("evidence", "Evidence", [
        node("evidence-summary", truncate(workUnit?.summary ?? "Sample evidence", 26), "evidence", 78, 58, "muted"),
      ]),
      group("drafts", "Drafts", [
        node("draft-local", "Editable draft", "drafts", 62, 82, "review"),
      ]),
      group("dependencies", "Dependencies", [
        node("dependency-owner", `${workUnit?.priority ?? "medium"} priority`, "dependencies", 34, 84, "muted"),
      ]),
      group("approval_context", "Approval Context", [
        node("approval-boundary", "Boundary not wired", "approval_context", 20, 58, "muted"),
      ]),
    ],
    legend: ["central WorkUnit", "safe source context", "editable local draft", "PM boundary"],
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

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value
}
