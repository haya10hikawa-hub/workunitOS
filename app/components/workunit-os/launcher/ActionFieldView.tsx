"use client"

import type { ActionFieldEditorDraft, LauncherReadinessCard } from "@/lib/application/launcher/actionFieldEditorDraftModel"
import type { WorkUnitTreeMap as WorkUnitTreeMapView } from "@/lib/application/launcher/workUnitTreeModel"
import type { LauncherWorkUnit } from "@/lib/application/launcher/workUnitSelectionModel"
import { ActionFieldEditor } from "./ActionFieldEditor"
import { ReadinessCards } from "./ReadinessCards"
import { WorkUnitTreeMap } from "./WorkUnitTreeMap"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly workUnit: LauncherWorkUnit | null
  readonly treeMap: WorkUnitTreeMapView
  readonly draft: ActionFieldEditorDraft
  readonly readinessCards: readonly LauncherReadinessCard[]
  readonly onBackToPalette: () => void
  readonly onClose: () => void
}

export function ActionFieldView(props: Props) {
  return (
    <section className={`${styles.palettePanel} ${styles.actionFieldPanel}`} role="dialog" aria-label="Action Field">
      <div className={styles.actionBody}>
        <WorkUnitTreeMap treeMap={props.treeMap} />
        <div className={styles.actionEditorStack}>
          <ActionFieldEditor draft={props.draft} />
          <ReadinessCards cards={props.readinessCards} />
        </div>
      </div>
    </section>
  )
}
