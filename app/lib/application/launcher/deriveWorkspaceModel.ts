/**
 * Workspace model — the layer between Command Palette selection and the Action
 * Field. It is candidate-only and purely derived from the selected WorkUnit and
 * the selected Node Canvas node. It carries no execution, approval, or forbidden
 * data; it only re-shapes already-safe launcher data for display.
 *
 *   Selection -> Workspace (root card + breadcrumb + selected node) -> Action Field
 */

import type { LauncherWorkUnit } from "./workUnitSelectionModel.ts"
import type { WorkUnitTreeMap, WorkUnitTreeNode } from "./workUnitTreeModel.ts"

export type WorkspaceStatusTone = NonNullable<LauncherWorkUnit["statusTone"]>

export type WorkspaceRootCard = {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly source: string
  readonly sourceDetail: string
  readonly status: string
  readonly statusTone: WorkspaceStatusTone
  readonly roi: number
  readonly ownerLabel: string
  readonly urgency: string
  readonly candidateOnly: true
  readonly humanReviewRequired: true
}

export type WorkspaceBreadcrumbItem = {
  readonly id: string
  readonly label: string
}

export type WorkspaceModel = {
  readonly rootCard: WorkspaceRootCard | null
  readonly breadcrumb: readonly WorkspaceBreadcrumbItem[]
  readonly selectedNodeId: string | null
  readonly selectedNodeLabel: string | null
  readonly candidateOnly: true
  readonly humanReviewRequired: true
}

/**
 * Find the node that should be treated as selected. Falls back to the canvas
 * center (the WorkUnit root) when no node id is provided or it is not found.
 */
export function resolveSelectedTreeNode(
  treeMap: WorkUnitTreeMap,
  selectedNodeId?: string | null,
): WorkUnitTreeNode {
  if (!selectedNodeId) return treeMap.center
  if (treeMap.center.id === selectedNodeId) return treeMap.center
  for (const group of treeMap.groups) {
    const match = group.nodes.find((node) => node.id === selectedNodeId)
    if (match) return match
  }
  return treeMap.center
}

export function deriveWorkspaceModel(
  workUnit: LauncherWorkUnit | null,
  treeMap: WorkUnitTreeMap,
  selectedNodeId?: string | null,
): WorkspaceModel {
  if (!workUnit) {
    return {
      rootCard: null,
      breadcrumb: [{ id: "workspace", label: "Workspace" }],
      selectedNodeId: null,
      selectedNodeLabel: null,
      candidateOnly: true,
      humanReviewRequired: true,
    }
  }

  const node = resolveSelectedTreeNode(treeMap, selectedNodeId)
  const isRoot = node.id === treeMap.center.id

  const rootCard: WorkspaceRootCard = {
    id: workUnit.id,
    title: workUnit.title,
    summary: workUnit.summary,
    source: workUnit.source,
    sourceDetail: workUnit.sourceDetail ?? `${workUnit.source} signal`,
    status: workUnit.status,
    statusTone: workUnit.statusTone ?? "gray",
    roi: workUnit.roi,
    ownerLabel: workUnit.ownerLabel,
    urgency: workUnit.urgency ?? "Normal priority",
    candidateOnly: true,
    humanReviewRequired: true,
  }

  const breadcrumb: WorkspaceBreadcrumbItem[] = [
    { id: "workspace", label: "Workspace" },
    { id: workUnit.id, label: workUnit.title },
  ]
  if (!isRoot) breadcrumb.push({ id: node.id, label: node.label })

  return {
    rootCard,
    breadcrumb,
    selectedNodeId: node.id,
    selectedNodeLabel: node.label,
    candidateOnly: true,
    humanReviewRequired: true,
  }
}
