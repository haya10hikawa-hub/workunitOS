"use client"

import type { LauncherWorkUnit } from "@/lib/application/launcher/workUnitSelectionModel"
import type { WorkUnitLauncherMode } from "./WorkUnitLauncher"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly mode: WorkUnitLauncherMode
  readonly query: string
  readonly workUnits: readonly LauncherWorkUnit[]
  readonly selectedWorkUnitId: string | null
  readonly activeIndex: number
  readonly onQueryChange: (query: string) => void
  readonly onActiveIndexChange: (index: number) => void
  readonly onSelectWorkUnit: (id: string) => void
  readonly onOpenActionField: () => void
  readonly onClose: () => void
}

export function CommandPaletteView(props: Props) {
  const activeWorkUnit = props.workUnits[props.activeIndex] ?? null

  if (props.mode === "action-field") {
    return (
      <section className={`${styles.palettePanel} ${styles.actionFieldPanel}`} role="dialog" aria-label="Action Field">
        <header className={styles.actionHeader}>
          <div>
            <p className={styles.eyebrow}>Focused WorkUnit</p>
            <h2 className={styles.actionTitle}>Action Field</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={props.onClose}>Esc</button>
        </header>
        <div className={styles.actionPlaceholder}>
          <p className={styles.placeholderTitle}>{activeWorkUnit?.title ?? "No WorkUnit selected"}</p>
          <p>WorkUnit Tree and editable draft editor will appear here.</p>
          <p>External execution is not available from the launcher.</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.palettePanel} role="dialog" aria-label="WorkUnit command palette">
      <div className={styles.searchRow}>
        <span className={styles.searchIcon}>⌘</span>
        <input
          className={styles.searchInput}
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search WorkUnits"
          autoFocus
        />
      </div>
      <div className={styles.paletteBody}>
        <div className={styles.resultList} role="listbox" aria-label="WorkUnit results">
          {props.workUnits.map((workUnit, index) => (
            <button
              key={workUnit.id}
              type="button"
              className={`${styles.resultRow} ${index === props.activeIndex ? styles.resultRowActive : ""}`}
              data-selected={props.selectedWorkUnitId === workUnit.id ? "true" : "false"}
              onClick={() => {
                props.onActiveIndexChange(index)
                props.onSelectWorkUnit(workUnit.id)
              }}
              onDoubleClick={props.onOpenActionField}
            >
              <span className={styles.resultSource}>{workUnit.source}</span>
              <span className={styles.resultMain}>
                <span className={styles.resultTitle}>{workUnit.title}</span>
                <span className={styles.resultMeta}>ROI {workUnit.roi.toFixed(1)} · {workUnit.status}</span>
              </span>
            </button>
          ))}
          {props.workUnits.length === 0 ? <div className={styles.emptyState}>No matching WorkUnits</div> : null}
        </div>
        <aside className={styles.previewPane}>
          <p className={styles.eyebrow}>Selected WorkUnit</p>
          <h2 className={styles.previewTitle}>{activeWorkUnit?.title ?? "No selection"}</h2>
          <dl className={styles.previewGrid}>
            <div><dt>Source</dt><dd>{activeWorkUnit?.source ?? "—"}</dd></div>
            <div><dt>Status</dt><dd>{activeWorkUnit?.status ?? "—"}</dd></div>
            <div><dt>ROI</dt><dd>{activeWorkUnit ? activeWorkUnit.roi.toFixed(1) : "—"}</dd></div>
          </dl>
          <p className={styles.previewSummary}>{activeWorkUnit?.summary ?? "Select a WorkUnit to inspect the compact preview."}</p>
        </aside>
      </div>
      <footer className={styles.footerRow}>
        <span><kbd>Enter</kbd> open Action Field</span>
        <span><kbd>⌘K</kbd> palette</span>
        <span><kbd>Esc</kbd> close</span>
      </footer>
    </section>
  )
}
