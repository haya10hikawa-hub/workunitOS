"use client"

import Image from "next/image"
import type { DashboardWorkUnit, DashboardWorkUnitStatus } from "@/lib/application/dashboard/workUnitDashboardModel"

export function WorkUnitExplorerPane({
  workUnits,
  selectedId,
  onSelect,
}: {
  workUnits: DashboardWorkUnit[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <aside className="min-h-0 overflow-auto border-r border-[var(--ai-divider)] bg-[#050606] px-3 py-4">
      <h2 className="mb-4 px-2 text-[15px] font-semibold text-[var(--ai-text-strong)]">WorkUnit Explorer</h2>
      <div className="space-y-2">
        {workUnits.map((workUnit) => (
          <button
            key={workUnit.id}
            type="button"
            onClick={() => onSelect(workUnit.id)}
            className={[
              "flex w-full items-center gap-3 rounded-[7px] border px-3 py-3 text-left",
              "bg-[linear-gradient(180deg,#151718,#090a0a)] hover:border-[var(--ai-border-2)]",
              workUnit.id === selectedId ? "border-[#202a20] bg-[#181b1a] shadow-[inset_3px_0_0_var(--ai-accent)]" : "border-transparent",
            ].join(" ")}
          >
            <SourceIcon source={workUnit.source} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[var(--ai-text-strong)]">{workUnit.title}</span>
              <span className="mt-1 flex items-center gap-2 text-[11px] text-[var(--ai-text-muted)]">
                ROI: {workUnit.roi.toFixed(1)}
                <StatusBadge status={workUnit.status} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

function SourceIcon({ source }: { source: DashboardWorkUnit["source"] }) {
  if (source === "slack") return <PhotoIcon src="/Photos/icon/slack.png" alt="Slack" />
  if (source === "email") return <PhotoIcon src="/Photos/icon/gmail.png" alt="Gmail" />
  if (source === "jira") return <span className="grid h-8 w-8 place-items-center text-[26px] text-[#2c8cff]">◆</span>
  if (source === "calendar") return <PhotoIcon src="/Photos/icon/google-calendar.png" alt="Google Calendar" />
  if (source === "news") return <span className="grid h-8 w-8 place-items-center text-[24px] text-[#d8d8d8]">▤</span>
  return <PhotoIcon src="/Photos/icon/salesforce.jpeg" alt="Salesforce" rounded />
}

function PhotoIcon({ src, alt, rounded = false }: { src: string; alt: string; rounded?: boolean }) {
  return (
    <span className={["grid h-8 w-8 shrink-0 place-items-center overflow-hidden", rounded ? "rounded-full" : "rounded-[5px]"].join(" ")}>
      <Image src={src} alt={alt} width={32} height={32} className="h-8 w-8 object-contain" />
    </span>
  )
}

function StatusBadge({ status }: { status: DashboardWorkUnitStatus }) {
  return (
    <span className={["rounded-[4px] border px-1.5 py-0.5 text-[10px] font-semibold", statusTone(status)].join(" ")}>
      {status}
    </span>
  )
}

function statusTone(status: DashboardWorkUnitStatus): string {
  if (status === "READY") return "border-[var(--ai-accent-border)] bg-[var(--ai-success-bg)] text-[var(--ai-accent)]"
  if (status === "NEEDS REVIEW") return "border-[#806221] bg-[#211704] text-[#ffcc66]"
  if (status === "BLOCKED" || status === "ERROR") return "border-[#802525] bg-[#210707] text-[var(--ai-danger)]"
  return "border-[var(--ai-border-2)] bg-[#151515] text-[var(--ai-text-muted)]"
}
