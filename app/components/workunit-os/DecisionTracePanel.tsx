"use client"

import type { DashboardTraceLog } from "@/lib/application/dashboard/workUnitDashboardModel"

export function DecisionTracePanel({ logs }: { logs: DashboardTraceLog[] }) {
  return (
    <section className="min-h-0 rounded-[7px] border border-[var(--ai-border)] bg-[#080909] p-4">
      <div className="flex items-center justify-between border-b border-[var(--ai-divider)] pb-3">
        <h2 className="text-[15px] font-semibold text-[var(--ai-text-strong)]">Decision Trace</h2>
      </div>
      <div className="mt-3 space-y-2">
        {logs.map((log) => (
          <div key={`${log.level}-${log.message}`} className="grid grid-cols-[14px_100px_minmax(0,1fr)_18px_90px] items-center gap-2 text-[12px]">
            <span className="text-[var(--ai-text-muted)]">›</span>
            <span className={["font-mono", levelTone(log.level)].join(" ")}>[{log.level}]</span>
            <span className="truncate text-[var(--ai-text)]">{log.message}</span>
            <span className={["h-2.5 w-2.5 rounded-full", dotTone(log.level)].join(" ")} />
            <span className="text-right text-[var(--ai-text-muted)]">{log.time}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end border-t border-[var(--ai-divider)] pt-3">
        <div className="flex items-center gap-2 rounded-[5px] bg-[#0d0e0e] px-3 py-1 text-[11px] text-[var(--ai-text-muted)]">
          Auto-scroll
          <span className="relative h-5 w-9 rounded-full bg-[var(--ai-success-bg)] ring-1 ring-[var(--ai-accent-border)]">
            <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-[#d8f8d0]" />
          </span>
        </div>
      </div>
    </section>
  )
}

function levelTone(level: DashboardTraceLog["level"]): string {
  if (level === "READY" || level === "STATUS") return "text-[var(--ai-accent)]"
  if (level === "NEEDS REVIEW") return "text-[#ffcc66]"
  if (level === "NEEDS OWNER") return "text-[var(--ai-danger)]"
  if (level === "INFO") return "text-[#54b7ff]"
  return "text-[var(--ai-text-muted)]"
}

function dotTone(level: DashboardTraceLog["level"]): string {
  if (level === "READY") return "bg-[var(--ai-accent)]"
  if (level === "NEEDS REVIEW") return "bg-[#ffcc66]"
  if (level === "NEEDS OWNER") return "bg-[var(--ai-danger)]"
  if (level === "NOT READY") return "bg-[var(--ai-text-muted)]"
  return "bg-transparent"
}
