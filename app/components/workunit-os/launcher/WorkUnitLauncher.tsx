"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchDashboardWorkUnits } from "@/lib/application/dashboard/dashboardDataClient"
import {
  deriveActionFieldEditorDraft,
  deriveLauncherReadinessCards,
} from "@/lib/application/launcher/actionFieldEditorDraftModel"
import { getLauncherKeyIntent, nextLauncherIndex } from "@/lib/application/launcher/keyboardNavigationModel"
import { getSafePaletteCommands } from "@/lib/application/launcher/paletteCommandRegistry"
import { deriveWorkUnitTreeMap } from "@/lib/application/launcher/workUnitTreeModel"
import {
  clampLauncherActiveIndex,
  fallbackLauncherWorkUnits,
  filterLauncherWorkUnits,
  getActiveLauncherWorkUnit,
  mapInboxWorkUnitToLauncherWorkUnit,
  type LauncherWorkUnit,
} from "@/lib/application/launcher/workUnitSelectionModel"
import { ActionFieldView } from "./ActionFieldView"
import { CommandPaletteView } from "./CommandPaletteView"
import styles from "./WorkUnitLauncher.module.css"

export type WorkUnitLauncherMode = "palette" | "action-field"

export function WorkUnitLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<WorkUnitLauncherMode>("palette")
  const [query, setQuery] = useState("")
  const [workUnits, setWorkUnits] = useState<LauncherWorkUnit[]>(() => fallbackLauncherWorkUnits())
  const [loadState, setLoadState] = useState<"loading" | "ready" | "fallback">("loading")
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState<string | null>(workUnits[0]?.id ?? null)
  const [activeIndex, setActiveIndex] = useState(0)

  const filteredWorkUnits = useMemo(
    () => filterLauncherWorkUnits(workUnits, query),
    [query, workUnits],
  )
  const clampedActiveIndex = clampLauncherActiveIndex(activeIndex, filteredWorkUnits.length)
  const activeWorkUnit = getActiveLauncherWorkUnit(filteredWorkUnits, clampedActiveIndex)
  const selectedWorkUnit = workUnits.find((workUnit) => workUnit.id === selectedWorkUnitId) ?? activeWorkUnit ?? null
  const commands = useMemo(() => getSafePaletteCommands(filteredWorkUnits), [filteredWorkUnits])
  const treeMap = useMemo(() => deriveWorkUnitTreeMap(selectedWorkUnit), [selectedWorkUnit])
  const draft = useMemo(() => deriveActionFieldEditorDraft(selectedWorkUnit), [selectedWorkUnit])
  const readinessCards = useMemo(() => deriveLauncherReadinessCards(selectedWorkUnit), [selectedWorkUnit])

  useEffect(() => {
    let cancelled = false
    fetchDashboardWorkUnits("all")
      .then((result) => {
        if (cancelled) return
        if (result.ok && result.workUnits.length > 0) {
          const mapped = result.workUnits.map(mapInboxWorkUnitToLauncherWorkUnit)
          setWorkUnits(mapped)
          setSelectedWorkUnitId((current) => current && mapped.some((workUnit) => workUnit.id === current) ? current : mapped[0]?.id ?? null)
          setLoadState("ready")
          return
        }
        setLoadState("fallback")
      })
      .catch(() => setLoadState("fallback"))
    return () => {
      cancelled = true
    }
  }, [])

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
  }, [clampedActiveIndex, filteredWorkUnits, isOpen, mode])

  return (
    <main className={styles.root}>
      <section className={styles.landingShell}>
        <p className={styles.eyebrow}>WorkUnit OS</p>
        <h1>Current-awareness launcher</h1>
        <p>Press ⌘K to open</p>
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
      </section>
      {isOpen ? (
        <div className={styles.overlay}>
          {mode === "palette" ? (
            <CommandPaletteView
              query={query}
              workUnits={filteredWorkUnits}
              commands={commands}
              selectedWorkUnitId={selectedWorkUnitId}
              activeIndex={clampedActiveIndex}
              loadState={loadState}
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
              treeMap={treeMap}
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
