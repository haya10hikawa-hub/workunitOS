"use client"

import { useMemo, useState } from "react"
import type { ActionFieldEditorDraft } from "@/lib/application/launcher/actionFieldEditorDraftModel"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly draft: ActionFieldEditorDraft
}

export function ActionFieldEditor({ draft }: Props) {
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
          <button type="button">Normal⌄</button>
          <button type="button">B</button>
          <button type="button"><em>I</em></button>
          <button type="button">☷</button>
          <button type="button">☰</button>
          <button type="button">&lt;/&gt;</button>
          <button type="button">“”</button>
          <button type="button">◉</button>
          <button type="button">↗</button>
          <button type="button">@</button>
          <button type="button">⛓</button>
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
      <label className={styles.notesField}>
        Notes (optional)
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a note for reviewers..." />
      </label>
      <p className={styles.verificationState}>{draft.verificationState}</p>
    </section>
  )
}
