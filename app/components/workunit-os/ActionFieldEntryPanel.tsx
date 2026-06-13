"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { createDashboardActionPreviews, type DashboardPreviewRef } from "@/lib/application/actionField/dashboardPreviewClient"
import {
  evidenceCapsule,
  getPrimaryActionPreviewGroup,
  getReadinessGates,
  isExternalExecutionBlocked,
  type DashboardGateState,
} from "@/lib/application/dashboard/workUnitDashboardModel"

type PreviewStatus = "idle" | "creating" | "ready" | "failed"

export function ActionFieldEntryPanel({ decisionSelected }: { decisionSelected: boolean }) {
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle")
  const [previews, setPreviews] = useState<DashboardPreviewRef[]>([])
  const [error, setError] = useState("")
  const gates = useMemo(() => {
    const base = getReadinessGates(previewStatus === "ready", false)
    return base.map((gate) => gate.label === "Decision Selected" && decisionSelected ? { ...gate, state: "completed" as const } : gate)
  }, [decisionSelected, previewStatus])
  const executionBlocked = isExternalExecutionBlocked(gates)

  const handleCreatePreview = async () => {
    setPreviewStatus("creating")
    setError("")
    const result = await createDashboardActionPreviews(getPrimaryActionPreviewGroup())
    if (!result.ok) {
      setPreviews([])
      setPreviewStatus("failed")
      setError(result.error)
      return
    }
    setPreviews(result.previews)
    setPreviewStatus("ready")
  }

  return (
    <aside className="min-h-0 overflow-auto bg-[#050606] px-4 py-4">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--ai-divider)] pb-3">
        <h2 className="text-[18px] font-semibold text-[var(--ai-text-strong)]">Action Field Entry</h2>
        <button type="button" aria-label="Edit action entry" className="grid h-7 w-7 place-items-center rounded-[4px] border border-[var(--ai-border-2)] text-[15px] text-[var(--ai-text-muted)]">
          ↗
        </button>
      </div>
      <PanelTitle title="Recommended Action" />
      <p className="mb-6 text-[14px] leading-6 text-[var(--ai-text)]">Prepare Slack reply for enterprise update response.</p>
      <EvidenceCapsule />
      <div className="my-6 border-t border-[var(--ai-divider)]" />
      <PanelTitle title="Readiness Gates" />
      <div className="space-y-3">
        {gates.map((gate) => <GateRow key={gate.label} label={gate.label} state={gate.state} />)}
      </div>
      <button
        type="button"
        onClick={handleCreatePreview}
        disabled={previewStatus === "creating"}
        className="mt-8 w-full rounded-[6px] border border-[var(--ai-accent)] bg-[var(--ai-success-bg)] px-4 py-4 text-[14px] font-semibold text-[var(--ai-accent)] hover:bg-[rgba(105,255,71,0.14)] disabled:cursor-wait disabled:opacity-60"
      >
        {previewStatus === "creating" ? "Creating Preview..." : "Create Action Preview"}
      </button>
      {previewStatus === "ready" && <p className="mt-3 text-[12px] text-[var(--ai-accent)]">Action preview ready: {previews.length}</p>}
      {previewStatus === "failed" && <p className="mt-3 text-[12px] text-[var(--ai-danger)]">{error || "Preview creation failed"}</p>}
      <div className="mt-6 rounded-[7px] border border-[#7f2a2a] bg-[#180707] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 place-items-center text-[24px] text-[var(--ai-danger)]">▣</span>
          <div>
            <div className="text-[14px] font-semibold text-[var(--ai-text-strong)]">
              External Execution: <span className="text-[var(--ai-danger)]">BLOCKED</span>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-[var(--ai-text)]">
              Reason: {executionBlocked ? "Preview and approval are not completed." : "External execution policy remains disabled."}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function EvidenceCapsule() {
  return (
    <section className="rounded-[7px] border border-[var(--ai-border)] bg-[linear-gradient(180deg,#171919,#0c0d0d)] p-3">
      <PanelTitle title="Evidence Capsule" />
      <div className="flex items-center gap-3">
        <SlackIcon />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-[var(--ai-text-strong)]">{evidenceCapsule.target}</div>
          <div className="mt-1 text-[12px] leading-5 text-[var(--ai-text-muted)]">{evidenceCapsule.summary}</div>
        </div>
        <div className="shrink-0 text-center">
          <div className="rounded-[6px] bg-[var(--ai-success-bg)] px-3 py-1 text-[12px] font-semibold text-[var(--ai-accent)]">{evidenceCapsule.confidence}</div>
          <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">Confidence</div>
        </div>
        <span className="shrink-0 text-[24px] text-[var(--ai-text-muted)]">›</span>
      </div>
    </section>
  )
}

function SlackIcon() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[5px]">
      <Image src="/Photos/icon/slack.png" alt="Slack" width={36} height={36} className="h-9 w-9 object-contain" />
    </span>
  )
}

function GateRow({ label, state }: { label: string; state: DashboardGateState }) {
  const done = state === "completed"
  const blocked = state === "blocked"
  return (
    <div className="flex items-center gap-3 border-b border-dashed border-[var(--ai-divider)] pb-2 text-[13px]">
      <span className={["grid h-5 w-5 place-items-center rounded-full border text-[11px]", done ? "border-[var(--ai-accent)] bg-[var(--ai-accent)] text-black" : blocked ? "border-[#7f2a2a] text-[var(--ai-danger)]" : "border-[var(--ai-text-muted)] text-[var(--ai-text-muted)]"].join(" ")}>
        {done ? "✓" : "−"}
      </span>
      <span className={blocked ? "text-[var(--ai-danger)]" : "text-[var(--ai-text)]"}>{label}</span>
    </div>
  )
}

function PanelTitle({ title }: { title: string }) {
  return <h3 className="mb-3 text-[14px] font-semibold text-[var(--ai-text-strong)]">{title}</h3>
}
