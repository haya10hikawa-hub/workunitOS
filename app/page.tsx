"use client"

import { useEffect, useRef, useState } from "react"
import Header from "@/components/common/Header"
import InboxColumn from "@/components/inbox/InboxColumn"
import StudioColumn from "@/components/studio/StudioColumn"
import WorkUnitColumn from "@/components/workunit/WorkUnitColumn"
import { mockInbox } from "@/data/mockInbox"
import { mockStudioDocuments } from "@/data/mockStudio"
import { mockWorkUnits } from "@/data/mockWorkUnits"
import { calcROI } from "@/lib/roi"
import { useStudio } from "@/hooks/useStudio"
import { useDecisionLogs } from "@/hooks/useDecisionLogs"
import { useWorkUnits } from "@/hooks/useWorkUnits"
import { styles } from "@/styles/layoutStyles"

export default function Page() {
  const [selectedEventId, setSelectedEventId] = useState(mockInbox[0]?.id ?? "")
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState(
    mockInbox[0]?.workUnitId ?? mockWorkUnits[0]?.id ?? ""
  )
  const [requestedDocumentId, setRequestedDocumentId] = useState("")
  const [studioCollapsed, setStudioCollapsed] = useState(false)
  const studioCollapsedRef = useRef(studioCollapsed)

  const { workUnits, toggleTask, updateStatus } = useWorkUnits(mockWorkUnits)
  const { documents, updateDocumentContent, createDocument } =
    useStudio(mockStudioDocuments)
  const { logDecision } = useDecisionLogs()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return
      }

      if (event.key.toLowerCase() !== "k") {
        return
      }

      event.preventDefault()
      setStudioCollapsed((prev) => !prev)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const wasCollapsed = studioCollapsedRef.current
    studioCollapsedRef.current = studioCollapsed

    if (!wasCollapsed || studioCollapsed) {
      return
    }

    const timer = window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>("[data-studio-textarea]")?.focus()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [studioCollapsed])

  const selectedWorkUnit = workUnits.find((wu) => wu.id === selectedWorkUnitId)
  const studioDocuments = documents.filter(
    (document) => document.workUnitId === selectedWorkUnitId
  )
  const selectedDocumentId = studioDocuments.some(
    (document) => document.id === requestedDocumentId
  )
    ? requestedDocumentId
    : (studioDocuments[0]?.id ?? "")

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId)

    const event = mockInbox.find((item) => item.id === eventId)

    if (event) {
      setSelectedWorkUnitId(event.workUnitId)
    }
  }

  const handleSelectWorkUnit = (workUnitId: string) => {
    setSelectedWorkUnitId(workUnitId)

    const linkedEvent = mockInbox.find((event) => event.workUnitId === workUnitId)

    if (linkedEvent) {
      setSelectedEventId(linkedEvent.id)
    }
  }

  const handleCreateDocument = () => {
    if (!selectedWorkUnit) {
      return
    }

    const nextId = createDocument({
      workUnitId: selectedWorkUnit.id,
      title: `${selectedWorkUnit.title} notes`,
      mode: "Draft",
      content: `# ${selectedWorkUnit.title}

## Goal
- capture the next best action for this WorkUnit
`,
    })

    setRequestedDocumentId(nextId)
  }

  const handleInsertTasks = () => {
    if (!selectedWorkUnit || !selectedDocumentId) {
      return
    }

    const checklist = selectedWorkUnit.tasks
      .map((task) => `- [${task.done ? "x" : " "}] ${task.label}`)
      .join("\n")

    const currentDocument = documents.find(
      (document) => document.id === selectedDocumentId
    )

    if (!currentDocument) {
      return
    }

    updateDocumentContent(
      selectedDocumentId,
      `${currentDocument.content}\n\n## Task checklist\n${checklist}`
    )
  }

  const handleInsertSummary = () => {
    if (!selectedWorkUnit || !selectedDocumentId) {
      return
    }

    const roi = calcROI(selectedWorkUnit).toFixed(1)
    const currentDocument = documents.find(
      (document) => document.id === selectedDocumentId
    )

    if (!currentDocument) {
      return
    }

    updateDocumentContent(
      selectedDocumentId,
      `${currentDocument.content}

## ROI note
- score: ${roi}
- problem: ${selectedWorkUnit.problem}
- deadline: ${selectedWorkUnit.deadline}`
    )
  }

  return (
    <div style={styles.root}>
      <div style={styles.noise} />
      <Header />

      <main
        style={styles.main}
        className={`ai-editor-main${studioCollapsed ? " ai-editor-main--studio-collapsed" : ""}`}
      >
        <InboxColumn
          events={mockInbox}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
        />

        <WorkUnitColumn
          workUnits={workUnits}
          selectedWorkUnitId={selectedWorkUnitId}
          onSelectWorkUnit={handleSelectWorkUnit}
          onToggleTask={toggleTask}
          onUpdateStatus={updateStatus}
          onLogDecision={logDecision}
        />

        <StudioColumn
          workUnit={selectedWorkUnit}
          documents={studioDocuments}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={setRequestedDocumentId}
          onChangeDocumentContent={updateDocumentContent}
          onCreateDocument={handleCreateDocument}
          onInsertTasks={handleInsertTasks}
          onInsertSummary={handleInsertSummary}
          collapsed={studioCollapsed}
          onToggleCollapsed={() => setStudioCollapsed((prev) => !prev)}
        />
      </main>
    </div>
  )
}
