import { studioModeColors } from "@/lib/constants"
import { styles } from "@/styles/layoutStyles"
import type { StudioDocument } from "@/types/studio"

interface StudioTabsProps {
  documents: StudioDocument[]
  selectedDocumentId: string
  onSelectDocument: (id: string) => void
  onCreateDocument: () => void
}

export default function StudioTabs({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onCreateDocument,
}: StudioTabsProps) {
  return (
    <div style={styles.studioTabs}>
      {documents.map((document) => (
        <button
          key={document.id}
          type="button"
          onClick={() => onSelectDocument(document.id)}
          style={{
            ...styles.studioTab,
            ...(document.id === selectedDocumentId
              ? styles.studioTabActive
              : {}),
          }}
        >
          <span
            style={{
              ...styles.studioTabMode,
              color: studioModeColors[document.mode],
            }}
          >
            {document.mode}
          </span>
          <span style={styles.studioTabTitle}>{document.title}</span>
        </button>
      ))}

      <button type="button" onClick={onCreateDocument} style={styles.newDocBtn}>
        + NEW DOC
      </button>
    </div>
  )
}
