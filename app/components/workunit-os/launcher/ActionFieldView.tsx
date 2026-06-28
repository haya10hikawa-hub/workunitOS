"use client"

import type { ActionFieldEditorDraft, LauncherReadinessCard } from "@/lib/application/launcher/actionFieldEditorDraftModel"
import type { WorkUnitTreeMap as WorkUnitTreeMapView } from "@/lib/application/launcher/workUnitTreeModel"
import type { LauncherWorkUnit } from "@/lib/application/launcher/workUnitSelectionModel"
import type { WorkspaceModel } from "@/lib/application/launcher/deriveWorkspaceModel"
import { ActionFieldEditor } from "./ActionFieldEditor"
import { WorkUnitTreeMap } from "./WorkUnitTreeMap"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly workUnit: LauncherWorkUnit | null
  readonly workspace: WorkspaceModel
  readonly treeMap: WorkUnitTreeMapView
  readonly selectedNodeId: string | null
  readonly onSelectNode: (id: string) => void
  readonly draft: ActionFieldEditorDraft
  readonly readinessCards: readonly LauncherReadinessCard[]
  readonly onBackToPalette: () => void
  readonly onClose: () => void
}

export function ActionFieldView(props: Props) {
  const { workspace } = props
  const root = workspace.rootCard
  return (
    <section className={`${styles.palettePanel} ${styles.actionFieldPanel}`} role="dialog" aria-label="Action Field">
      <nav className={styles.workspaceBreadcrumb} aria-label="Workspace breadcrumb">
        {workspace.breadcrumb.map((item, index) => (
          <span key={item.id} className={styles.workspaceCrumb}>
            {index > 0 ? <i aria-hidden="true">›</i> : null}
            {item.label}
          </span>
        ))}
      </nav>
      {root ? (
        <article className={styles.workspaceRootCard} aria-label="Workspace WorkUnit">
          <div className={styles.workspaceRootTop}>
            <h2>{root.title}</h2>
            <span className={`${styles.statusBadge} ${styles[`status-${root.statusTone}`]}`}>{root.status}</span>
          </div>
          <p className={styles.workspaceRootSummary}>{root.summary}</p>
          <dl className={styles.workspaceRootFacts}>
            <div><dt>Source</dt><dd>{root.sourceDetail}</dd></div>
            <div><dt>ROI</dt><dd>{root.roi.toFixed(1)}</dd></div>
            <div><dt>Owner</dt><dd>{root.ownerLabel}</dd></div>
            <div><dt>Urgency</dt><dd>{root.urgency}</dd></div>
          </dl>
          <p className={styles.workspaceReviewNote}>Candidate only — human review required. Local edits only.</p>
        </article>
      ) : null}
      <div className={styles.actionBody}>
        <WorkUnitTreeMap
          treeMap={props.treeMap}
          selectedNodeId={props.selectedNodeId}
          onSelectNode={props.onSelectNode}
        />
        <ActionFieldEditor draft={props.draft} readinessCards={props.readinessCards} />
      </div>
    </section>
  )
}
