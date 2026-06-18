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

  const preview = useMemo(() => body.trim() || "No draft text.", [body])

  return (
    <section className={styles.editorPanel} aria-label="Action Field Editor / Viewer">
      <header className={styles.editorHeader}>
        <div>
          <h3>Action Field Editor / Viewer</h3>
          <span className={styles.draftBadge}>{draft.id}</span>
        </div>
        <select className={styles.versionSelect} value={draft.version} onChange={() => undefined} aria-label="Draft version">
          <option>{draft.version}</option>
        </select>
      </header>
      <div className={styles.editorTabs} role="tablist">
        <button type="button" className={tab === "edit" ? styles.tabActive : ""} onClick={() => setTab("edit")}>Edit</button>
        <button type="button" className={tab === "preview" ? styles.tabActive : ""} onClick={() => setTab("preview")}>Preview</button>
      </div>
      <label className={styles.fieldLabel}>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className={styles.fieldLabel}>
        Objective
        <input value={objective} onChange={(event) => setObjective(event.target.value)} />
      </label>
      <p className={styles.editableLabel}>{draft.editableLabel}</p>
      <div className={styles.toolbar} aria-label="Markdown toolbar">
        <button type="button">B</button>
        <button type="button">I</button>
        <button type="button">#</button>
        <button type="button">[]</button>
      </div>
      {tab === "edit" ? (
        <textarea className={styles.draftTextarea} value={body} onChange={(event) => setBody(event.target.value)} />
      ) : (
        <pre className={styles.previewText}>{preview}</pre>
      )}
      <label className={styles.fieldLabel}>
        Notes
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Local PM notes" />
      </label>
      <p className={styles.verificationState}>{draft.verificationState}</p>
    </section>
  )
}
