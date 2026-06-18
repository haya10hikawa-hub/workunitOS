"use client"

import type { LauncherWorkUnit } from "@/lib/application/launcher/workUnitSelectionModel"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
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

  return (
    <section className={styles.palettePanel} role="dialog" aria-label="WorkUnit command palette">
      <div className={styles.paletteTop}>
        <span className={styles.searchGlyph}>⌕</span>
        <input
          className={styles.searchInput}
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search WorkUnits"
          autoFocus
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className={styles.paletteBody}>
        <div className={styles.resultColumn}>
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
                <span
                  className={styles.resultPhotoIcon}
                  style={workUnit.iconSrc ? { backgroundImage: `url(${workUnit.iconSrc})` } : undefined}
                />
                <span className={styles.resultMain}>
                  <span className={styles.resultTitle}>{workUnit.title}</span>
                  <span className={styles.resultMeta}>{workUnit.summary}</span>
                </span>
                <span className={styles.resultRoi}>ROI {workUnit.roi.toFixed(1)}</span>
                <span className={`${styles.statusBadge} ${styles[`status-${workUnit.statusTone ?? "gray"}`]}`}>
                  {workUnit.status}
                </span>
              </button>
            ))}
            {props.workUnits.length === 0 ? <div className={styles.emptyState}>No matching WorkUnits</div> : null}
          </div>
          <div className={styles.resultSummaryRow}>
            <button type="button">Show more results...⌄</button>
            <span>{props.workUnits.length} results</span>
          </div>
        </div>
        <aside className={styles.previewPane}>
          <div className={styles.previewHeading}>
            <span
              className={styles.previewPhotoIcon}
              style={activeWorkUnit?.iconSrc ? { backgroundImage: `url(${activeWorkUnit.iconSrc})` } : undefined}
            />
            <h2 className={styles.previewTitle}>{activeWorkUnit?.title ?? "No selection"}</h2>
            {activeWorkUnit ? (
              <span className={`${styles.statusBadge} ${styles[`status-${activeWorkUnit.statusTone ?? "gray"}`]}`}>
                {activeWorkUnit.status}
              </span>
            ) : null}
          </div>
          <p className={styles.previewSummary}>{activeWorkUnit?.objective ?? "Select a WorkUnit to inspect the compact preview."}</p>
          <div className={styles.previewDivider} />
          <dl className={styles.previewFacts}>
            <div>
              <dt><span className={styles.factIcon}>▣</span>Source</dt>
              <dd>{activeWorkUnit?.sourceDetail ?? "—"}</dd>
            </div>
            <div>
              <dt><span className={styles.factIcon}>◴</span>Urgency</dt>
              <dd>{activeWorkUnit?.urgency ?? "—"}</dd>
            </div>
            <div>
              <dt><span className={styles.factIcon}>✣</span>Next Step</dt>
              <dd>{activeWorkUnit?.nextStep ?? "—"}</dd>
            </div>
          </dl>
        </aside>
      </div>
      <footer className={styles.footerRow}>
        <span><kbd>↵</kbd> Enter = Open Detail</span>
        <span><kbd>⌘ K</kbd> Open Command Palette</span>
        <span><kbd>Esc</kbd> Close</span>
      </footer>
    </section>
  )
}
