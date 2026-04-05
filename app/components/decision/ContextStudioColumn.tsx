import { calcROI } from "@/lib/roi"
import { styles } from "@/styles/layoutStyles"
import type { Task, WorkUnit } from "@/types/workunit"

interface ContextStudioColumnProps {
  workUnit: WorkUnit | null
  tasks: Task[]
  notes: string
  onToggleTask: (taskId: string) => void
  onChangeNotes: (value: string) => void
  onAddTask: () => void
  onAttachNote: () => void
  onRequestCorrection: () => void
}

export function ContextStudioColumn({
  workUnit,
  tasks,
  notes,
  onToggleTask,
  onChangeNotes,
  onAddTask,
  onAttachNote,
  onRequestCorrection,
}: ContextStudioColumnProps) {
  if (!workUnit) {
    return null
  }

  const roi = calcROI(workUnit)

  return (
    <section
      style={{ ...styles.column, ...styles.colStudio }}
      aria-label="WorkUnit context and studio"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>◆</span>
        <span style={styles.colTitle}>CONTEXT / STUDIO</span>
        <span style={styles.colSubtitle}>PLANNING + EXECUTION</span>
      </div>

      <div style={styles.wuDetail}>
        <div style={styles.detailHeader}>
          <span style={styles.detailTitle}>{workUnit.title}</span>
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
              style={styles.roiFeedbackBtn}
              onClick={onRequestCorrection}
            >
              THIS IS WRONG
            </button>
          </div>
        </div>

        <div style={styles.detailGrid}>
          <div style={styles.detailField}>
            <div style={styles.detailFieldLabel}>SITUATION</div>
            <div style={styles.detailFieldValue}>{workUnit.situation}</div>
          </div>
          <div style={styles.detailField}>
            <div style={styles.detailFieldLabel}>PROBLEM</div>
            <div style={styles.detailFieldValue}>{workUnit.problem}</div>
          </div>
          <div style={styles.detailField}>
            <div style={styles.detailFieldLabel}>ACTORS</div>
            <div style={styles.detailFieldValue}>{workUnit.actors.join(", ")}</div>
          </div>
          <div style={styles.detailField}>
            <div style={styles.detailFieldLabel}>DEADLINE</div>
            <div style={styles.detailFieldValue}>{workUnit.deadline}</div>
          </div>
        </div>

        <div style={styles.taskSection}>
          <div style={styles.taskHeader}>TASKS</div>
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onToggleTask(task.id)}
              style={styles.taskItem}
            >
              <span style={styles.taskCheck}>{task.done ? "☑" : "☐"}</span>
              <span>{task.label}</span>
            </button>
          ))}
          <div style={styles.roiFeedbackRow}>
            <button
              type="button"
              style={styles.roiFeedbackBtn}
              onClick={onAddTask}
            >
              ADD TASK
            </button>
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <div style={styles.taskHeader}>STUDIO</div>
          <textarea
            value={notes}
            onChange={(event) => onChangeNotes(event.target.value)}
            style={styles.studioTextarea}
            placeholder="Capture decisions, plans, and execution notes for this WorkUnit."
          />
          <div style={styles.roiFeedbackRow}>
            <button
              type="button"
              style={styles.roiFeedbackBtn}
              onClick={onAttachNote}
            >
              ATTACH NOTE
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

