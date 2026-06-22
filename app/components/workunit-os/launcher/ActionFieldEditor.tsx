"use client"

import type { ComponentType, SVGProps } from "react"
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
  readonly Icon: ComponentType<IconProps>
  readonly mode?: boolean
  readonly toggle?: boolean
}

type IconProps = SVGProps<SVGSVGElement>

function ToolbarIcon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

const TypeIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M4 7V4h16v3M9 20h6M12 4v16" /></ToolbarIcon>
const HeadingIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M5 5v14M19 5v14M5 12h14M14 19h5" /></ToolbarIcon>
const BoldIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M8 5h5.2a3.2 3.2 0 0 1 0 6.4H8zM8 11.4h6a3.8 3.8 0 0 1 0 7.6H8z" /></ToolbarIcon>
const ItalicIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M10 5h8M6 19h8M14 5l-4 14" /></ToolbarIcon>
const UnderlineIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M7 5v6a5 5 0 0 0 10 0V5M6 21h12" /></ToolbarIcon>
const HighlightIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="m4 16 8-8 4 4-8 8H4zM13 7l2-2 4 4-2 2" /></ToolbarIcon>
const AlignIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M4 6h16M4 10h12M4 14h16M4 18h10" /></ToolbarIcon>
const OrderedIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M4 6h1v4M4 10h2M4 15.5A1.5 1.5 0 1 1 6.4 17L4 20h3M10 7h10M10 12h10M10 17h10" /></ToolbarIcon>
const BulletIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M5 7h.01M5 12h.01M5 17h.01M10 7h10M10 12h10M10 17h10" /></ToolbarIcon>
const IndentDecreaseIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M20 6H10M20 12H10M20 18H10M4 12l4-4v8z" /></ToolbarIcon>
const IndentIncreaseIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M20 6H10M20 12H10M20 18H10M8 12l-4-4v8z" /></ToolbarIcon>
const CodeIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></ToolbarIcon>
const QuoteIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M7 17h4V9H5v6a2 2 0 0 0 2 2ZM17 17h4V9h-6v6a2 2 0 0 0 2 2Z" /></ToolbarIcon>
const LinkIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" /></ToolbarIcon>
const MentionIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M16 12a4 4 0 1 1-2-3.5V12a2 2 0 0 0 4 0 6 6 0 1 0-2.4 4.8" /></ToolbarIcon>
const PaperclipIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="m21 12-8.6 8.6a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a2 2 0 0 1-2.8-2.8L16 7.2" /></ToolbarIcon>
const MoreIcon = (props: IconProps) => <ToolbarIcon {...props}><path d="M12 6h.01M12 12h.01M12 18h.01" /></ToolbarIcon>

const TOOLBAR_GROUPS: readonly (readonly ToolbarTool[])[] = [
  [
    { label: "Text style", Icon: TypeIcon, mode: true },
    { label: "Heading", Icon: HeadingIcon },
    { label: "Bold", Icon: BoldIcon, toggle: true },
    { label: "Italic", Icon: ItalicIcon, toggle: true },
    { label: "Underline", Icon: UnderlineIcon, toggle: true },
    { label: "Highlight", Icon: HighlightIcon },
  ],
  [
    { label: "Align left", Icon: AlignIcon },
    { label: "Ordered list", Icon: OrderedIcon, toggle: true },
    { label: "Bullet list", Icon: BulletIcon, toggle: true },
    { label: "Indent decrease", Icon: IndentDecreaseIcon },
    { label: "Indent increase", Icon: IndentIncreaseIcon },
  ],
  [
    { label: "Code", Icon: CodeIcon, toggle: true },
    { label: "Quote", Icon: QuoteIcon },
    { label: "Link", Icon: LinkIcon },
    { label: "Mention", Icon: MentionIcon },
    { label: "Attachment", Icon: PaperclipIcon },
  ],
  [
    { label: "More", Icon: MoreIcon },
  ],
] as const

export function ActionFieldEditor({ draft, readinessCards }: Props) {
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const [title, setTitle] = useState(draft.title)
  const [objective, setObjective] = useState(draft.objective)
  const [body, setBody] = useState(draft.body)
  const [notes, setNotes] = useState(draft.notes)
  const [activeTools, setActiveTools] = useState<readonly string[]>([])
  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body])

  const toggleTool = (tool: ToolbarTool) => {
    if (!tool.toggle) return
    setActiveTools((current) =>
      current.includes(tool.label) ? current.filter((label) => label !== tool.label) : [...current, tool.label],
    )
  }

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
        <div className={styles.editorToolbar} role="toolbar" aria-label="Markdown toolbar">
          {TOOLBAR_GROUPS.map((group, groupIndex) => (
            <span key={groupIndex} className={styles.editorToolbarGroup}>
              {groupIndex > 0 ? <span className={styles.editorToolbarSeparator} aria-hidden="true" /> : null}
              {group.map((tool) => {
                const isActive = activeTools.includes(tool.label)
                const Icon = tool.Icon
                return (
                  <button
                    key={tool.label}
                    type="button"
                    aria-label={tool.label}
                    aria-pressed={tool.toggle ? isActive : undefined}
                    title={tool.label}
                    className={[
                      styles.editorToolbarButton,
                      tool.mode ? styles.editorToolbarSelect : "",
                      isActive ? styles.editorToolbarButtonActive : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => toggleTool(tool)}
                  >
                    {tool.mode ? <span>Normal</span> : null}
                    <Icon className={styles.editorToolbarIcon} />
                    {tool.mode ? <i aria-hidden="true">⌄</i> : null}
                  </button>
                )
              })}
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
