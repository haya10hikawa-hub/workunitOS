"use client"

import { useEffect, useState } from "react"
import { fetchRecentAuditLogs, type DashboardAuditLog } from "@/lib/application/dashboard/dashboardStatusClient"

export function AuditLogPanel({ className = "" }: { className?: string }) {
  const [state, setState] = useState<{ status: "loading" | "loaded" | "error"; auditLogs: DashboardAuditLog[]; error?: string }>({ status: "loading", auditLogs: [] })

  useEffect(() => {
    let active = true
    fetchRecentAuditLogs().then((result) => {
      if (!active) return
      setState(result.ok ? { status: "loaded", auditLogs: result.auditLogs } : { status: "error", auditLogs: [], error: result.error })
    })
    return () => { active = false }
  }, [])

  return (
    <section className={["rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4", className].join(" ")}>
      <div className="mb-4 text-[14px] font-semibold text-[var(--ai-text-strong)]">最近の監査イベント</div>
      {state.status === "loading" ? <div className="text-[12px] text-[var(--ai-text-muted)]">Loading audit events...</div> : null}
      {state.status === "error" ? <div className="text-[12px] text-[var(--ai-danger)]">{state.error}</div> : null}
      {state.status === "loaded" && state.auditLogs.length === 0 ? <div className="text-[12px] text-[var(--ai-text-muted)]">No recent audit events.</div> : null}
      {state.status === "loaded" ? <div className="space-y-3">{state.auditLogs.slice(0, 6).map((row) => <AuditRow key={row.id} row={row} />)}</div> : null}
    </section>
  )
}

function AuditRow({ row }: { row: DashboardAuditLog }) {
  return (
    <div className="rounded-[7px] border border-[var(--ai-border)] bg-black px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-[var(--ai-text-strong)]">{row.eventKind}</div>
          <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">{row.createdAt}</div>
        </div>
        {row.actorUserId ? <div className="text-[10px] text-[var(--ai-text-muted)]">{row.actorUserId}</div> : null}
      </div>
      {(row.targetType || row.targetId) ? <div className="mt-2 text-[11px] text-[var(--ai-text)]">Target: {[row.targetType, row.targetId].filter(Boolean).join(" / ")}</div> : null}
      {renderMetadataSummary(row.metadata)}
    </div>
  )
}

function renderMetadataSummary(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).slice(0, 3)
  if (entries.length === 0) return null
  return <div className="mt-2 space-y-1 text-[10px] text-[var(--ai-text-muted)]">{entries.map(([key, value]) => <div key={key}>{key}: {formatMetadataValue(value)}</div>)}</div>
}

function formatMetadataValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ")
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).join(", ")
  return String(value)
}
