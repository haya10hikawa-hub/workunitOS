"use client"

import { useEffect, useState, useCallback } from "react"
import type { InboxWorkUnit } from "@/app/lib/workunitInbox/types"

// ─── Types ──────────────────────────────────────────────────────

export type InboxSource = "all" | "mock" | "github" | "slack" | "calendar"

const SOURCES: { value: InboxSource; label: string; short: string }[] = [
  { value: "all", label: "All Sources", short: "All" },
  { value: "mock", label: "Mock", short: "Mock" },
  { value: "github", label: "GitHub", short: "GH" },
  { value: "slack", label: "Slack", short: "Slack" },
  { value: "calendar", label: "Calendar", short: "Cal" },
]

// ─── Props ──────────────────────────────────────────────────────

type Props = {
  onSelect: (wu: InboxWorkUnit | null) => void
  selectedId?: string | null
}

// ─── Component ──────────────────────────────────────────────────

export function WorkUnitInbox({ onSelect, selectedId }: Props) {
  const [source, setSource] = useState<InboxSource>("all")
  const [workUnits, setWorkUnits] = useState<InboxWorkUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkUnits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/workunit/inbox?source=${source}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setWorkUnits(data.workUnits ?? [])
    } catch {
      setError("Unable to load WorkUnits")
    } finally {
      setLoading(false)
    }
  }, [source])

  useEffect(() => {
    fetchWorkUnits()
  }, [fetchWorkUnits])

  return (
    <div>
      {/* ── Source Switcher ─────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {SOURCES.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              setSource(s.value)
              onSelect(null)
            }}
            style={{
              padding: "3px 10px",
              fontSize: 11,
              border: source === s.value ? "1px solid #4af" : "1px solid #333",
              borderRadius: 4,
              background: source === s.value ? "#1a2030" : "#111",
              color: source === s.value ? "#8cf" : "#666",
              cursor: "pointer",
            }}
          >
            {s.short}
          </button>
        ))}
      </div>

      {/* ── Header ──────────────────────────────────────── */}
      {!loading && !error && (
        <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
          {workUnits.length} WorkUnit{workUnits.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────── */}
      {loading && (
        <div style={{ padding: 16, color: "#888" }}>Loading WorkUnits…</div>
      )}

      {/* ── Error ───────────────────────────────────────── */}
      {error && (
        <div style={{ padding: 16, color: "#d44" }}>{error}</div>
      )}

      {/* ── Empty ───────────────────────────────────────── */}
      {!loading && !error && workUnits.length === 0 && (
        <div style={{ padding: 16, color: "#666" }}>No WorkUnits yet</div>
      )}

      {/* ── List ────────────────────────────────────────── */}
      {!loading && !error && workUnits.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workUnits.map((wu) => (
            <WorkUnitCard
              key={wu.id}
              wu={wu}
              isSelected={wu.id === selectedId}
              onClick={() => onSelect(wu)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────

function WorkUnitCard({ wu, isSelected, onClick }: {
  wu: InboxWorkUnit
  isSelected: boolean
  onClick: () => void
}) {
  const priorityColor = wu.priority === "high" ? "#e44" : wu.priority === "medium" ? "#e84" : "#888"

  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        border: isSelected ? "1.5px solid #4af" : "1px solid #333",
        background: isSelected ? "#1a1e2e" : "#111",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: priorityColor, fontWeight: 600 }}>
          {wu.priority.toUpperCase()}
        </span>
        <span style={{ fontSize: 11, color: "#888", background: "#1a1a1a", padding: "2px 6px", borderRadius: 4 }}>
          {wu.kind.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 11, color: "#666" }}>
          {wu.sourceProvider}
        </span>
      </div>
      <div style={{ fontWeight: 500, fontSize: 13, color: "#ddd", marginBottom: 2 }}>
        {wu.title}
      </div>
      <div style={{ fontSize: 12, color: "#777", marginBottom: 2 }}>
        {wu.reason}
      </div>
      <div style={{ fontSize: 11, color: "#5a5" }}>
        → {wu.nextAction}
      </div>
    </div>
  )
}
