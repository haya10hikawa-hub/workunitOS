"use client"

import { useMemo, useState } from "react"
import type { ActionFieldEditorDraft, LauncherReadinessCard } from "@/lib/application/launcher/actionFieldEditorDraftModel"
import { ReadinessCards } from "./ReadinessCards"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly draft: ActionFieldEditorDraft
  readonly readinessCards: readonly LauncherReadinessCard[]
}

type ToolbarTool = {
  readonly label: string
  readonly icon: string
  readonly mode?: boolean
  readonly strong?: boolean
  readonly italic?: boolean
}

const TOOLBAR_GROUPS: readonly (readonly ToolbarTool[])[] = [
  [
    { label: "Text style", icon: "Normal", mode: true },
  ],
  [
    { label: "Bold", icon: "B", strong: true },
    { label: "Italic", icon: "I", italic: true },
  ],
  [
    { label: "Bulleted list", icon: "≡" },
    { label: "Numbered list", icon: "☷" },
  ],
  [
    { label: "Code", icon: "</>" },
    { label: "Quote", icon: "❞" },
  ],
  [
    { label: "Reference", icon: "◎" },
    { label: "Link", icon: "↗" },
    { label: "Mention", icon: "@" },
    { label: "Annotation", icon: "⌘" },
  ],
] as const

export function ActionFieldEditor({ draft, readinessCards }: Props) {
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const [title, setTitle] = useState(draft.title)
  const [objective, setObjective] = useState(draft.objective)
  const [body, setBody] = useState(draft.body)
  const [notes, setNotes] = useState(draft.notes)
  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body])

  return (
    <section className={styles.editorPanel} aria-label="Action Field Editor / Viewer">
      <header className={styles.editorHeader}>
        <h3>Action Field Editor / Viewer</h3>
        <div className={styles.editorActions}>
          <select value={draft.version} onChange={() => undefined} aria-label="Draft version">
            <option>{draft.version}</option>
          </select>
          <button type="button" aria-label="More options">•••</button>
        </div>
      </header>
      <div className={styles.editorTabs} role="tablist">
        <button type="button" className={tab === "edit" ? styles.tabActive : ""} onClick={() => setTab("edit")}>Edit</button>
        <button type="button" className={tab === "preview" ? styles.tabActive : ""} onClick={() => setTab("preview")}>Preview</button>
      </div>
      <div className={styles.editorMetaGrid}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          ID
          <span className={styles.idBadge}>{draft.id}</span>
        </label>
      </div>
      <label className={styles.objectiveField}>
        Objective
        <textarea value={objective} onChange={(event) => setObjective(event.target.value)} />
      </label>
      <div className={styles.draftLabelRow}>
        <span>Draft Content</span>
        <strong aria-label="AI-generated draft — editable">{draft.editableLabel}</strong>
      </div>
      <div className={styles.draftBox}>
        <div className={styles.toolbar} aria-label="Markdown toolbar">
          {TOOLBAR_GROUPS.map((group, groupIndex) => (
            <span key={groupIndex} className={styles.toolbarGroup}>
              {group.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  aria-label={tool.label}
                  title={tool.label}
                  className={tool.mode ? styles.toolbarMode : undefined}
                >
                  <span className={tool.strong ? styles.toolbarStrong : tool.italic ? styles.toolbarItalic : undefined}>
                    {tool.icon}
                  </span>
                  {tool.mode ? <i aria-hidden="true">⌄</i> : null}
                </button>
              ))}
            </span>
          ))}
        </div>
        {tab === "edit" ? (
          <textarea className={styles.draftTextarea} value={body} onChange={(event) => setBody(event.target.value)} />
        ) : (
          <pre className={styles.previewText}>{body.trim() || "No draft text."}</pre>
        )}
        <footer className={styles.draftFooter}>
          <span>Markdown⌄</span>
          <span>{wordCount} words</span>
        </footer>
      </div>
      <ReadinessCards cards={readinessCards} />
      <label className={styles.notesField}>
        Notes (optional)
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a note for reviewers..." />
      </label>
      <p className={styles.verificationState}>{draft.verificationState}</p>
    </section>
  )
}
