import WorkUnitCard from "@/components/workunit/WorkUnitCard"
import WorkUnitDetail from "@/components/workunit/WorkUnitDetail"
import { calcROI } from "@/lib/roi"
import { styles } from "@/styles/layoutStyles"
import type { DecisionLog } from "@/types/decision"
import type { WorkUnit, WorkUnitStatus } from "@/types/workunit"

interface WorkUnitColumnProps {
  workUnits: WorkUnit[]
  selectedWorkUnitId: string
  onSelectWorkUnit: (id: string) => void
  onToggleTask: (wuId: string, taskId: string) => void
  onUpdateStatus: (wuId: string, status: WorkUnitStatus) => void
  onLogDecision: (log: DecisionLog) => void
}

export default function WorkUnitColumn({
  workUnits,
  selectedWorkUnitId,
  onSelectWorkUnit,
  onToggleTask,
  onUpdateStatus,
  onLogDecision,
}: WorkUnitColumnProps) {
  const selectedWorkUnit = workUnits.find((wu) => wu.id === selectedWorkUnitId)
  const maxROI = workUnits.reduce((max, wu) => Math.max(max, calcROI(wu)), 0)

  return (
    <section
      style={{ ...styles.column, ...styles.colPriority }}
      className="ai-editor-column ai-editor-column--workunit"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>▤</span>
        <span style={styles.colTitle}>WORKUNIT</span>
        <span style={styles.colSubtitle}>RANKED BY ROI</span>
      </div>

      <div style={styles.wuList}>
        {workUnits.map((wu) => (
          <WorkUnitCard
            key={wu.id}
            wu={wu}
            selected={wu.id === selectedWorkUnitId}
            onSelect={onSelectWorkUnit}
          />
        ))}
      </div>

      <WorkUnitDetail
        key={selectedWorkUnit?.id ?? "empty"}
        workUnit={selectedWorkUnit}
        onToggleTask={onToggleTask}
        onUpdateStatus={onUpdateStatus}
        maxROI={maxROI}
        onLogDecision={onLogDecision}
      />
    </section>
  )
}
