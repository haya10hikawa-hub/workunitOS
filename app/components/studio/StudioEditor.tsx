import { studioModeColors } from "@/lib/constants"
import { styles } from "@/styles/layoutStyles"
import type { StudioDocument } from "@/types/studio"

interface StudioEditorProps {
  document: StudioDocument
  onChangeContent: (id: string, content: string) => void
  onInsertTasks: () => void
  onInsertSummary: () => void
}

export default function StudioEditor({
  document,
  onChangeContent,
  onInsertTasks,
  onInsertSummary,
}: StudioEditorProps) {
  return (
    <div style={styles.studioEditor}>
      <div style={styles.studioDocMeta}>
        <span
          style={{
            ...styles.studioModeTag,
            color: studioModeColors[document.mode],
            borderColor: studioModeColors[document.mode],
            background: `${studioModeColors[document.mode]}14`,
          }}
        >
          {document.mode}
        </span>
        <span style={styles.studioDocTitle}>{document.title}</span>
      </div>

      <textarea
        value={document.content}
        onChange={(event) => onChangeContent(document.id, event.target.value)}
        style={styles.studioTextarea}
        spellCheck={false}
        data-studio-textarea
      />

      <div style={styles.studioActions}>
        <button type="button" onClick={onInsertTasks} style={styles.actionBtn}>
          INSERT TASKS
        </button>
        <button type="button" onClick={onInsertSummary} style={styles.actionBtn}>
          ADD ROI NOTE
        </button>
      </div>
    </div>
  )
}
