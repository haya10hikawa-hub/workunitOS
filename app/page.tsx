"use client"

import { useMemo, useState } from "react"
import Header from "@/components/common/Header"
import { mockInbox } from "@/data/mockInbox"
import { mockWorkUnits } from "@/data/mockWorkUnits"
import { calcROI } from "@/lib/roi"
import { useWorkUnits } from "@/hooks/useWorkUnits"
import { styles } from "@/styles/layoutStyles"
import type { AppLanguage } from "@/types/ui"
import type { WorkUnit } from "@/types/workunit"
import { FeedbackModal } from "@/components/workunit-os/FeedbackModal"
import { WorkUnitCard } from "@/components/workunit-os/WorkUnitCard"
import { WorkUnitDetail } from "@/components/workunit-os/WorkUnitDetail"

export default function Page() {
  const [language, setLanguage] = useState<AppLanguage>("ja")
  const { workUnits, setWorkUnits, updateStatus } = useWorkUnits(mockWorkUnits)
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState<string | null>(
    workUnits[0]?.id ?? null
  )
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackLogs, setFeedbackLogs] = useState<
    Array<{
      workUnitId: string
      roi: number
      reason: string
      details: string
      createdAt: string
    }>
  >([])

  const selectedWorkUnit: WorkUnit | null =
    workUnits.find((wu) => wu.id === selectedWorkUnitId) ?? null

  const inboxWorkUnits = useMemo(
    () => workUnits.filter((wu) => wu.status === "New"),
    [workUnits]
  )

  const queueWorkUnits = useMemo(
    () =>
      workUnits
        .filter((wu) => wu.status !== "Archived")
        .slice()
        .sort((a, b) => calcROI(b) - calcROI(a) || a.rank - b.rank),
    [workUnits]
  )

  const handleUpdateWorkUnit = (id: string, patch: Partial<WorkUnit>) => {
    setWorkUnits((prev) => prev.map((wu) => (wu.id === id ? { ...wu, ...patch } : wu)))
  }

  return (
    <div style={styles.root}>
      <div style={styles.noise} />
      <Header language={language} onLanguageChange={setLanguage} />

      <main className="grid min-h-[calc(100vh-48px)] grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,360px)] gap-px bg-[var(--ai-divider)]">
        <section className="min-w-0 min-h-0 bg-[var(--ai-bg)] flex flex-col">
          <div className="sticky top-0 z-10 border-b border-[var(--ai-divider)] bg-[var(--ai-surface)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] tracking-[0.22em] text-[var(--ai-text-strong)]">
                  INBOX
                </div>
                <div className="mt-1 text-[10px] tracking-[0.18em] text-[var(--ai-text-muted)]">
                  NEW WORKUNITS
                </div>
              </div>
              <div className="text-[10px] tracking-[0.18em] text-[var(--ai-text-faint)]">
                {inboxWorkUnits.length}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {inboxWorkUnits.length === 0 ? (
              <div className="border border-[var(--ai-border)] bg-[var(--ai-panel)] p-3 text-[12px] text-[var(--ai-text-muted)]">
                No new WorkUnits.
              </div>
            ) : (
              inboxWorkUnits.map((wu) => (
                <WorkUnitCard
                  key={wu.id}
                  workUnit={wu}
                  selected={wu.id === selectedWorkUnitId}
                  onSelect={setSelectedWorkUnitId}
                  variant="inbox"
                />
              ))
            )}
          </div>
        </section>

        <WorkUnitDetail
          workUnit={selectedWorkUnit}
          onUpdate={handleUpdateWorkUnit}
          onThisIsWrong={() => setFeedbackOpen(true)}
          onMarkDone={(id) => updateStatus(id, "Done")}
          onDefer={(id) => updateStatus(id, "Waiting")}
        />

        <section className="min-w-0 min-h-0 bg-[var(--ai-bg)] flex flex-col">
          <div className="sticky top-0 z-10 border-b border-[var(--ai-divider)] bg-[var(--ai-surface)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] tracking-[0.22em] text-[var(--ai-text-strong)]">
                  QUEUE
                </div>
                <div className="mt-1 text-[10px] tracking-[0.18em] text-[var(--ai-text-muted)]">
                  PRIORITIZED BY ROI
                </div>
              </div>
              <div className="text-[10px] tracking-[0.18em] text-[var(--ai-text-faint)]">
                {queueWorkUnits.length}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {queueWorkUnits.map((wu) => (
              <WorkUnitCard
                key={wu.id}
                workUnit={wu}
                selected={wu.id === selectedWorkUnitId}
                onSelect={setSelectedWorkUnitId}
                variant="queue"
              />
            ))}
          </div>
        </section>
      </main>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={({ reason, details }) => {
          if (!selectedWorkUnit) return
          setFeedbackLogs((prev) => [
            ...prev,
            {
              workUnitId: selectedWorkUnit.id,
              roi: calcROI(selectedWorkUnit),
              reason,
              details,
              createdAt: new Date().toISOString(),
            },
          ])
        }}
      />
    </div>
  )
}
