"use client"

import type React from "react"
import { decisionOptions, getDecisionTraceLogs } from "@/lib/application/dashboard/workUnitDashboardModel"
import { DecisionTracePanel } from "./DecisionTracePanel"

export function DecompositionConsole({
  selectedDecision,
  onDecisionChange,
}: {
  selectedDecision: string
  onDecisionChange: (decision: string) => void
}) {
  return (
    <section className="min-h-0 overflow-auto border-r border-[var(--ai-divider)] bg-[#070808]">
      <div className="flex h-12 border-b border-[var(--ai-divider)]">
        {["Enterprise Update Response Pack", "Client X Feedback", "BUG-1045", "+"].map((tab, index) => (
          <button key={tab} type="button" className={["border-r border-[var(--ai-divider)] px-5 text-[13px]", index === 0 ? "border-b-2 border-b-[var(--ai-accent)] text-[var(--ai-text-strong)]" : "text-[var(--ai-text-muted)]"].join(" ")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-2 p-2">
        <section className="rounded-[7px] border border-[var(--ai-border)] bg-[#0b0c0c] p-4">
          <h1 className="text-[20px] font-semibold text-[var(--ai-text-strong)]">
            Decomposition: Enterprise Update Response Pack
          </h1>
          <ConsoleSection title="SITUATION">Received signal from WorkUnit OS Roadmap.</ConsoleSection>
          <ConsoleSection title="PROBLEM / WHY NOW">
            Phase 1-3 implementation in progress.<br />
            Deadline: This Week (2026-06-14)
          </ConsoleSection>
          <div className="mt-5">
            <div className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-[var(--ai-text-strong)]">DECISION REQUIRED</div>
            <div className="flex flex-wrap gap-2">
              {decisionOptions.map((decision) => (
                <button
                  key={decision}
                  type="button"
                  onClick={() => onDecisionChange(decision)}
                  className={[
                    "rounded-[5px] border px-4 py-2 text-[12px] font-medium",
                    selectedDecision === decision
                      ? "border-[var(--ai-accent)] bg-[var(--ai-success-bg)] text-[var(--ai-accent)]"
                      : "border-[var(--ai-border-2)] bg-black text-[var(--ai-text)] hover:border-[var(--ai-accent-border)]",
                  ].join(" ")}
                >
                  [{decision}]
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-[var(--ai-divider)] pt-4 text-[12px]">
            <span className="text-[var(--ai-text-muted)]">ROI Metric</span>
            <span className="text-[var(--ai-text)]">Impact × Urgency × Importance / Effort = <strong className="text-[var(--ai-text-strong)]">240.0</strong></span>
          </div>
        </section>
        <DecisionTracePanel logs={getDecisionTraceLogs()} />
      </div>
    </section>
  )
}

function ConsoleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--ai-text-strong)]">{title}</div>
      <div className="text-[14px] leading-7 text-[var(--ai-text)]">{children}</div>
    </div>
  )
}
