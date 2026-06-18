"use client"

import { useMemo, useState } from "react"
import type { WorkUnitTreeMap as WorkUnitTreeMapView } from "@/lib/application/launcher/workUnitTreeModel"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly treeMap: WorkUnitTreeMapView
}

export function WorkUnitTreeMap({ treeMap }: Props) {
  const [query, setQuery] = useState("")
  const [focusDepth, setFocusDepth] = useState(2)
  const [autoFocus, setAutoFocus] = useState(true)
  const normalizedQuery = query.trim().toLowerCase()
  const groups = useMemo(
    () => treeMap.groups.map((group) => ({
      ...group,
      nodes: group.nodes.filter((node) => !normalizedQuery || node.label.toLowerCase().includes(normalizedQuery)),
    })),
    [normalizedQuery, treeMap.groups],
  )

  return (
    <section className={styles.treePanel} aria-label="WorkUnit Tree">
      <header className={styles.treeHeader}>
        <div>
          <p className={styles.eyebrow}>Context Map</p>
          <h3>WorkUnit Tree</h3>
        </div>
      </header>
      <input
        className={styles.treeSearch}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search tree"
      />
      <div className={styles.treeControls}>
        <label>
          Focus depth
          <input type="range" min="1" max="3" value={focusDepth} onChange={(event) => setFocusDepth(Number(event.target.value))} />
        </label>
        <label className={styles.toggleRow}>
          <input type="checkbox" checked={autoFocus} onChange={(event) => setAutoFocus(event.target.checked)} />
          Auto-focus
        </label>
      </div>
      <div className={styles.treeCanvas} data-depth={focusDepth} data-auto-focus={autoFocus ? "true" : "false"}>
        <div className={styles.treeAxis} />
        <div className={`${styles.treeNode} ${styles.treeNodePrimary}`} style={{ left: `${treeMap.center.x}%`, top: `${treeMap.center.y}%` }}>
          {treeMap.center.label}
        </div>
        {groups.flatMap((group) => group.nodes.map((node) => (
          <div
            key={node.id}
            className={`${styles.treeNode} ${styles[`treeNode-${node.tone}`]}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span>{group.title}</span>
            {node.label}
          </div>
        )))}
      </div>
      <div className={styles.treeGroupList}>
        {groups.map((group) => (
          <div key={group.id}>
            <strong>{group.title}</strong>
            <span>{group.nodes.length} nodes</span>
          </div>
        ))}
      </div>
      <footer className={styles.treeLegend}>
        {treeMap.legend.map((item) => <span key={item}>{item}</span>)}
      </footer>
    </section>
  )
}
