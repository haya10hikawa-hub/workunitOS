"use client"

import { useMemo, useState } from "react"
import type { WorkUnitTreeGroupId, WorkUnitTreeMap as WorkUnitTreeMapView } from "@/lib/application/launcher/workUnitTreeModel"
import { SourceAppIcon } from "./SourceAppIcon"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly treeMap: WorkUnitTreeMapView
  readonly selectedNodeId?: string | null
  readonly onSelectNode?: (id: string) => void
}

const GROUP_CLASS: Record<WorkUnitTreeGroupId, string> = {
  sources: "treeGroupSources",
  subtasks: "treeGroupSubtasks",
  evidence: "treeGroupEvidence",
  drafts: "treeGroupDrafts",
  dependencies: "treeGroupDependencies",
  approval_context: "treeGroupApproval",
}

export function WorkUnitTreeMap({ treeMap, selectedNodeId, onSelectNode }: Props) {
  const [query, setQuery] = useState("")
  const [focusDepth, setFocusDepth] = useState("2")
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
        <h3>WorkUnit Tree</h3>
        <span aria-hidden="true">⌘</span>
      </header>
      <div className={styles.treeSearchRow}>
        <span>⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tree..." />
        <span>≡</span>
      </div>
      <div className={styles.treeControls}>
        <label>
          Focus depth
          <select value={focusDepth} onChange={(event) => setFocusDepth(event.target.value)}>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </label>
        <label className={styles.switchRow}>
          Auto-focus
          <input type="checkbox" checked={autoFocus} onChange={(event) => setAutoFocus(event.target.checked)} />
        </label>
      </div>
      <div className={styles.treeCanvas} data-depth={focusDepth} data-auto-focus={autoFocus ? "true" : "false"}>
        <svg className={styles.treeLines} viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 49 C50 37 50 34 50 30" />
          <path d="M44 50 C34 43 27 40 19 39" />
          <path d="M44 57 C34 67 27 69 21 70" />
          <path d="M50 58 C50 66 50 70 50 76" />
          <path d="M56 50 C65 42 72 40 78 40" />
          <path d="M56 57 C65 68 71 71 77 72" />
        </svg>
        <button
          type="button"
          className={styles.centerNode}
          aria-pressed={selectedNodeId === treeMap.center.id}
          onClick={() => onSelectNode?.(treeMap.center.id)}
        >
          <strong>{treeMap.center.label}</strong>
          <small>(WorkUnit)</small>
        </button>
        {groups.map((group) => (
          <section key={group.id} className={`${styles.treeGroupCard} ${styles[GROUP_CLASS[group.id]]}`}>
            <header>
              <strong>{group.title}</strong>
              <span>{group.nodes.length}</span>
            </header>
            <ul>
              {group.nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={styles.treeNodeButton}
                    aria-pressed={selectedNodeId === node.id}
                    data-selected={selectedNodeId === node.id ? "true" : "false"}
                    onClick={() => onSelectNode?.(node.id)}
                  >
                    <SourceAppIcon icon={node.sourceIcon} size="sm" />
                    {node.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className={styles.treeLegend}>
        <span>Legend</span>
        {treeMap.legend.map((item) => (
          <span key={item}><i />{item}</span>
        ))}
      </footer>
      <div className={styles.treeSelectionBar}>
        <span>1 of 1 selected</span>
        <button type="button">Clear selection</button>
      </div>
    </section>
  )
}
