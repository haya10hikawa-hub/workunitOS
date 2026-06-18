"use client"

import { useEffect, useMemo, useState } from "react"
import {
  clampLauncherActiveIndex,
  filterLauncherWorkUnits,
  getActiveLauncherWorkUnit,
  type LauncherWorkUnit,
} from "@/lib/application/launcher/workUnitSelectionModel"
import { CommandPaletteView } from "./CommandPaletteView"
import styles from "./WorkUnitLauncher.module.css"

export type WorkUnitLauncherMode = "palette" | "action-field"

const PLACEHOLDER_WORK_UNITS: readonly LauncherWorkUnit[] = [
  { id: "wu-review-request", title: "Review request needs PM focus", source: "GitHub", status: "READY", roi: 91.2, summary: "Current-awareness item prepared for focused review." },
  { id: "wu-team-follow-up", title: "Team follow-up waiting on decision", source: "Team", status: "NEEDS REVIEW", roi: 84.5, summary: "Open item can be selected without provider mutation." },
  { id: "wu-calendar-deadline", title: "Deadline checkpoint approaching", source: "Calendar", status: "DRAFT", roi: 76.0, summary: "Timing context is available for navigation only." },
]

export function WorkUnitLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<WorkUnitLauncherMode>("palette")
  const [query, setQuery] = useState("")
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState<string | null>(PLACEHOLDER_WORK_UNITS[0]?.id ?? null)
  const [activeIndex, setActiveIndex] = useState(0)

  const filteredWorkUnits = useMemo(
    () => filterLauncherWorkUnits(PLACEHOLDER_WORK_UNITS, query),
    [query],
  )
  const clampedActiveIndex = clampLauncherActiveIndex(activeIndex, filteredWorkUnits.length)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const wantsPalette = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      if (wantsPalette) {
        event.preventDefault()
        setIsOpen(true)
        setMode("palette")
        return
      }
      if (!isOpen) return
      if (event.key === "Escape") {
        event.preventDefault()
        setIsOpen(false)
        setMode("palette")
        return
      }
      if (event.key === "Enter") {
        const active = getActiveLauncherWorkUnit(filteredWorkUnits, clampedActiveIndex)
        if (!active) return
        event.preventDefault()
        setSelectedWorkUnitId(active.id)
        setMode("action-field")
      }
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActiveIndex((current) => clampLauncherActiveIndex(current + 1, filteredWorkUnits.length))
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActiveIndex((current) => clampLauncherActiveIndex(current - 1, filteredWorkUnits.length))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [clampedActiveIndex, filteredWorkUnits, isOpen])

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
          <CommandPaletteView
            mode={mode}
            query={query}
            workUnits={filteredWorkUnits}
            selectedWorkUnitId={selectedWorkUnitId}
            activeIndex={clampedActiveIndex}
            onQueryChange={setQuery}
            onActiveIndexChange={setActiveIndex}
            onSelectWorkUnit={setSelectedWorkUnitId}
            onOpenActionField={() => setMode("action-field")}
            onClose={() => {
              setIsOpen(false)
              setMode("palette")
            }}
          />
        </div>
      ) : null}
    </main>
  )
}
