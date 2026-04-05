import { useState } from "react"
import { styles } from "@/styles/layoutStyles"
import type { WorkUnit } from "@/types/workunit"

type WrongReason =
  | "impact"
  | "deadline"
  | "actors"
  | "effort"
  | "feelsOff"

interface WrongModalProps {
  open: boolean
  workUnit: WorkUnit | null
  currentROI: number | null
  onClose: () => void
  onSubmit: (payload: {
    workUnitId: string
    roi: number
    reason: WrongReason
    note: string
  }) => void
}

export function WrongModal({
  open,
  workUnit,
  currentROI,
  onClose,
  onSubmit,
}: WrongModalProps) {
  const [selectedReason, setSelectedReason] = useState<WrongReason | null>(null)
  const [note, setNote] = useState("")

  if (!open || !workUnit || currentROI == null) {
    return null
  }

  const reasons: Array<{ id: WrongReason; label: string }> = [
    { id: "impact", label: "Impact is incorrect" },
    { id: "deadline", label: "Deadline is incorrect" },
    { id: "actors", label: "Wrong people involved" },
    { id: "effort", label: "Effort is underestimated" },
    { id: "feelsOff", label: "Just feels off" },
  ]

  const handleSubmit = () => {
    if (!selectedReason) {
      return
    }

    onSubmit({
      workUnitId: workUnit.id,
      roi: currentROI,
      reason: selectedReason,
      note,
    })
    setSelectedReason(null)
    setNote("")
    onClose()
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal} role="dialog" aria-modal="true">
        <div style={styles.modalTitle}>Why is this wrong?</div>
        <div style={styles.modalOptions}>
          {reasons.map((reason) => {
            const active = reason.id === selectedReason
            return (
              <button
                key={reason.id}
                type="button"
                onClick={() => setSelectedReason(reason.id)}
                style={{
                  ...styles.modalOption,
                  ...(active ? styles.modalOptionSelected : {}),
                }}
              >
                <span style={styles.modalRadio}>{active ? "●" : "○"}</span>
                <span style={styles.modalOptionText}>{reason.label}</span>
              </button>
            )
          })}
        </div>

        <div style={styles.modalOther}>
          <div style={styles.modalOtherLabel}>Optional note</div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            style={styles.modalInput}
            rows={3}
          />
        </div>

        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={() => {
              setSelectedReason(null)
              setNote("")
              onClose()
            }}
            style={styles.modalBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              ...styles.modalBtn,
              ...styles.modalBtnPrimary,
              ...(selectedReason ? {} : styles.modalBtnDisabled),
            }}
            disabled={!selectedReason}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

