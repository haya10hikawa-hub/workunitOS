import FlowIndicator from "@/components/studio/FlowIndicator"
import StudioEditor from "@/components/studio/StudioEditor"
import StudioTabs from "@/components/studio/StudioTabs"
import { styles } from "@/styles/layoutStyles"
import type { StudioDocument } from "@/types/studio"
import type { WorkUnit } from "@/types/workunit"

interface StudioColumnProps {
  workUnit: WorkUnit | undefined
  documents: StudioDocument[]
  selectedDocumentId: string
  onSelectDocument: (id: string) => void
  onChangeDocumentContent: (id: string, content: string) => void
  onCreateDocument: () => void
  onInsertTasks: () => void
  onInsertSummary: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export default function StudioColumn({
  workUnit,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onChangeDocumentContent,
  onCreateDocument,
  onInsertTasks,
  onInsertSummary,
  collapsed = false,
  onToggleCollapsed,
}: StudioColumnProps) {
  const selectedDocument = documents.find(
    (document) => document.id === selectedDocumentId
  )

  if (collapsed) {
    return (
      <section
        style={{ ...styles.column, ...styles.colStudio, ...styles.colStudioCollapsed }}
        className="ai-editor-column ai-editor-column--studio"
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          style={styles.studioCollapsedButton}
          aria-label="Open Studio (Cmd+K)"
          title="Open Studio (Cmd+K)"
        >
          STUDIO ⌘K
        </button>
      </section>
    )
  }

  return (
    <section
      style={{ ...styles.column, ...styles.colStudio }}
      className="ai-editor-column ai-editor-column--studio"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>✦</span>
        <span style={styles.colTitle}>STUDIO</span>
        <span style={styles.colSubtitle}>
          {workUnit ? workUnit.title : "NO WORKUNIT"}
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          style={styles.colHeaderAction}
          aria-label="Collapse Studio (Cmd+K)"
          title="Collapse Studio (Cmd+K)"
        >
          ⌘K
        </button>
      </div>

      <StudioTabs
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={onSelectDocument}
        onCreateDocument={onCreateDocument}
      />

      {selectedDocument ? (
        <StudioEditor
          document={selectedDocument}
          onChangeContent={onChangeDocumentContent}
          onInsertTasks={onInsertTasks}
          onInsertSummary={onInsertSummary}
        />
      ) : (
        <div style={styles.studioEmpty}>
          <div>
            <div style={styles.studioEmptyTitle}>No active document</div>
            <div style={styles.studioEmptyBody}>
              Select a WorkUnit or create a draft to continue.
            </div>
          </div>
        </div>
      )}

      <FlowIndicator activeIndex={selectedDocument ? 2 : 1} />
    </section>
  )
}
