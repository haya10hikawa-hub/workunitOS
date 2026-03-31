"use client"

import { useRef, useState } from "react"
import DetailField from "@/components/common/DetailField"
import TaskItem from "@/components/workunit/TaskItem"
import { statusOrder } from "@/lib/constants"
import { calcROI } from "@/lib/roi"
import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"
import type { DecisionLog, DecisionReason } from "@/types/decision"
import type { WorkUnit, WorkUnitStatus } from "@/types/workunit"

const wrongReasonOptions: Array<{ id: DecisionReason; label: string }> = [
  { id: "impact", label: "Impact is off" },
  { id: "urgency", label: "Deadline is off" },
  { id: "actor", label: "This person isn’t that important" },
  { id: "effort", label: "It’s more work than expected" },
  { id: "intuition", label: "Just a feeling" },
]

//Check box element
interface WorkUnitDetailProps {
  workUnit: WorkUnit | undefined
  maxROI: number
  onToggleTask: (wuId: string, taskId: string) => void
  onUpdateStatus: (wuId: string, status: WorkUnitStatus) => void
  onLogDecision: (log: DecisionLog) => void
}

export default function WorkUnitDetail({
  workUnit,
  maxROI,
  onToggleTask,
  onUpdateStatus,
  onLogDecision,
}: WorkUnitDetailProps) {
  const [wrongModalOpen, setWrongModalOpen] = useState(false)
  const [wrongReason, setWrongReason] = useState<DecisionReason | "">("")
  const [customReason, setCustomReason] = useState("")
  const openedAtRef = useRef<number>(0)

  if (!workUnit) {
    return (
      <div style={styles.wuDetail}>
        <div style={styles.emptyStateTitle}>No WorkUnit selected</div>
        <div style={styles.emptyStateBody}>
          Choose an inbox signal to inspect its priority model and task list.
        </div>
      </div>
    )
  }

  const roi = calcROI(workUnit)

  const openWrongModal = (openedAt: number) => {
    openedAtRef.current = openedAt
    setWrongReason("")
    setCustomReason("")
    setWrongModalOpen(true)
  }

  const submitWrongReason = (submittedAt: number) => {
    if (!wrongReason) {
      return
    }

    const selectedROI = roi
    const gap = Math.max(0, maxROI - selectedROI)
    const trimmed = customReason.trim()
    const timeToDecision = Math.max(0, Math.round(submittedAt - openedAtRef.current))
    const timestamp = Math.round(performance.timeOrigin + submittedAt)

    onLogDecision({
      workUnitId: workUnit.id,
      maxROI,
      selectedROI,
      gap,
      reason: wrongReason,
      customReason: trimmed ? trimmed : undefined,
      timestamp,
      timeToDecision,
    })

    setWrongModalOpen(false)
  }

  return (
    <div style={styles.wuDetail}>
      <div style={styles.detailHeader}>
        <span style={styles.detailTitle}>{workUnit.title}</span>
        <div style={styles.statusRow}>
          {statusOrder.map((status) => {
            const active = status === workUnit.status

            return (
              <button
                key={status}
                type="button"
                onClick={() => onUpdateStatus(workUnit.id, status)}
                style={{
                  ...styles.statusBtn,
                  ...(active
                    ? {
                        color: colors.accent,
                        borderColor: colors.accent,
                        background: colors.successBg2,
                      }
                    : {}),
                }}
              >
                {status}
              </button>
            )
          })}
        </div>
      </div>

      <div style={styles.roiBreakdown}>
        <span style={styles.roiLabel}>ROI {roi.toFixed(1)}</span>
        <div style={styles.roiFactors}>
          <div style={styles.roiFactor}>
            <span style={styles.roiFactorKey}>IMPACT</span>
            <span style={styles.roiFactorVal}>{workUnit.impact}</span>
          </div>
          <div style={styles.roiFactor}>
            <span style={styles.roiFactorKey}>URGENCY</span>
            <span style={styles.roiFactorVal}>{workUnit.urgency}</span>
          </div>
          <div style={styles.roiFactor}>
            <span style={styles.roiFactorKey}>ACTOR</span>
            <span style={styles.roiFactorVal}>{workUnit.actorWeight}</span>
          </div>
          <div style={styles.roiFactor}>
            <span style={styles.roiFactorKey}>EFFORT</span>
            <span style={styles.roiFactorVal}>{workUnit.effort}</span>
          </div>
        </div>

        <div style={styles.roiFeedbackRow}>
          <button
            type="button"
            onClick={(event) => openWrongModal(event.timeStamp)}
            style={{
              ...styles.roiFeedbackBtn,
              borderColor: colors.danger,
              color: colors.danger,
            }}
          >
            THIS IS WRONG
          </button>
        </div>
      </div>

      <div style={styles.detailGrid}>
        <DetailField label="SITUATION" value={workUnit.situation} />
        <DetailField label="PROBLEM" value={workUnit.problem} />
        <DetailField label="ACTORS" value={workUnit.actors.join(", ")} />
        <DetailField label="SOURCES" value={workUnit.sources.join(", ")} />
      </div>

      <div style={styles.taskSection}>
        <div style={styles.taskHeader}>TASKS</div>
        {workUnit.tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={(taskId) => onToggleTask(workUnit.id, taskId)}
          />
        ))}
      </div>

      {wrongModalOpen ? (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.modalTitle}>Why is this wrong?</div>

            <div style={styles.modalOptions} role="radiogroup" aria-label="Reason">
              {wrongReasonOptions.map((option) => {
                const selected = option.id === wrongReason

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setWrongReason(option.id)}
                    style={{
                      ...styles.modalOption,
                      ...(selected ? styles.modalOptionSelected : {}),
                    }}
                    role="radio"
                    aria-checked={selected}
                  >
                    <span style={styles.modalRadio}>{selected ? "●" : "○"}</span>
                    <span style={styles.modalOptionText}>{option.label}</span>
                  </button>
                )
              })}
            </div>

            <div style={styles.modalOther}>
              <div style={styles.modalOtherLabel}>＋ Add your own reason</div>
              <input
                type="text"
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                placeholder="Additional notes"
                style={styles.modalInput}
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setWrongModalOpen(false)}
                style={styles.modalBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(event) => submitWrongReason(event.timeStamp)}
                style={{
                  ...styles.modalBtn,
                  ...(wrongReason ? styles.modalBtnPrimary : styles.modalBtnDisabled),
                }}
                disabled={!wrongReason}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
