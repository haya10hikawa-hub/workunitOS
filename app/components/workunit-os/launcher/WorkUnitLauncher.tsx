"use client"

import { useEffect, useMemo, useState } from "react"
import {
  deriveActionFieldEditorDraft,
  deriveLauncherReadinessCards,
} from "@/lib/application/launcher/actionFieldEditorDraftModel"
import { getLauncherKeyIntent, nextLauncherIndex, resolveLauncherEscapeAction } from "@/lib/application/launcher/keyboardNavigationModel"
import { deriveWorkUnitTreeMap } from "@/lib/application/launcher/workUnitTreeModel"
import { deriveWorkspaceModel, resolveSelectedTreeNode } from "@/lib/application/launcher/deriveWorkspaceModel"
import { candidateWorkUnitBridge } from "@/lib/application/candidate/candidateWorkUnitBridge"
import { candidatesToLauncherWorkUnits } from "@/lib/application/launcher/candidateToLauncherWorkUnit"
import {
  clampLauncherActiveIndex,
  filterLauncherWorkUnits,
  getActiveLauncherWorkUnit,
  type LauncherWorkUnit,
} from "@/lib/application/launcher/workUnitSelectionModel"
import { ActionFieldView } from "./ActionFieldView"
import { CommandPaletteView } from "./CommandPaletteView"
import { SourceAppIcon } from "./SourceAppIcon"
import styles from "./WorkUnitLauncher.module.css"

export type WorkUnitLauncherMode = "palette" | "action-field"

export function WorkUnitLauncher() {
  const [isOpen, setIsOpen] = useState(true)
  const [mode, setMode] = useState<WorkUnitLauncherMode>("palette")
  const [query, setQuery] = useState("")
  // Data source: candidate-only bridge (mock_candidate_pipeline). Each WorkUnit is
  // an allowlist-projected SafeWorkUnitCandidate adapted into LauncherWorkUnit.
  const workUnits = useMemo<LauncherWorkUnit[]>(
    () => candidatesToLauncherWorkUnits(candidateWorkUnitBridge().workUnits),
    [],
  )
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState<string | null>(workUnits[0]?.id ?? null)
  // Node selection is scoped to its WorkUnit; switching WorkUnit falls back to the
  // canvas center without a reset effect (the stale id no longer matches).
  const [nodeSelection, setNodeSelection] = useState<{ readonly workUnitId: string; readonly nodeId: string } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const filteredWorkUnits = useMemo(
    () => filterLauncherWorkUnits(workUnits, query),
    [query, workUnits],
  )
  const clampedActiveIndex = clampLauncherActiveIndex(activeIndex, filteredWorkUnits.length)
  const activeWorkUnit = getActiveLauncherWorkUnit(filteredWorkUnits, clampedActiveIndex)
  const selectedWorkUnit = workUnits.find((workUnit) => workUnit.id === selectedWorkUnitId) ?? activeWorkUnit ?? null
  const treeMap = useMemo(() => deriveWorkUnitTreeMap(selectedWorkUnit), [selectedWorkUnit])
  // The selected node defaults to the canvas center (derived from candidate state).
  const effectiveNodeId =
    nodeSelection && nodeSelection.workUnitId === selectedWorkUnitId ? nodeSelection.nodeId : null
  const selectedNode = useMemo(() => resolveSelectedTreeNode(treeMap, effectiveNodeId), [treeMap, effectiveNodeId])
  const workspace = useMemo(
    () => deriveWorkspaceModel(selectedWorkUnit, treeMap, effectiveNodeId),
    [selectedWorkUnit, treeMap, effectiveNodeId],
  )
  const draft = useMemo(
    () => deriveActionFieldEditorDraft(
      selectedWorkUnit,
      selectedNode.id === treeMap.center.id ? null : { id: selectedNode.id, label: selectedNode.label },
    ),
    [selectedWorkUnit, selectedNode, treeMap],
  )
  const readinessCards = useMemo(() => deriveLauncherReadinessCards(selectedWorkUnit), [selectedWorkUnit])

  const handleSelectNode = (nodeId: string) => {
    setNodeSelection(selectedWorkUnitId ? { workUnitId: selectedWorkUnitId, nodeId } : null)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const intent = getLauncherKeyIntent(event)
      if (intent === "open_palette") {
        event.preventDefault()
        setIsOpen(true)
        setMode("palette")
        return
      }
      if (!isOpen) return
      if (intent === "close") {
        event.preventDefault()
        // In the palette, Escape clears a non-empty query first; a second Escape
        // (empty query) closes. Action Field always closes.
        if (mode === "palette" && resolveLauncherEscapeAction(query) === "clear_query") {
          setQuery("")
          setActiveIndex(0)
          return
        }
        setIsOpen(false)
        setMode("palette")
        return
      }
      if (intent === "confirm" && mode === "palette") {
        const active = getActiveLauncherWorkUnit(filteredWorkUnits, clampedActiveIndex)
        if (!active) return
        event.preventDefault()
        setSelectedWorkUnitId(active.id)
        setMode("action-field")
      }
      if (intent === "next" && mode === "palette") {
        event.preventDefault()
        setActiveIndex((current) => nextLauncherIndex(current, "next", filteredWorkUnits.length))
      }
      if (intent === "previous" && mode === "palette") {
        event.preventDefault()
        setActiveIndex((current) => nextLauncherIndex(current, "previous", filteredWorkUnits.length))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [clampedActiveIndex, filteredWorkUnits, isOpen, mode, query])

  return (
    <main className={styles.root}>
      <header className={styles.backgroundBrand}>
        <span className={styles.logoMark} />
        <strong>WorkUnit OS</strong>
      </header>
      <div className={styles.backgroundBoard} aria-hidden="true">
        {workUnits.map((workUnit) => (
          <span key={workUnit.id}>
            <SourceAppIcon icon={workUnit.sourceIcon} size="sm" />
            {workUnit.title}
          </span>
        ))}
      </div>
      {!isOpen ? (
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            setIsOpen(true)
            setMode("palette")
          }}
        >
          Open Command Palette
        </button>
      ) : null}
      {isOpen ? (
        <div className={styles.overlay}>
          {mode === "palette" ? (
            <CommandPaletteView
              query={query}
              workUnits={filteredWorkUnits}
              selectedWorkUnitId={selectedWorkUnitId}
              activeIndex={clampedActiveIndex}
              onQueryChange={(nextQuery) => {
                setQuery(nextQuery)
                setActiveIndex(0)
              }}
              onActiveIndexChange={setActiveIndex}
              onSelectWorkUnit={setSelectedWorkUnitId}
              onOpenActionField={() => setMode("action-field")}
              onClose={() => {
                setIsOpen(false)
                setMode("palette")
              }}
            />
          ) : (
            <ActionFieldView
              workUnit={selectedWorkUnit}
              workspace={workspace}
              treeMap={treeMap}
              selectedNodeId={selectedNode.id}
              onSelectNode={handleSelectNode}
              draft={draft}
              readinessCards={readinessCards}
              onBackToPalette={() => setMode("palette")}
              onClose={() => {
                setIsOpen(false)
                setMode("palette")
              }}
            />
          )}
        </div>
      ) : null}
    </main>
  )
}
